"""
Social profile link extraction.

Scans a page's outbound links and keeps the first plausible profile URL per
platform. Share/intent links (Facebook's "sharer.php", Twitter's
"intent/tweet", etc.) point at a "post this page to my feed" flow rather
than an actual profile, so they're filtered out before matching.
"""
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.services.url_safety import validate_target_url, UnsafeUrlError
from app.services.robots import is_allowed, USER_AGENT

PLATFORM_DOMAINS = {
    "linkedin": ("linkedin.com",),
    "facebook": ("facebook.com", "fb.com"),
    "twitter": ("twitter.com", "x.com"),
    "instagram": ("instagram.com",),
    "youtube": ("youtube.com", "youtu.be"),
    "tiktok": ("tiktok.com",),
    "github": ("github.com",),
}

SHARE_URL_MARKERS = (
    "sharer.php",
    "sharer/",
    "share?url=",
    "intent/tweet",
    "intent/post",
    "sharearticle",
    "share-offsite",
    "/share/",
    "/sharing/",
)


class SocialExtractionError(Exception):
    pass


def _is_share_url(url: str) -> bool:
    lowered = url.lower()
    return any(marker in lowered for marker in SHARE_URL_MARKERS)


def _matches_platform(host: str, domains: tuple[str, ...]) -> bool:
    return any(host == d or host.endswith(f".{d}") for d in domains)


def extract_social_links(url: str) -> dict:
    try:
        validate_target_url(url)
    except UnsafeUrlError as e:
        raise SocialExtractionError(str(e))

    if not is_allowed(url):
        raise SocialExtractionError("Disallowed by robots.txt")

    try:
        with httpx.Client(follow_redirects=True, timeout=15.0, headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get(url)
    except httpx.HTTPError as e:
        raise SocialExtractionError(f"Could not fetch page: {e}")

    if resp.status_code != 200:
        raise SocialExtractionError(f"Page returned HTTP {resp.status_code}")

    soup = BeautifulSoup(resp.text, "lxml")

    found: dict[str, str] = {}
    for a in soup.find_all("a", href=True):
        href = urljoin(url, a["href"])
        if _is_share_url(href):
            continue
        host = (urlparse(href).hostname or "").lower()
        for platform, domains in PLATFORM_DOMAINS.items():
            if platform in found:
                continue
            if _matches_platform(host, domains):
                found[platform] = href

    return {
        "linkedin": found.get("linkedin"),
        "facebook": found.get("facebook"),
        "twitter": found.get("twitter"),
        "instagram": found.get("instagram"),
        "youtube": found.get("youtube"),
        "tiktok": found.get("tiktok"),
        "github": found.get("github"),
        "source_url": url,
    }
