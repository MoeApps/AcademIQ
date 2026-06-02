"""
Data access for the per-student event stream.

One document per `(academiq_user_id, event_id)`. `event_id` is the extension's
stable composite key (timestamp-page_type-action_type-course_id), so re-syncing
the same events never creates duplicates.
"""

from datetime import datetime
from typing import Any, Dict, List

from pymongo import UpdateOne

from app.config.database import student_events_collection


def upsert_many(academiq_user_id: str, events: List[Dict[str, Any]]) -> int:
    """Bulk-upsert events for a user. Returns the number of NEW events inserted."""
    ops = []
    now = datetime.utcnow()
    for ev in events or []:
        event_id = ev.get("_id") or ev.get("event_id")
        if not event_id:
            # Fall back to a composite key if the extension didn't supply one.
            event_id = f"{ev.get('timestamp')}-{ev.get('page_type')}-{ev.get('action_type')}-{ev.get('course_id')}"
        clean = {k: v for k, v in ev.items() if k != "_id"}
        key = {"academiq_user_id": str(academiq_user_id), "event_id": str(event_id)}
        ops.append(
            UpdateOne(
                key,
                {"$set": {**key, **clean}, "$setOnInsert": {"ingested_at": now}},
                upsert=True,
            )
        )
    if not ops:
        return 0
    result = student_events_collection.bulk_write(ops, ordered=False)
    return result.upserted_count


def list_for_user(academiq_user_id: str, limit: int = 500) -> List[Dict[str, Any]]:
    return list(
        student_events_collection.find({"academiq_user_id": str(academiq_user_id)})
        .sort("timestamp", -1)
        .limit(limit)
    )
