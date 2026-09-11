import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.scraping import ScrapeJob, JobStatus
from app.schemas.scraping import ScrapeJobCreate, ScrapeJobOut
from app.api.deps import get_current_user
from app.services.url_safety import validate_target_url, UnsafeUrlError
from app.workers.tasks import run_scrape_job
from app.core.plans import PLAN_MAX_PAGES_PER_JOB, PLAN_CONCURRENT_JOBS

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _remaining_credits(user: User) -> int:
    return max(user.monthly_credits - user.credits_used_this_period, 0)


@router.post("", response_model=ScrapeJobOut, status_code=201)
def create_job(
    payload: ScrapeJobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        validate_target_url(payload.target_url)
    except UnsafeUrlError as e:
        raise HTTPException(status_code=400, detail=str(e))

    plan_key = current_user.plan.value if hasattr(current_user.plan, "value") else current_user.plan
    cap = PLAN_MAX_PAGES_PER_JOB.get(plan_key, 20)
    max_pages = min(payload.max_pages, cap)

    remaining = _remaining_credits(current_user)
    if remaining <= 0:
        raise HTTPException(status_code=402, detail="Monthly credit limit reached. Upgrade your plan.")
    max_pages = min(max_pages, remaining)

    active_jobs = (
        db.query(ScrapeJob)
        .filter(ScrapeJob.user_id == current_user.id, ScrapeJob.status.in_([JobStatus.QUEUED, JobStatus.RUNNING]))
        .count()
    )
    concurrent_limit = PLAN_CONCURRENT_JOBS.get(plan_key, 1)
    if active_jobs >= concurrent_limit:
        raise HTTPException(status_code=429, detail="Too many concurrent jobs for your plan")

    job = ScrapeJob(
        user_id=current_user.id,
        name=payload.name,
        target_url=payload.target_url,
        max_pages=max_pages,
        crawl_depth=payload.crawl_depth,
        same_domain_only=payload.same_domain_only,
        include_patterns=payload.include_patterns,
        exclude_patterns=payload.exclude_patterns,
        respect_robots_txt=payload.respect_robots_txt,
        request_delay_ms=max(payload.request_delay_ms, 200),  # floor to avoid hammering targets
        extraction_fields=[f.model_dump() for f in payload.extraction_fields],
        template_id=payload.template_id,
        status=JobStatus.QUEUED,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    run_scrape_job.delay(str(job.id))

    return job


@router.get("", response_model=list[ScrapeJobOut])
def list_jobs(
    status_filter: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ScrapeJob).filter(ScrapeJob.user_id == current_user.id)
    if status_filter:
        query = query.filter(ScrapeJob.status == status_filter)
    return query.order_by(ScrapeJob.created_at.desc()).all()


@router.get("/{job_id}", response_model=ScrapeJobOut)
def get_job(job_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id, ScrapeJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/cancel", response_model=ScrapeJobOut)
def cancel_job(job_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id, ScrapeJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in (JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.PAUSED):
        raise HTTPException(status_code=400, detail="Job cannot be cancelled in its current state")
    job.status = JobStatus.CANCELLED
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/pause", response_model=ScrapeJobOut)
def pause_job(job_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id, ScrapeJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Only a running job can be paused")

    # Cooperative pause: the worker polls this flag between page fetches and
    # checkpoints its crawl frontier (crawl_state) before stopping, so resume
    # picks up exactly where it left off rather than starting over.
    job.status = JobStatus.PAUSED
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/resume", response_model=ScrapeJobOut)
def resume_job(job_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id, ScrapeJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Only a paused job can be resumed")

    remaining = _remaining_credits(current_user)
    if remaining <= 0:
        raise HTTPException(status_code=402, detail="Monthly credit limit reached. Upgrade your plan.")

    job.status = JobStatus.QUEUED
    db.commit()
    db.refresh(job)

    run_scrape_job.delay(str(job.id), resume=True)
    return job


@router.post("/{job_id}/rerun", response_model=ScrapeJobOut, status_code=201)
def rerun_job(job_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    original = db.query(ScrapeJob).filter(ScrapeJob.id == job_id, ScrapeJob.user_id == current_user.id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Job not found")

    remaining = _remaining_credits(current_user)
    if remaining <= 0:
        raise HTTPException(status_code=402, detail="Monthly credit limit reached. Upgrade your plan.")

    new_job = ScrapeJob(
        user_id=current_user.id,
        name=f"{original.name} (rerun)",
        target_url=original.target_url,
        max_pages=min(original.max_pages, remaining),
        crawl_depth=original.crawl_depth,
        same_domain_only=original.same_domain_only,
        include_patterns=original.include_patterns,
        exclude_patterns=original.exclude_patterns,
        respect_robots_txt=original.respect_robots_txt,
        request_delay_ms=original.request_delay_ms,
        extraction_fields=original.extraction_fields,
        status=JobStatus.QUEUED,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    run_scrape_job.delay(str(new_job.id))
    return new_job


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id, ScrapeJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
