"""
Core crawling + extraction engine.

Design notes:
- BFS crawl bounded by max_pages and crawl_depth.
- Every fetch goes through url_safety.validate_target_url (SSRF protection)
  and robots.is_allowed (compliance).
- request_delay_ms is enforced between requests to the same host (be a good
  citizen, avoid hammering target sites).
- Extraction is selector-driven (CSS via BeautifulSoup, or regex) rather than
  hardcoded to one source, so it generalizes across arbitrary public pages —
  this app never targets authenticated/paywalled endpoints.
"""
import re
import time
import fnmatch
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.services.url_safety import validate_target_url, UnsafeUrlError
from app.services.robots import is_allowed, crawl_delay, USER_AGENT

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

# Requires at least one real separator between digit groups (space, dash, dot,
# or parens) rather than matching any long run of digits — this is what
# keeps it from grabbing ISBNs, Wikipedia revision IDs, or plain dates,
# which don't have phone-style grouping.
PHONE_REGEX = re.compile(
    r"(?:\+\d{1,3}[\s.-]?)?"          # optional country code, e.g. +92
    r"(?:\(\d{2,4}\)[\s.-]?)?"        # optional (area code)
    r"\d{2,4}[\s.-]\d{3,4}"           # mandatory grouped digits with a separator
    r"(?:[\s.-]\d{2,4}){0,2}"         # optional further groups
)


def _looks_like_phone(raw_match: str) -> bool:
    digits = re.sub(r"\D", "", raw_match)
    if not (7 <= len(digits) <= 15):
        return False
    # ISBN-13s are exactly 13 digits and start 978/979 — the commonest false
    # positive on content-heavy pages (Wikipedia, product pages).
    if len(digits) == 13 and digits[:3] in ("978", "979"):
        return False
    return True


@dataclass
class CrawlResult:
    pages_processed: int = 0
    records: list[dict] = field(default_factory=list)
    errors: list[dict] = field(default_factory=list)
    visited_urls: list[str] = field(default_factory=list)
    crawl_state: dict | None = None


def _matches_patterns(url: str, include: list[str] | None, exclude: list[str] | None) -> bool:
    if exclude:
        if any(fnmatch.fnmatch(url, pat) for pat in exclude):
            return False
    if include:
        return any(fnmatch.fnmatch(url, pat) for pat in include)
    return True


def _extract_field(soup: BeautifulSoup, html: str, field_def: dict) -> str | list[str] | None:
    selector_type = field_def.get("selector_type", "css")
    selector = field_def["selector"]
    attribute = field_def.get("attribute")

    if selector_type == "css":
        elements = soup.select(selector)
        if not elements:
            return None
        if attribute:
            values = [el.get(attribute) for el in elements if el.get(attribute)]
        else:
            values = [el.get_text(strip=True) for el in elements]
        return values[0] if len(values) == 1 else values

    if selector_type == "regex":
        match = re.search(selector, html)
        return match.group(0) if match else None

    # xpath would require lxml.etree; omitted from MVP, css/regex cover most cases
    return None


def _auto_extract_contact_info(soup: BeautifulSoup, html: str) -> dict:
    text = soup.get_text(" ", strip=True)
    emails = list(dict.fromkeys(EMAIL_REGEX.findall(text)))
    raw_phones = PHONE_REGEX.findall(text)
    phones = list(dict.fromkeys(p.strip() for p in raw_phones if _looks_like_phone(p)))

    social_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if any(domain in href for domain in ["facebook.com", "twitter.com", "x.com", "linkedin.com", "instagram.com"]):
            social_links.append(href)

    title_tag = soup.find("title")
    desc_tag = soup.find("meta", attrs={"name": "description"})

    return {
        "email": emails[0] if emails else None,
        "phone": phones[0] if phones else None,
        "social_links": social_links or None,
        "page_title": title_tag.get_text(strip=True) if title_tag else None,
        "description": desc_tag.get("content") if desc_tag else None,
    }


def crawl(
    target_url: str,
    max_pages: int,
    crawl_depth: int,
    same_domain_only: bool,
    include_patterns: list[str] | None,
    exclude_patterns: list[str] | None,
    respect_robots_txt: bool,
    request_delay_ms: int,
    extraction_fields: list[dict],
    progress_callback=None,
    resume_state: dict | None = None,
    should_stop=None,
) -> CrawlResult:
    """
    resume_state: {"visited": [...], "queue": [[url, depth], ...]} checkpoint
    from a prior (paused) run of this job — resumes the frontier exactly
    where it left off instead of re-crawling from target_url.
    should_stop: optional callable checked between page fetches; if it returns
    True the crawl stops early (used to implement pause). The in-progress
    frontier is included in the returned CrawlResult.crawl_state so the job
    can be resumed later.
    """
    result = CrawlResult()
    start_domain = urlparse(target_url).netloc

    if resume_state:
        visited: set[str] = set(resume_state.get("visited", []))
        queue: list[tuple[str, int]] = [(u, d) for u, d in resume_state.get("queue", [])]
    else:
        visited = set()
        queue = [(target_url, 0)]
    last_request_time: dict[str, float] = {}

    with httpx.Client(follow_redirects=True, timeout=15.0, headers={"User-Agent": USER_AGENT}) as client:
        while queue and result.pages_processed < max_pages:
            if should_stop and should_stop():
                break

            url, depth = queue.pop(0)
            if url in visited or depth > crawl_depth:
                continue
            visited.add(url)

            try:
                validate_target_url(url)
            except UnsafeUrlError as e:
                result.errors.append({"url": url, "error": str(e)})
                continue

            if not is_allowed(url, respect_robots_txt):
                result.errors.append({"url": url, "error": "Disallowed by robots.txt"})
                continue

            if not _matches_patterns(url, include_patterns, exclude_patterns):
                continue

            # Rate limit per host
            host = urlparse(url).netloc
            delay = (crawl_delay(url) or 0) * 1000 or request_delay_ms
            elapsed = (time.time() - last_request_time.get(host, 0)) * 1000
            if elapsed < delay:
                time.sleep((delay - elapsed) / 1000)

            try:
                resp = client.get(url)
                last_request_time[host] = time.time()
                if resp.status_code != 200:
                    result.errors.append({"url": url, "error": f"HTTP {resp.status_code}"})
                    continue
            except httpx.HTTPError as e:
                result.errors.append({"url": url, "error": str(e)})
                continue

            result.pages_processed += 1
            html = resp.text
            soup = BeautifulSoup(html, "lxml")

            record = {"source_url": url}
            record.update(_auto_extract_contact_info(soup, html))

            custom = {}
            for field_def in extraction_fields:
                custom[field_def["field_name"]] = _extract_field(soup, html, field_def)
            record["custom_fields"] = custom

            result.records.append(record)

            if progress_callback:
                progress_callback(result.pages_processed, len(result.records), len(result.errors))

            if depth < crawl_depth:
                for a in soup.find_all("a", href=True):
                    next_url = urljoin(url, a["href"]).split("#")[0]
                    next_domain = urlparse(next_url).netloc
                    if same_domain_only and next_domain != start_domain:
                        continue
                    if next_url not in visited:
                        queue.append((next_url, depth + 1))

    result.visited_urls = list(visited)
    result.crawl_state = {"visited": list(visited), "queue": [[u, d] for u, d in queue]}
    return result
