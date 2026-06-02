"""
Security primitives: password hashing/verification and session-token handling.

Passwords are hashed with bcrypt via passlib — plain-text passwords are never
stored. Session tokens are generated with the `secrets` module (CSPRNG) and only
their SHA-256 hash is persisted.
"""

import hashlib
import secrets

import bcrypt


def _prep(password: str) -> bytes:
    """
    Encode + clamp a password to bcrypt's 72-byte limit.

    bcrypt only considers the first 72 bytes; bcrypt 4.x *raises* on longer
    input instead of truncating, so we truncate explicitly. (We use bcrypt
    directly rather than passlib, whose 1.7.4 release is incompatible with
    bcrypt 4.x.)
    """
    return password.encode("utf-8")[:72]


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash for a plain-text password."""
    return bcrypt.hashpw(_prep(plain_password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Check a plain-text password against a stored bcrypt hash."""
    if not plain_password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(_prep(plain_password), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed/legacy hash — treat as a failed verification, never raise.
        return False


def generate_session_token() -> str:
    """Generate a new opaque, URL-safe session token (the raw secret)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hash a session token for storage/lookup (we never persist the raw token)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
