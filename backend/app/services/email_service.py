"""
Email delivery over SMTP.

Works with any standard SMTP provider (SES SMTP interface, Postmark SMTP,
Mailgun SMTP, Gmail SMTP for testing, etc.) — just set SMTP_HOST/PORT/USER/
PASSWORD in the environment. If SMTP_HOST is unset (e.g. local dev without
credentials), falls back to logging so the app doesn't crash.
"""
import logging
import smtplib
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("email_service")


def _send(to: str, subject: str, body: str) -> None:
    if not settings.SMTP_HOST:
        logger.info("SMTP not configured — logging email instead. to=%s subject=%s body=%s", to, subject, body)
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [to], msg.as_string())
    except smtplib.SMTPException:
        logger.exception("Failed to send email to=%s subject=%s", to, subject)


def send_verification_email(to_email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    _send(to=to_email, subject="Verify your email", body=f"Click to verify your account: {link}")


def send_password_reset_email(to_email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    _send(to=to_email, subject="Reset your password", body=f"Click to reset your password: {link}")


def send_job_completed_email(to_email: str, job_name: str, records_found: int) -> None:
    _send(to=to_email, subject=f"Scraping job '{job_name}' completed", body=f"Your job finished with {records_found} records found.")


def send_job_failed_email(to_email: str, job_name: str, error: str) -> None:
    _send(to=to_email, subject=f"Scraping job '{job_name}' failed", body=f"Error: {error}")


def send_team_invite_email(to_email: str, team_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/accept-invite?token={token}"
    _send(to=to_email, subject=f"You've been invited to join {team_name}", body=f"Accept your invite: {link}")
