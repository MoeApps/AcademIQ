"""
Data-access layer for authentication sessions.

Sessions are opaque tokens persisted in the `sessions` collection. We store only
a SHA-256 *hash* of the token (never the raw value) plus the owning user, their
role, and an expiry. A presented token is hashed and looked up here.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.config.database import auth_sessions_collection
from app.config.settings import SESSION_TTL_HOURS


def create_session(token_hash: str, user_id: str, role: str) -> Dict[str, Any]:
    now = datetime.utcnow()
    doc = {
        "token_hash": token_hash,
        "user_id": str(user_id),
        "role": role,
        "created_at": now,
        "expires_at": now + timedelta(hours=SESSION_TTL_HOURS),
    }
    auth_sessions_collection.insert_one(doc)
    return doc


def find_valid_session(token_hash: str) -> Optional[Dict[str, Any]]:
    """Return the session for a token hash only if it exists and hasn't expired."""
    if not token_hash:
        return None
    doc = auth_sessions_collection.find_one({"token_hash": token_hash})
    if not doc:
        return None
    expires_at = doc.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at < datetime.utcnow():
        # Lazily clean up expired sessions on access.
        auth_sessions_collection.delete_one({"token_hash": token_hash})
        return None
    return doc


def delete_session(token_hash: str) -> bool:
    if not token_hash:
        return False
    result = auth_sessions_collection.delete_one({"token_hash": token_hash})
    return result.deleted_count > 0


def delete_sessions_for_user(user_id: str) -> int:
    """Invalidate every session for a user (e.g. after a password reset)."""
    result = auth_sessions_collection.delete_many({"user_id": str(user_id)})
    return result.deleted_count
