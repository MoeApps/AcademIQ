# backend/app/routes/auth.py
"""
Authentication routes: login, logout, current-user, forgot/reset password,
and magic-link one-click login (for the Chrome extension).
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
from app.repositories.magic_link_repository import (
    consume_magic_token,
    create_magic_token,
)
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


# ── Helpers ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


def _issue_session(response: Response, user: dict) -> str:
    """Create a session, set the httpOnly cookie, return the raw token."""
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


# ── Standard login / logout / me ──────────────────────────────────────────────

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


# ── Forgot password ────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Request a password-reset email.
    Always returns 202 to prevent account enumeration.
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


# ── Reset password ─────────────────────────────────────────────────────────────

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, response: Response):
    """
    Consume a reset token and set a new password.
    Invalidates all existing sessions and issues a fresh one.
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


# ── Magic-link login (Chrome extension one-click) ─────────────────────────────

class MagicLinkRequest(BaseModel):
    academiq_user_id: str


@router.post("/magic-link")
async def request_magic_link(payload: MagicLinkRequest):
    """
    Issue a short-lived (60-second), single-use magic-link token for the
    given AcademIQ user. Called by the Chrome extension after syncing.

    Returns { token } only — the caller opens:
        {appBaseUrl}/magic-login?token=<token>
    """
    user = user_repository.find_by_id(payload.academiq_user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    raw_token = generate_session_token()
    token_hash = hash_token(raw_token)
    create_magic_token(token_hash, str(user["_id"]))

    return {"token": raw_token}


@router.get("/magic-login")
async def magic_login(token: str, response: Response):
    """
    Consume a magic-link token and create a real session.

    Called by the frontend /magic-login page on mount. On success returns the
    same shape as /login AND sets the httpOnly session cookie, so the browser
    is fully authenticated.
    """
    if not token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Token is required.")

    token_hash = hash_token(token)
    user_id = consume_magic_token(token_hash)
    if not user_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This login link is invalid or has expired. Please sync again.",
        )

    user = user_repository.find_by_id(user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Account not found.")

    session_token = _issue_session(response, user)
    profile = serialize_user(user)
    return {
        "user": profile,
        "role": profile["role"],
        "token": session_token,
        "token_type": "bearer",
    }
