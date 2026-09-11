from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.scraping import ScrapeJob, Lead, JobStatus
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/usage", tags=["usage"])


@router.get("/summary")
def usage_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_jobs = db.query(func.count(ScrapeJob.id)).filter(ScrapeJob.user_id == current_user.id).scalar()
    successful_jobs = (
        db.query(func.count(ScrapeJob.id))
        .filter(ScrapeJob.user_id == current_user.id, ScrapeJob.status == JobStatus.COMPLETED)
        .scalar()
    )
    failed_jobs = (
        db.query(func.count(ScrapeJob.id))
        .filter(ScrapeJob.user_id == current_user.id, ScrapeJob.status == JobStatus.FAILED)
        .scalar()
    )
    total_records = db.query(func.count(Lead.id)).filter(Lead.user_id == current_user.id).scalar()

    recent_jobs = (
        db.query(ScrapeJob)
        .filter(ScrapeJob.user_id == current_user.id)
        .order_by(ScrapeJob.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_jobs": total_jobs,
        "successful_jobs": successful_jobs,
        "failed_jobs": failed_jobs,
        "total_records": total_records,
        "monthly_credits": current_user.monthly_credits,
        "credits_used_this_period": current_user.credits_used_this_period,
        "credits_remaining": max(current_user.monthly_credits - current_user.credits_used_this_period, 0),
        "plan": current_user.plan,
        "recent_jobs": [
            {
                "id": str(j.id),
                "name": j.name,
                "status": j.status,
                "records_found": j.records_found,
                "created_at": j.created_at.isoformat(),
            }
            for j in recent_jobs
        ],
    }
