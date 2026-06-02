"""
Data access for per-student, per-course behavioural metrics.

One document per `(academiq_user_id, course_id)`. Re-syncing upserts the latest
snapshot rather than appending duplicates. The special course_id "_overall"
holds the student's cross-course behaviour aggregate.
"""

from datetime import datetime
from typing import Any, Dict, List

from app.config.database import student_metrics_collection

OVERALL = "_overall"


def upsert(academiq_user_id: str, course_id: str, metrics: Dict[str, Any]) -> None:
    """Insert/replace the metrics snapshot for a (user, course) pair."""
    key = {"academiq_user_id": str(academiq_user_id), "course_id": str(course_id)}
    student_metrics_collection.update_one(
        key,
        {"$set": {**key, "metrics": metrics, "updated_at": datetime.utcnow()}},
        upsert=True,
    )


def list_for_user(academiq_user_id: str) -> List[Dict[str, Any]]:
    return list(student_metrics_collection.find({"academiq_user_id": str(academiq_user_id)}))


def get(academiq_user_id: str, course_id: str) -> Dict[str, Any]:
    return student_metrics_collection.find_one(
        {"academiq_user_id": str(academiq_user_id), "course_id": str(course_id)}
    )
