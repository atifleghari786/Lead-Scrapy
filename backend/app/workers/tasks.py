import uuid
from datetime import datetime

from app.workers.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.scraping import ScrapeJob, Lead, JobStatus
from app.models.user import User
from app.services.scraper_engine import crawl
from app.services.email_service import send_job_completed_email, send_job_failed_email


def _persist_leads(db, job, records) -> int:
    """Insert new leads, skipping source_urls already stored for this job
    (matters on resume, where the crawl may revisit boundary pages)."""
    existing = {
        row[0] for row in db.query(Lead.source_url).filter(Lead.job_id == job.id).all()
    }
    inserted = 0
    for rec in records:
        if rec["source_url"] in existing:
            continue
        existing.add(rec["source_url"])
        inserted += 1
        db.add(
            Lead(
                job_id=job.id,
                user_id=job.user_id,
                website_url=rec["source_url"],
                email=rec.get("email"),
                phone=rec.get("phone"),
                social_links=rec.get("social_links"),
                page_title=rec.get("page_title"),
                description=rec.get("description"),
                source_url=rec["source_url"],
                custom_fields=rec.get("custom_fields"),
            )
        )
    return inserted


@celery_app.task(bind=True, name="run_scrape_job")
def run_scrape_job(self, job_id: str, resume: bool = False):
    db = SessionLocal()
    try:
        job = db.query(ScrapeJob).filter(ScrapeJob.id == uuid.UUID(job_id)).first()
        if not job:
            return

        # A pause request may have landed between queuing and the worker
        # picking this task up — bail out before doing any work.
        if job.status == JobStatus.CANCELLED:
            return

        job.status = JobStatus.RUNNING
        job.celery_task_id = self.request.id
        if not job.started_at:
            job.started_at = datetime.utcnow()
        db.commit()

        def progress(pages, records, errors):
            job.pages_processed = pages
            job.records_found = db.query(Lead).filter(Lead.job_id == job.id).count() + records
            job.errors_count = errors
            db.commit()

        def should_stop() -> bool:
            # Cooperative pause/cancel check — cheap point query, checked
            # between page fetches so a paused job stops within one request.
            db.expire(job, ["status"])
            current_status = job.status
            return current_status in (JobStatus.PAUSED, JobStatus.CANCELLED)

        result = crawl(
            target_url=job.target_url,
            max_pages=job.max_pages - job.pages_processed,
            crawl_depth=job.crawl_depth,
            same_domain_only=job.same_domain_only,
            include_patterns=job.include_patterns,
            exclude_patterns=job.exclude_patterns,
            respect_robots_txt=job.respect_robots_txt,
            request_delay_ms=job.request_delay_ms,
            extraction_fields=[f for f in (job.extraction_fields or [])],
            progress_callback=progress,
            resume_state=job.crawl_state if resume else None,
            should_stop=should_stop,
        )

        inserted = _persist_leads(db, job, result.records)

        job.pages_processed += result.pages_processed
        job.records_found = db.query(Lead).filter(Lead.job_id == job.id).count()
        job.errors_count = (job.errors_count or 0) + len(result.errors)
        job.error_log = (job.error_log or [])[-50:] + result.errors[:50]  # cap stored errors
        job.crawl_state = result.crawl_state

        db.refresh(job)  # pick up the true current status (paused/cancelled may have landed)

        user = db.query(User).filter(User.id == job.user_id).first()
        if user:
            user.credits_used_this_period += result.pages_processed

        if job.status == JobStatus.PAUSED:
            pass  # leave as paused — crawl_state is checkpointed for resume
        elif job.status == JobStatus.CANCELLED:
            pass  # leave as cancelled
        else:
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()

        db.commit()

        if user and job.status == JobStatus.COMPLETED:
            send_job_completed_email(user.email, job.name, job.records_found)

    except Exception as e:  # noqa: BLE001
        db.rollback()
        job = db.query(ScrapeJob).filter(ScrapeJob.id == uuid.UUID(job_id)).first()
        if job:
            job.status = JobStatus.FAILED
            job.completed_at = datetime.utcnow()
            job.error_log = (job.error_log or []) + [{"error": str(e)}]
            db.commit()
            user = db.query(User).filter(User.id == job.user_id).first()
            if user:
                send_job_failed_email(user.email, job.name, str(e))
        raise
    finally:
        db.close()
