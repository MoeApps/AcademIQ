# backend/app/routes/auth.py
"""
Authentication routes: email/password login, logout, and current-user lookup.

On success a session token is created server-side, its hash stored, and the raw
token returned BOTH as an httpOnly cookie (for the web app) and in the JSON body
(so the Chrome extension / API clients can send it as a Bearer token).
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.config.settings import (
    APP_LOGIN_URL,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE,
    SESSION_TTL_HOURS,
)
from app.models.user import serialize_user
from app.repositories import session_repository, user_repository
from app.repositories.password_reset_repository import (
    consume_reset_token,
    create_reset_token,
)
from app.services.email_service import send_reset_link_email
from app.services.security import (
    generate_session_token,
    hash_password,
    hash_token,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    # Plain str (not EmailStr): login is just a lookup key, and the project
    # uses .local addresses which email-validator rejects as reserved.
    email: str
    password: str


def _issue_session(response: Response, user: dict) -> str:
    """Create a session, set the cookie, and return the raw token."""
    token = generate_session_token()
    session_repository.create_session(
        token_hash=hash_token(token),
        user_id=str(user["_id"]),
        role=user.get("role", "student"),
    )
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite=SESSION_COOKIE_SAMESITE,
        max_age=SESSION_TTL_HOURS * 3600,
        path="/",
    )
    return token


@router.post("/login")
async def login(payload: LoginRequest, response: Response):
    """Authenticate with email + password; returns profile, role, and token."""
    user = user_repository.find_by_email(payload.email)
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    token = _issue_session(response, user)
    profile = serialize_user(user)
    return {
        "user": profile,
        "role": profile["role"],
        "token": token,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Invalidate the current session and clear the cookie."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
    if token:
        session_repository.delete_session(hash_token(token))
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "logged_out"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's profile + role."""
    profile = serialize_user(user)
    return {"user": profile, "role": profile["role"]}


# ---------------------------------------------------------------------------
# Forgot password — request a reset link
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Request a password-reset email.

    Always returns 202 so the caller cannot enumerate valid accounts
    (identical response whether the email exists or not).
    """
    user = user_repository.find_by_email(payload.email)
    if user:
        raw_token = generate_session_token()
        token_hash = hash_token(raw_token)
        create_reset_token(token_hash, str(user["_id"]))

        reset_url = (
            f"{APP_LOGIN_URL.removesuffix('/signin').rstrip('/')}"
            f"/reset-password?token={raw_token}"
        )
        send_reset_link_email(
            to_email=user["email"],
            full_name=user.get("full_name", ""),
            reset_url=reset_url,
        )
    return {"status": "If that email exists, a reset link has been sent."}


# ---------------------------------------------------------------------------
# Reset password — consume the token and set a new password
# ---------------------------------------------------------------------------

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, response: Response):
    """
    Consume a reset token and update the user's password.

    On success: invalidates all existing sessions for the user, sets the new
    password, and issues a fresh session (so the user is logged in immediately).
    On failure (bad/expired token): 400 — no info leaked about why it failed.
    """
    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Password must be at least 6 characters.",
        )

    token_hash = hash_token(payload.token)
    user_id = consume_reset_token(token_hash)
    if not user_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This reset link is invalid or has expired. Please request a new one.",
        )

    user = user_repository.find_by_id(user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Account not found.")

    user_repository.update(user_id, {"password_hash": hash_password(payload.new_password)})
    session_repository.delete_sessions_for_user(user_id)

    updated_user = user_repository.find_by_id(user_id)
    token = _issue_session(response, updated_user)
    profile = serialize_user(updated_user)
    return {
        "user": profile,
        "role": profile["role"],
        "token": token,
        "token_type": "bearer",
    }
