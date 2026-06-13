"""
Data-access layer for magic-link (one-click) login tokens.

Tokens are generated with CSPRNG, hashed with SHA-256 before storage, expire
after MAGIC_TTL_SECONDS, and may only be consumed once. One pending token per
user at a time — creating a new one deletes any prior pending token.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.config.database import magic_link_tokens_collection

MAGIC_TTL_SECONDS = 60


def create_magic_token(token_hash: str, user_id: str) -> Dict[str, Any]:
    """Store a hashed magic token; delete any prior pending token for this user."""
    now = datetime.utcnow()
    magic_link_tokens_collection.delete_many({"user_id": str(user_id)})
    doc = {
        "token_hash": token_hash,
        "user_id": str(user_id),
        "created_at": now,
        "expires_at": now + timedelta(seconds=MAGIC_TTL_SECONDS),
        "used": False,
    }
    magic_link_tokens_collection.insert_one(doc)
    return doc


def consume_magic_token(token_hash: str) -> Optional[str]:
    """
    Validate and consume a magic token atomically.

    Returns the user_id on success, None if the token is unknown, expired,
    or already used.
    """
    doc = magic_link_tokens_collection.find_one({"token_hash": token_hash})
    if not doc:
        return None
    if doc.get("used"):
        return None
    expires_at = doc.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at < datetime.utcnow():
        magic_link_tokens_collection.delete_one({"token_hash": token_hash})
        return None
    magic_link_tokens_collection.update_one(
        {"token_hash": token_hash}, {"$set": {"used": True}}
    )
    return str(doc["user_id"])
