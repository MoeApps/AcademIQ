"""
Data-access layer for password reset tokens.

Tokens are generated client-side (CSPRNG), hashed with SHA-256 before storage,
and expired after RESET_TTL_MINUTES. A token may only be consumed once.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.config.database import password_reset_tokens_collection

RESET_TTL_MINUTES = 15


def create_reset_token(token_hash: str, user_id: str) -> Dict[str, Any]:
    """Store a hashed reset token; invalidate any prior tokens for this user."""
    now = datetime.utcnow()
    # One pending reset per user at a time.
    password_reset_tokens_collection.delete_many({"user_id": str(user_id)})
    doc = {
        "token_hash": token_hash,
        "user_id": str(user_id),
        "created_at": now,
        "expires_at": now + timedelta(minutes=RESET_TTL_MINUTES),
        "used": False,
    }
    password_reset_tokens_collection.insert_one(doc)
    return doc


def consume_reset_token(token_hash: str) -> Optional[str]:
    """
    Validate and consume a token.

    Returns the user_id on success, None if the token is unknown, expired,
    or already used.
    """
    doc = password_reset_tokens_collection.find_one({"token_hash": token_hash})
    if not doc:
        return None
    if doc.get("used"):
        return None
    expires_at = doc.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at < datetime.utcnow():
        password_reset_tokens_collection.delete_one({"token_hash": token_hash})
        return None
    # Mark as used immediately so a second request with the same token fails.
    password_reset_tokens_collection.update_one(
        {"token_hash": token_hash}, {"$set": {"used": True}}
    )
    return str(doc["user_id"])
