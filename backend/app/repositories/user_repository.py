"""
Data-access layer for user accounts.

All MongoDB access for users funnels through here so routes/services never touch
the collection directly. This keeps the Mongo specifics in one place — if the
database changes later, only this file does.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from bson.errors import InvalidId

from app.config.database import users_collection


def _oid(user_id: str) -> Optional[ObjectId]:
    try:
        return ObjectId(user_id)
    except (InvalidId, TypeError):
        return None


def create(document: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a prepared user document and return it with its `_id`."""
    result = users_collection.insert_one(document)
    document["_id"] = result.inserted_id
    return document


def find_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    oid = _oid(user_id)
    if oid is None:
        return None
    return users_collection.find_one({"_id": oid})


def find_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not email:
        return None
    return users_collection.find_one({"email": email.strip().lower()})


def find_by_moodle_user_id(moodle_user_id: str) -> Optional[Dict[str, Any]]:
    if not moodle_user_id:
        return None
    return users_collection.find_one({"moodle_user_id": str(moodle_user_id).strip()})


def find_by_student_id(student_id: str) -> Optional[Dict[str, Any]]:
    if not student_id:
        return None
    return users_collection.find_one({"student_id": str(student_id).strip()})


def list_users(search: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    """Return users, newest first, optionally filtered by a search term.

    Search matches (case-insensitive) against full name, email, student id, and
    Moodle user id.
    """
    query: Dict[str, Any] = {}
    if search:
        rx = {"$regex": search.strip(), "$options": "i"}
        query = {
            "$or": [
                {"full_name": rx},
                {"email": rx},
                {"student_id": rx},
                {"moodle_user_id": rx},
            ]
        }
    cursor = users_collection.find(query).sort("created_at", -1).limit(limit)
    return list(cursor)


def update(user_id: str, fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Apply a partial update (auto-stamps `updated_at`) and return the new doc."""
    oid = _oid(user_id)
    if oid is None:
        return None
    fields = {**fields, "updated_at": datetime.utcnow()}
    users_collection.update_one({"_id": oid}, {"$set": fields})
    return users_collection.find_one({"_id": oid})


def delete(user_id: str) -> bool:
    oid = _oid(user_id)
    if oid is None:
        return False
    result = users_collection.delete_one({"_id": oid})
    return result.deleted_count > 0


def count() -> int:
    return users_collection.count_documents({})
