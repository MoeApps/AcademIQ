"""
Data access for per-student, per-course behavioural metrics.

One document per `(academiq_user_id, course_id)`. Re-syncing upserts the latest
snapshot rather than appending duplicates. The special course_id "_overall"
holds the student's cross-course behaviour aggregate and a rolling weekly
study-time history (`weekly_hours`, last 3 ISO weeks).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List

from app.config.database import student_metrics_collection

OVERALL = "_overall"
_WEEKLY_LABELS = ("3 weeks ago", "2 weeks ago", "Last week")


def _iso_week_key(when: datetime | None = None) -> str:
    when = when or datetime.now(timezone.utc)
    year, week, _ = when.isocalendar()
    return f"{year}-W{week:02d}"


def _merge_weekly_hours(
    existing: List[Dict[str, Any]] | None,
    total_seconds: float,
    when: datetime | None = None,
) -> List[Dict[str, Any]]:
    """Keep a rolling 3-week study-time series keyed by ISO week."""
    when = when or datetime.now(timezone.utc)
    week_key = _iso_week_key(when)
    hours = round(max(0.0, float(total_seconds or 0)) / 3600, 1)

    by_week: Dict[str, float] = {}
    for entry in existing or []:
        key = entry.get("week")
        if key:
            by_week[str(key)] = float(entry.get("hours") or 0)

    by_week[week_key] = hours

    ordered_keys = sorted(by_week.keys())[-3:]
    out: List[Dict[str, Any]] = []
    for i, key in enumerate(ordered_keys):
        label = _WEEKLY_LABELS[i] if len(ordered_keys) == 3 else f"Week {key}"
        if len(ordered_keys) == 2 and i == 0:
            label = "2 weeks ago"
        elif len(ordered_keys) == 2 and i == 1:
            label = "Last week"
        elif len(ordered_keys) == 1:
            label = "Last week"
        out.append({"week": key, "label": label, "hours": by_week[key]})
    return out


def upsert(academiq_user_id: str, course_id: str, metrics: Dict[str, Any]) -> None:
    """Insert/replace the metrics snapshot for a (user, course) pair."""
    key = {"academiq_user_id": str(academiq_user_id), "course_id": str(course_id)}
    payload = dict(metrics or {})

    if str(course_id) == OVERALL:
        total_seconds = (
            payload.get("total_time_spent_on_moodle")
            or payload.get("total_time_spent")
            or payload.get("total_time_spent_seconds")
            or 0
        )
        existing = student_metrics_collection.find_one(key) or {}
        prev_weekly = (existing.get("metrics") or {}).get("weekly_hours")
        payload["weekly_hours"] = _merge_weekly_hours(prev_weekly, total_seconds)

    student_metrics_collection.update_one(
        key,
        {"$set": {**key, "metrics": payload, "updated_at": datetime.utcnow()}},
        upsert=True,
    )


def list_for_user(academiq_user_id: str) -> List[Dict[str, Any]]:
    return list(student_metrics_collection.find({"academiq_user_id": str(academiq_user_id)}))


def get(academiq_user_id: str, course_id: str) -> Dict[str, Any]:
    return student_metrics_collection.find_one(
        {"academiq_user_id": str(academiq_user_id), "course_id": str(course_id)}
    )
