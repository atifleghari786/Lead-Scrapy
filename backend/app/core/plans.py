"""
Single source of truth for what each plan includes. Referenced by Stripe
webhook handling (to set credits on subscription change) and by job creation
(to cap max_pages/concurrency).
"""
from app.core.config import settings

PLAN_MONTHLY_CREDITS = {
    "free": 100,
    "starter": 2000,
    "pro": 10000,
    "business": 50000,
}

PLAN_MAX_PAGES_PER_JOB = {
    "free": 20,
    "starter": 100,
    "pro": 500,
    "business": 2000,
}

PLAN_CONCURRENT_JOBS = {
    "free": 1,
    "starter": 2,
    "pro": 5,
    "business": 20,
}

# Stripe Price ID -> plan tier name
PRICE_TO_PLAN = {
    settings.STRIPE_PRICE_STARTER: "starter",
    settings.STRIPE_PRICE_PRO: "pro",
    settings.STRIPE_PRICE_BUSINESS: "business",
}

PLAN_TO_PRICE = {
    "starter": settings.STRIPE_PRICE_STARTER,
    "pro": settings.STRIPE_PRICE_PRO,
    "business": settings.STRIPE_PRICE_BUSINESS,
}
