"""
Lightweight email verification.

Checks syntax, MX records, disposable-domain membership, and role-based
local parts. Deliberately does not attempt an SMTP handshake (RCPT TO probe)
— most mail servers either don't answer honestly (catch-all domains) or will
greylist/blacklist the sending IP for probing, so it's both unreliable and
risky for our own deliverability.
"""
import re

import dns.resolver

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

DISPOSABLE_DOMAINS = {
    "mailinator.com",
    "guerrillamail.com",
    "10minutemail.com",
    "tempmail.com",
    "throwaway.email",
}

ROLE_LOCAL_PARTS = {"info", "admin", "support", "sales", "contact", "noreply"}

_mx_cache: dict[str, bool] = {}


def _has_mx_record(domain: str) -> bool:
    if domain in _mx_cache:
        return _mx_cache[domain]
    try:
        answers = dns.resolver.resolve(domain, "MX", lifetime=5.0)
        found = len(answers) > 0
    except Exception:  # noqa: BLE001 — any DNS failure means "no usable MX"
        found = False
    _mx_cache[domain] = found
    return found


def verify_email(email: str) -> dict:
    email = (email or "").strip()
    syntax_valid = bool(EMAIL_REGEX.match(email))

    local_part, _, domain = email.partition("@")
    local_part = local_part.lower()
    domain = domain.lower()

    mx_found = _has_mx_record(domain) if syntax_valid else False
    is_disposable = domain in DISPOSABLE_DOMAINS
    is_role_based = local_part in ROLE_LOCAL_PARTS

    if not syntax_valid or not mx_found or is_disposable:
        verdict = "invalid"
    elif is_role_based:
        verdict = "risky"
    else:
        verdict = "valid"

    return {
        "email": email,
        "syntax_valid": syntax_valid,
        "mx_found": mx_found,
        "is_disposable": is_disposable,
        "is_role_based": is_role_based,
        "verdict": verdict,
    }
