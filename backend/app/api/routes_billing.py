import stripe
from fastapi import APIRouter, Depends, HTTPException, Request

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plans import PLAN_TO_PRICE
from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.services.stripe_service import create_checkout_session, create_portal_session, handle_webhook_event

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.post("/checkout-session")
def checkout_session(
    plan: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    price_id = PLAN_TO_PRICE.get(plan)
    if not price_id:
        raise HTTPException(status_code=400, detail="Unknown plan")
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing is not configured yet")

    url = create_checkout_session(db, current_user, price_id)
    return {"checkout_url": url}


@router.post("/portal-session")
def portal_session(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing is not configured yet")
    url = create_portal_session(db, current_user)
    return {"portal_url": url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    handle_webhook_event(db, event)
    return {"received": True}
