"""
Centralised, environment-driven configuration for the AcademIQ backend.

Every secret/tunable is read from an environment variable with a safe fallback
so the app keeps running in development even without a `.env` file. Copy
`.env.example` to `.env` and fill in real values for production.

If `python-dotenv` is installed, a local `.env` is loaded automatically; if it
isn't, we silently fall back to the process environment.
"""

import os

try:  # optional dependency — app still works without it
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover - dotenv is optional
    pass


def _get(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def _get_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _get_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


# --- Database -------------------------------------------------------------
# Fallback keeps the previously hard-coded Atlas cluster working untouched.
MONGODB_URI: str = _get(
    "MONGODB_URI",
    "mongodb+srv://mohamed2106404_db:UINS6z2r6TpUiTNS@cluster0.hcvs2st.mongodb.net/?appName=Cluster0",
)
MONGODB_DB_NAME: str = _get("MONGODB_DB_NAME", "todo_db")

# --- Sessions / auth ------------------------------------------------------
SESSION_COOKIE_NAME: str = _get("SESSION_COOKIE_NAME", "academiq_session")
SESSION_TTL_HOURS: int = _get_int("SESSION_TTL_HOURS", 24)
# Set true behind HTTPS in production so the cookie is only sent over TLS.
SESSION_COOKIE_SECURE: bool = _get_bool("SESSION_COOKIE_SECURE", False)
SESSION_COOKIE_SAMESITE: str = _get("SESSION_COOKIE_SAMESITE", "lax")

# --- Frontend / email -----------------------------------------------------
# Used in account-creation emails so students get a working login link.
APP_LOGIN_URL: str = _get("APP_LOGIN_URL", "http://localhost:3000/signin")

SMTP_HOST: str = _get("SMTP_HOST", "")
SMTP_PORT: int = _get_int("SMTP_PORT", 587)
SMTP_USER: str = _get("SMTP_USER", "")
SMTP_PASSWORD: str = _get("SMTP_PASSWORD", "")
SMTP_FROM: str = _get("SMTP_FROM", "AcademIQ <no-reply@academiq.local>")
SMTP_USE_TLS: bool = _get_bool("SMTP_USE_TLS", True)

# When SMTP isn't configured we log the email instead of sending it, so local
# development and the grading environment never block on a mail server.
EMAIL_ENABLED: bool = bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)

# --- Moodle ---------------------------------------------------------------
# Default Moodle instance URL. The frontend login form pre-fills this so
# students don't have to type it, but they can override it.
MOODLE_BASE_URL: str = _get("MOODLE_BASE_URL", "")

# --- Initial admin (used by scripts/seed_admin.py) ------------------------
ADMIN_EMAIL: str = _get("ADMIN_EMAIL", "admin@academiq.local")
ADMIN_PASSWORD: str = _get("ADMIN_PASSWORD", "Admin@12345")
ADMIN_NAME: str = _get("ADMIN_NAME", "AcademIQ Admin")
