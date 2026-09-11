import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.scraping import ScrapeTemplate
from app.schemas.scraping import ScrapeTemplateCreate, ScrapeTemplateOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.post("", response_model=ScrapeTemplateOut, status_code=201)
def create_template(
    payload: ScrapeTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = ScrapeTemplate(user_id=current_user.id, **payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("", response_model=list[ScrapeTemplateOut])
def list_templates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ScrapeTemplate).filter(ScrapeTemplate.user_id == current_user.id).order_by(ScrapeTemplate.created_at.desc()).all()


@router.put("/{template_id}", response_model=ScrapeTemplateOut)
def update_template(
    template_id: uuid.UUID,
    payload: ScrapeTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = db.query(ScrapeTemplate).filter(ScrapeTemplate.id == template_id, ScrapeTemplate.user_id == current_user.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in payload.model_dump().items():
        setattr(template, field, value)
    db.commit()
    db.refresh(template)
    return template


@router.post("/{template_id}/duplicate", response_model=ScrapeTemplateOut, status_code=201)
def duplicate_template(template_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    original = db.query(ScrapeTemplate).filter(ScrapeTemplate.id == template_id, ScrapeTemplate.user_id == current_user.id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Template not found")
    copy = ScrapeTemplate(user_id=current_user.id, name=f"{original.name} (copy)", description=original.description, config=original.config)
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    template = db.query(ScrapeTemplate).filter(ScrapeTemplate.id == template_id, ScrapeTemplate.user_id == current_user.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
