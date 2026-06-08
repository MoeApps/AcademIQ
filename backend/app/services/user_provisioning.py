"""
Moodle → AcademIQ identity mapping & automatic account provisioning.

Whenever Moodle data is imported, we must attach it to exactly one AcademIQ
account and never create duplicates. Matching uses stable identifiers only
(never name matching), in priority order:

    1. Moodle User ID  (moodle_user_id)
    2. Student ID      (student_id)
    3. Email           (last-resort tie-breaker)

If no account matches, a new `student` account is created automatically with a
secure random password, and a credentials email is sent.
"""

from typing import Any, Dict, Optional, Tuple

from app.models.user import ROLE_STUDENT, build_user_document
from app.repositories import user_repository
from app.services.email_service import send_account_created_email
from app.services.security import hash_password
from app.utils.password import generate_password


def _first_non_empty(*values: Optional[str]) -> Optional[str]:
    for value in values:
        if value not in (None, ""):
            return str(value).strip()
    return None


def extract_identity(payload: Dict[str, Any]) -> Dict[str, Optional[str]]:
    """
    Pull the identity fields out of a Chrome-extension payload.

    Tolerates both the new explicit fields and the older `student.student_id`
    shape so existing payloads keep working.
    """
    student = payload.get("student", {}) or {}
    return {
        "moodle_user_id": _first_non_empty(
            student.get("moodle_user_id"), payload.get("moodle_user_id")
        ),
        "student_id": _first_non_empty(
            student.get("student_id"), payload.get("student_id")
        ),
        "full_name": _first_non_empty(
            student.get("full_name"), student.get("name"), payload.get("full_name")
        ),
        "email": _first_non_empty(student.get("email"), payload.get("email")),
    }


def find_matching_user(
    moodle_user_id: Optional[str] = None,
    student_id: Optional[str] = None,
    email: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Locate the AcademIQ account for a Moodle identity, by priority."""
    if moodle_user_id:
        match = user_repository.find_by_moodle_user_id(moodle_user_id)
        if match:
            return match
    if student_id:
        match = user_repository.find_by_student_id(student_id)
        if match:
            return match
    if email:
        return user_repository.find_by_email(email)
    return None


def _backfill_identity(user: Dict[str, Any], identity: Dict[str, Optional[str]]) -> Dict[str, Any]:
    """Fill in identity fields that are missing on an existing account."""
    updates: Dict[str, Any] = {}
    for field in ("moodle_user_id", "student_id"):
        if not user.get(field) and identity.get(field):
            updates[field] = identity[field]
    if not user.get("full_name") and identity.get("full_name"):
        updates["full_name"] = identity["full_name"]

    if updates:
        refreshed = user_repository.update(str(user["_id"]), updates)
        if refreshed:
            return refreshed
    return user


def resolve_or_create_user(
    identity: Dict[str, Optional[str]],
) -> Tuple[Dict[str, Any], bool]:
    """
    Return the AcademIQ user for a Moodle identity, creating one if needed.

    Returns (user_document, created) where `created` is True when a new account
    was provisioned. A synthetic email is used only as a last resort when Moodle
    exposes no email, so the account can still be linked and managed by an admin.
    """
    moodle_user_id = identity.get("moodle_user_id")
    student_id = identity.get("student_id")
    email = (identity.get("email") or "").strip().lower() or None
    full_name = identity.get("full_name") or ""

    existing = find_matching_user(moodle_user_id, student_id, email)
    if existing:
        return _backfill_identity(existing, identity), False

    # No match — provision a new student account.
    if not email:
        # Synthesise a stable, unique placeholder email from the best identifier
        # so the account is still uniquely keyed and an admin can fix it later.
        anchor = moodle_user_id or student_id or "unknown"
        email = f"moodle+{anchor}@academiq.local"

    password = generate_password()
    document = build_user_document(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=ROLE_STUDENT,
        moodle_user_id=moodle_user_id,
        student_id=student_id,
    )
    created_user = user_repository.create(document)

    # Best-effort credentials email (logged in dev when SMTP is disabled).
    send_account_created_email(email, full_name, password)

    return created_user, True
