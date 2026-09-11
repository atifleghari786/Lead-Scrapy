import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.scraping import Lead
from app.schemas.scraping import LeadOut, LeadUpdate
from app.api.deps import get_current_user
from app.services.email_verifier import verify_email

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("", response_model=list[LeadOut])
def list_leads(
    job_id: uuid.UUID | None = None,
    search: str | None = None,
    status_filter: str | None = None,
    is_favorite: bool | None = None,
    sort_by: str = "scraped_at",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = Query(default=50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Lead).filter(Lead.user_id == current_user.id)

    if job_id:
        query = query.filter(Lead.job_id == job_id)
    if status_filter:
        query = query.filter(Lead.status == status_filter)
    if is_favorite is not None:
        query = query.filter(Lead.is_favorite == is_favorite)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Lead.company_name.ilike(like))
            | (Lead.email.ilike(like))
            | (Lead.website_url.ilike(like))
            | (Lead.category.ilike(like))
        )

    sort_col = getattr(Lead, sort_by, Lead.scraped_at)
    query = query.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    return query.offset((page - 1) * page_size).limit(page_size).all()


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: uuid.UUID,
    payload: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead


@router.post("/bulk-delete", status_code=204)
def bulk_delete(lead_ids: list[uuid.UUID], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Lead).filter(Lead.id.in_(lead_ids), Lead.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()


@router.post("/verify-emails", response_model=list[LeadOut])
def verify_emails(
    lead_ids: list[uuid.UUID],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leads = db.query(Lead).filter(Lead.id.in_(lead_ids), Lead.user_id == current_user.id).all()
    for lead in leads:
        if not lead.email:
            continue
        custom = dict(lead.custom_fields or {})
        custom["email_verification"] = verify_email(lead.email)
        lead.custom_fields = custom
    db.commit()
    for lead in leads:
        db.refresh(lead)
    return leads


@router.post("/bulk-tag", response_model=list[LeadOut])
def bulk_tag(
    lead_ids: list[uuid.UUID],
    tags: list[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leads = db.query(Lead).filter(Lead.id.in_(lead_ids), Lead.user_id == current_user.id).all()
    for lead in leads:
        existing = set(lead.tags or [])
        lead.tags = list(existing.union(tags))
    db.commit()
    return leads
