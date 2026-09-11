import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.scraping import ScrapeJob, JobStatus
from app.api.deps import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def list_users(
    page: int = 1,
    page_size: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).offset((page - 1) * page_size).limit(page_size).all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "plan": u.plan,
            "is_active": u.is_active,
            "is_suspended": u.is_suspended,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.post("/users/{user_id}/suspend")
def suspend_user(user_id: uuid.UUID, _admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_suspended = True
    db.commit()
    return {"detail": "User suspended"}


@router.post("/users/{user_id}/activate")
def activate_user(user_id: uuid.UUID, _admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_suspended = False
    db.commit()
    return {"detail": "User activated"}


@router.patch("/users/{user_id}/plan")
def change_plan(user_id: uuid.UUID, plan: str, monthly_credits: int, _admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.plan = plan
    user.monthly_credits = monthly_credits
    db.commit()
    return {"detail": "Plan updated"}


@router.get("/stats")
def platform_stats(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "active_users": db.query(func.count(User.id)).filter(User.is_active == True).scalar(),  # noqa: E712
        "total_jobs": db.query(func.count(ScrapeJob.id)).scalar(),
        "running_jobs": db.query(func.count(ScrapeJob.id)).filter(ScrapeJob.status == JobStatus.RUNNING).scalar(),
        "failed_jobs": db.query(func.count(ScrapeJob.id)).filter(ScrapeJob.status == JobStatus.FAILED).scalar(),
    }


@router.get("/jobs")
def list_all_jobs(page: int = 1, page_size: int = 50, _admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    jobs = db.query(ScrapeJob).order_by(ScrapeJob.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return [
        {
            "id": str(j.id),
            "user_id": str(j.user_id),
            "name": j.name,
            "status": j.status,
            "records_found": j.records_found,
            "errors_count": j.errors_count,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]
