"""
Domain email finder.

Rather than crawling an entire site, this checks the handful of pages where
contact emails usually live and extracts every email address found on them
— both plain-text matches and mailto: links.
"""
import time

import httpx
from bs4 import BeautifulSoup

from app.services.url_safety import validate_target_url, UnsafeUrlError
from app.services.robots import is_allowed, USER_AGENT
from app.services.scraper_engine import EMAIL_REGEX

CONTACT_PATHS = ["/", "/contact", "/contact-us", "/about", "/about-us", "/team", "/support"]

REQUEST_DELAY_SECONDS = 0.8

JUNK_PREFIXES = ("example@", "noreply@", "no-reply@", "wordpress@", "sentry@")
JUNK_MARKERS = ("sentry",)
JUNK_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif")


class EmailFinderError(Exception):
    pass


def _is_junk(email: str) -> bool:
    lowered = email.lower()
    if lowered.startswith(JUNK_PREFIXES):
        return True
    if any(marker in lowered for marker in JUNK_MARKERS):
        return True
    if lowered.endswith(JUNK_EXTENSIONS):
        return True
    return False


def _emails_from_page(html: str, soup: BeautifulSoup) -> set[str]:
    found = set(EMAIL_REGEX.findall(html))
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().startswith("mailto:"):
            address = href.split(":", 1)[1].split("?")[0].strip()
            if address:
                found.add(address)
    return {e for e in found if not _is_junk(e)}


def find_emails_for_domain(domain: str) -> list[dict]:
    domain = (domain or "").strip()
    if not domain:
        raise EmailFinderError("Domain is required")

    base_url = domain if domain.startswith(("http://", "https://")) else f"https://{domain}"
    base_url = base_url.rstrip("/")

    try:
        validate_target_url(base_url)
    except UnsafeUrlError as e:
        raise EmailFinderError(str(e))

    seen_emails: set[str] = set()
    records: list[dict] = []

    with httpx.Client(follow_redirects=True, timeout=15.0, headers={"User-Agent": USER_AGENT}) as client:
        for i, path in enumerate(CONTACT_PATHS):
            url = base_url + path

            try:
                validate_target_url(url)
            except UnsafeUrlError:
                continue
            if not is_allowed(url):
                continue

            if i > 0:
                time.sleep(REQUEST_DELAY_SECONDS)

            try:
                resp = client.get(url)
            except httpx.HTTPError:
                continue
            if resp.status_code != 200:
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            for email in _emails_from_page(resp.text, soup):
                if email in seen_emails:
                    continue
                seen_emails.add(email)
                records.append({"email": email, "source_url": url})

    return records
