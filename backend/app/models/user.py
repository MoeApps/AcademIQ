"""
User account model + (de)serialisation helpers.

A single `users` collection holds both admins and students. Documents are
stored with snake_case keys in Mongo and serialised to camelCase for the API
so the Next.js frontend can consume them directly. The password hash is *never*
included in any serialised output.

Required record fields (per the AcademIQ spec):
    id, moodleUserId, studentId, fullName, email, passwordHash, role,
    createdAt, updatedAt

Moodle linkage uses `moodle_user_id` first, then `student_id` — never name
matching.
"""

from datetime import datetime
from typing import Any, Dict, Optional

# Supported roles. Kept as plain strings (not an Enum) so they serialise
# cleanly to JSON/Mongo and are easy to compare in route guards.
ROLE_ADMIN = "admin"
ROLE_STUDENT = "student"
VALID_ROLES = {ROLE_ADMIN, ROLE_STUDENT}


def build_user_document(
    *,
    email: str,
    password_hash: str,
    full_name: str = "",
    role: str = ROLE_STUDENT,
    moodle_user_id: Optional[str] = None,
    student_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a new user document with timestamps. Email is normalised."""
    now = datetime.utcnow()
    return {
        "email": (email or "").strip().lower(),
        "password_hash": password_hash,
        "full_name": (full_name or "").strip(),
        "role": role if role in VALID_ROLES else ROLE_STUDENT,
        "moodle_user_id": _clean(moodle_user_id),
        "student_id": _clean(student_id),
        "created_at": now,
        "updated_at": now,
    }


def _clean(value: Optional[str]) -> Optional[str]:
    """Trim identifiers and coerce empty strings to None (keeps indexes sparse)."""
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def serialize_user(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert a Mongo user document to a safe, camelCase API payload."""
    if not doc:
        return None
    return {
        "id": str(doc.get("_id", "")),
        "moodleUserId": doc.get("moodle_user_id"),
        "studentId": doc.get("student_id"),
        "fullName": doc.get("full_name", ""),
        "email": doc.get("email", ""),
        "role": doc.get("role", ROLE_STUDENT),
        "createdAt": _iso(doc.get("created_at")),
        "updatedAt": _iso(doc.get("updated_at")),
    }


def serialize_users(docs) -> list:
    return [serialize_user(d) for d in docs]


def _iso(value: Any) -> Optional[str]:
    if isinstance(value, datetime):
        return value.isoformat()
    return value
