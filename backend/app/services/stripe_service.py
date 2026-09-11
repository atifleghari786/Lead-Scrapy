"""
Stripe integration.

Flow:
1. User clicks "Switch to Pro" -> POST /api/billing/checkout-session -> we
   create a Stripe Checkout Session and return its URL -> frontend redirects.
2. Stripe redirects back to FRONTEND_URL/billing?success=1 after payment.
3. Stripe calls our webhook (POST /api/billing/webhook) on
   checkout.session.completed / customer.subscription.updated / .deleted —
   that's the only place plan/credits actually get changed. Never trust the
   client-side redirect alone to grant a plan.
"""
import stripe
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plans import PRICE_TO_PLAN, PLAN_MONTHLY_CREDITS
from app.models.user import User, PlanTier

stripe.api_key = settings.STRIPE_SECRET_KEY


def get_or_create_customer(db: Session, user: User) -> str:
    if user.stripe_customer_id:
        return user.stripe_customer_id

    customer = stripe.Customer.create(email=user.email, metadata={"user_id": str(user.id)})
    user.stripe_customer_id = customer.id
    db.commit()
    return customer.id


def create_checkout_session(db: Session, user: User, price_id: str) -> str:
    customer_id = get_or_create_customer(db, user)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.FRONTEND_URL}/billing?success=1",
        cancel_url=f"{settings.FRONTEND_URL}/billing?canceled=1",
        metadata={"user_id": str(user.id)},
    )
    return session.url


def create_portal_session(db: Session, user: User) -> str:
    customer_id = get_or_create_customer(db, user)
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.FRONTEND_URL}/billing",
    )
    return session.url


def _plan_from_subscription(subscription) -> str | None:
    for item in subscription["items"]["data"]:
        price_id = item["price"]["id"]
        if price_id in PRICE_TO_PLAN:
            return PRICE_TO_PLAN[price_id]
    return None


def handle_webhook_event(db: Session, event: dict) -> None:
    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = obj.get("metadata", {}).get("user_id")
        subscription_id = obj.get("subscription")
        if user_id and subscription_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                subscription = stripe.Subscription.retrieve(subscription_id)
                _apply_subscription_to_user(db, user, subscription)

    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        customer_id = obj.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            _apply_subscription_to_user(db, user, obj)

    elif event_type == "customer.subscription.deleted":
        customer_id = obj.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.plan = PlanTier.FREE
            user.monthly_credits = PLAN_MONTHLY_CREDITS["free"]
            user.stripe_subscription_id = None
            user.stripe_subscription_status = "canceled"
            db.commit()


def _apply_subscription_to_user(db: Session, user: User, subscription: dict) -> None:
    plan = _plan_from_subscription(subscription)
    if not plan:
        return
    user.plan = PlanTier(plan)
    user.monthly_credits = PLAN_MONTHLY_CREDITS.get(plan, user.monthly_credits)
    user.stripe_subscription_id = subscription["id"]
    user.stripe_subscription_status = subscription["status"]
    db.commit()
