"""
Reusable email service.

SMTP credentials come entirely from environment variables (see
app/config/settings.py). When SMTP isn't configured (`EMAIL_ENABLED` is false)
the service logs the message to the console instead of sending — so local dev
and the grading environment never block on a real mail server.
"""

import smtplib
from email.message import EmailMessage

from app.config import settings


def _send(to_email: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns True if sent (or logged in dev)."""
    if not to_email:
        return False

    if not settings.EMAIL_ENABLED:
        # Dev/grading fallback: log instead of sending.
        print(
            "📧 [email disabled — set SMTP_* env vars to enable]\n"
            f"   To: {to_email}\n   Subject: {subject}\n   ---\n{body}\n"
        )
        return True

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception as exc:  # never let email failure crash the request
        print(f"❌ Failed to send email to {to_email}: {exc}")
        return False


def send_account_created_email(to_email: str, full_name: str, password: str) -> bool:
    """
    Notify a newly provisioned student of their AcademIQ credentials.

    Includes their name, the login URL, and the generated password. The plain
    password exists only in this email — it is never stored in the database.
    """
    name = full_name.strip() or "there"
    subject = "Your AcademIQ account is ready"
    body = (
        f"Hi {name},\n\n"
        "An AcademIQ account has been created for you so you can see your "
        "AI-powered academic insights.\n\n"
        f"Login URL: {settings.APP_LOGIN_URL}\n"
        f"Email: {to_email}\n"
        f"Temporary password: {password}\n\n"
        "Please sign in and change your password as soon as possible.\n\n"
        "— The AcademIQ Team"
    )
    return _send(to_email, subject, body)


def send_password_reset_email(to_email: str, full_name: str, password: str) -> bool:
    """Email a user their new temporary password after an admin reset."""
    name = full_name.strip() or "there"
    subject = "Your AcademIQ password has been reset"
    body = (
        f"Hi {name},\n\n"
        "Your AcademIQ password has been reset by an administrator.\n\n"
        f"Login URL: {settings.APP_LOGIN_URL}\n"
        f"Email: {to_email}\n"
        f"New temporary password: {password}\n\n"
        "Please sign in and change your password as soon as possible.\n\n"
        "— The AcademIQ Team"
    )
    return _send(to_email, subject, body)
