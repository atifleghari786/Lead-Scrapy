import csv
import io
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from openpyxl import Workbook

from app.db.session import get_db
from app.models.user import User
from app.models.scraping import Lead
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/export", tags=["export"])

FIELDNAMES = [
    "company_name", "website_url", "email", "phone", "address",
    "category", "page_title", "description", "source_url",
    "status", "tags", "scraped_at",
]


def _get_leads(db: Session, user: User, job_id: uuid.UUID | None, lead_ids: list[uuid.UUID] | None):
    query = db.query(Lead).filter(Lead.user_id == user.id)
    if job_id:
        query = query.filter(Lead.job_id == job_id)
    if lead_ids:
        query = query.filter(Lead.id.in_(lead_ids))
    leads = query.all()
    if not leads:
        raise HTTPException(status_code=404, detail="No leads found for export")
    return leads


def _lead_row(lead: Lead) -> dict:
    return {
        "company_name": lead.company_name,
        "website_url": lead.website_url,
        "email": lead.email,
        "phone": lead.phone,
        "address": lead.address,
        "category": lead.category,
        "page_title": lead.page_title,
        "description": lead.description,
        "source_url": lead.source_url,
        "status": lead.status,
        "tags": ", ".join(lead.tags) if lead.tags else "",
        "scraped_at": lead.scraped_at.isoformat(),
    }


@router.get("/csv")
def export_csv(
    job_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leads = _get_leads(db, current_user, job_id, None)
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=FIELDNAMES)
    writer.writeheader()
    for lead in leads:
        writer.writerow(_lead_row(lead))
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads.csv"},
    )


@router.get("/xlsx")
def export_xlsx(
    job_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leads = _get_leads(db, current_user, job_id, None)
    wb = Workbook()
    ws = wb.active
    ws.title = "Leads"
    ws.append(FIELDNAMES)
    for lead in leads:
        row = _lead_row(lead)
        ws.append([row[f] for f in FIELDNAMES])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=leads.xlsx"},
    )


@router.get("/json")
def export_json(
    job_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leads = _get_leads(db, current_user, job_id, None)
    data = [_lead_row(lead) for lead in leads]
    return StreamingResponse(
        iter([json.dumps(data, indent=2)]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=leads.json"},
    )
