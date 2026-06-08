# backend/app/routes/admin.py
"""
Admin-only user management API.

Every route here is gated by `require_role("admin")`, so a student session can
never reach them (returns 403). Provides: list/search users, create, edit,
delete, and reset password.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import require_role
from app.models.user import (
    ROLE_STUDENT,
    VALID_ROLES,
    build_user_document,
    serialize_user,
    serialize_users,
)
from app.repositories import session_repository, user_repository
from app.services.email_service import (
    send_account_created_email,
    send_password_reset_email,
)
from app.services.security import hash_password
from app.utils.password import generate_password

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role("admin"))],
)


class CreateUserRequest(BaseModel):
    fullName: str = ""
    # Plain str (not EmailStr): the project uses .local addresses, which
    # email-validator rejects as reserved. Format is validated client-side.
    email: str
    role: str = ROLE_STUDENT
    moodleUserId: Optional[str] = None
    studentId: Optional[str] = None
    # Optional — if omitted a secure password is generated and returned once.
    password: Optional[str] = None


class UpdateUserRequest(BaseModel):
    fullName: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    moodleUserId: Optional[str] = None
    studentId: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    # Optional — if omitted a secure password is generated and returned once.
    password: Optional[str] = None


def _validate_role(role: str) -> str:
    if role not in VALID_ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid role: {role}")
    return role


@router.get("/users")
async def list_users(search: Optional[str] = None):
    """List all users, newest first, optionally filtered by a search term."""
    return serialize_users(user_repository.list_users(search=search))


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(payload: CreateUserRequest):
    """Create a user account. Returns the profile (+ generated password if any)."""
    _validate_role(payload.role)

    if user_repository.find_by_email(payload.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists")

    generated: Optional[str] = None
    plain = payload.password
    if not plain:
        plain = generate_password()
        generated = plain

    document = build_user_document(
        email=payload.email,
        password_hash=hash_password(plain),
        full_name=payload.fullName,
        role=payload.role,
        moodle_user_id=payload.moodleUserId,
        student_id=payload.studentId,
    )
    try:
        created = user_repository.create(document)
    except Exception as exc:  # unique-index violations etc.
        raise HTTPException(status.HTTP_409_CONFLICT, f"Could not create user: {exc}")

    result = {"user": serialize_user(created)}
    if generated:
        result["generatedPassword"] = generated
        # Email the credentials when we generated the password (best-effort;
        # logged to console if SMTP isn't configured).
        send_account_created_email(payload.email, payload.fullName, generated)
    return result


@router.put("/users/{user_id}")
async def update_user(user_id: str, payload: UpdateUserRequest):
    """Edit an existing user's profile fields."""
    existing = user_repository.find_by_id(user_id)
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    fields = {}
    if payload.fullName is not None:
        fields["full_name"] = payload.fullName.strip()
    if payload.email is not None:
        # Guard against colliding with another account's email.
        clash = user_repository.find_by_email(payload.email)
        if clash and str(clash["_id"]) != user_id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")
        fields["email"] = str(payload.email).strip().lower()
    if payload.role is not None:
        fields["role"] = _validate_role(payload.role)
    if payload.moodleUserId is not None:
        fields["moodle_user_id"] = payload.moodleUserId.strip() or None
    if payload.studentId is not None:
        fields["student_id"] = payload.studentId.strip() or None

    if not fields:
        return {"user": serialize_user(existing)}

    updated = user_repository.update(user_id, fields)
    return {"user": serialize_user(updated)}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user account and invalidate any active sessions."""
    if not user_repository.find_by_id(user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    session_repository.delete_sessions_for_user(user_id)
    user_repository.delete(user_id)
    return {"status": "deleted", "id": user_id}


@router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: str, payload: ResetPasswordRequest):
    """Reset a user's password; logs them out of all sessions."""
    existing = user_repository.find_by_id(user_id)
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    generated: Optional[str] = None
    plain = payload.password
    if not plain:
        plain = generate_password()
        generated = plain

    user_repository.update(user_id, {"password_hash": hash_password(plain)})
    session_repository.delete_sessions_for_user(user_id)

    result = {"status": "password_reset", "id": user_id}
    if generated:
        result["generatedPassword"] = generated
        # Email the new password to the user (best-effort; console if no SMTP).
        send_password_reset_email(
            existing.get("email", ""),
            existing.get("full_name", ""),
            generated,
        )
    return result
