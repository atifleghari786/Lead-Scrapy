"""
robots.txt compliance.

Responsible scraping requires checking robots.txt before crawling any page,
and honoring Disallow rules for our user-agent.
"""
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx

USER_AGENT = "LeadScrapyBot/1.0 (+https://app.example.com/bot)"

_cache: dict[str, RobotFileParser] = {}


def _robots_url(target_url: str) -> str:
    parsed = urlparse(target_url)
    return f"{parsed.scheme}://{parsed.netloc}/robots.txt"


def get_parser(target_url: str) -> RobotFileParser:
    robots_url = _robots_url(target_url)
    if robots_url in _cache:
        return _cache[robots_url]

    parser = RobotFileParser()
    parser.set_url(robots_url)
    try:
        resp = httpx.get(robots_url, timeout=5.0, headers={"User-Agent": USER_AGENT})
        if resp.status_code == 200:
            parser.parse(resp.text.splitlines())
        else:
            # No robots.txt or inaccessible — treat as "allow all"
            parser.parse([])
    except httpx.HTTPError:
        parser.parse([])

    _cache[robots_url] = parser
    return parser


def is_allowed(target_url: str, respect_robots_txt: bool = True) -> bool:
    if not respect_robots_txt:
        return True
    parser = get_parser(target_url)
    return parser.can_fetch(USER_AGENT, target_url)


def crawl_delay(target_url: str) -> float | None:
    parser = get_parser(target_url)
    delay = parser.crawl_delay(USER_AGENT)
    return float(delay) if delay else None
