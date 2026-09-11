"""
URL validation and SSRF protection.

Before the scraper fetches any URL, it must pass through here. This blocks
requests aimed at internal/private infrastructure (cloud metadata endpoints,
localhost, private IP ranges) disguised as a "target URL".
"""
import ipaddress
import socket
from urllib.parse import urlparse

BLOCKED_HOSTNAMES = {"localhost", "0.0.0.0", "metadata.google.internal"}


class UnsafeUrlError(Exception):
    pass


def is_private_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_reserved
            or addr.is_multicast
        )
    except ValueError:
        return False


def validate_target_url(url: str) -> str:
    """Raises UnsafeUrlError if the URL is not safe to fetch. Returns the
    normalized URL otherwise."""
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise UnsafeUrlError("Only http/https URLs are allowed")

    hostname = parsed.hostname
    if not hostname:
        raise UnsafeUrlError("URL has no hostname")

    if hostname.lower() in BLOCKED_HOSTNAMES:
        raise UnsafeUrlError("Target host is not allowed")

    # Resolve and check every A record — blocks DNS rebinding to internal IPs
    try:
        resolved = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise UnsafeUrlError("Could not resolve target host")

    for family, _, _, _, sockaddr in resolved:
        ip = sockaddr[0]
        if is_private_ip(ip):
            raise UnsafeUrlError("Target resolves to a private/internal address")

    return url
