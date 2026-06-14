"""
Student Evidence Timeline service.

Builds a human-readable, chronological timeline that answers the question:
  "Why did AcademIQ classify me as at risk?"

Data sources (merged in order of richness):
  1. student_events      — raw Moodle interaction events from the extension
  2. grades (raw payload) — assignment/quiz submission records with status/score
  3. ml_results          — stored ML predictions (risk changes)
  4. student_metrics     — per-course behavioural aggregates for inactivity gaps

Event schema (what the extension actually sends):
  {
    "event_id":    str   (composite key; may be absent — we rebuild it),
    "action_type": "view" | "click" | "assignment_view" | "material_click",
    "page_type":   "resource" | "assignment" | "quiz" | "grades" | ...,
    "course_id":   str,
    "timestamp":   int   (epoch ms),
    -- optional enrichments --
    "title":       str,
    "score":       float | str,
    "quiz_attempt": bool,
    "assignment_submission": bool,
    "submission_status": str,
    "late": bool,
  }

Grade schema (from raw_moodle_payload_collection.grades):
  {
    "course_id":        str,
    "item_name":        str,   (often prefixed: "AssignmentLab Week …")
    "item_type":        "assignment" | "quiz",
    "grade":            str | None,
    "percentage":       float | None,
    "submission_status": str | None,
    "submission_time":  str | None,
  }
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.config.database import (
    ml_results_collection,
    raw_moodle_payload_collection,
    student_events_collection,
    student_metrics_collection,
)

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

# quiz scores below this are treated as "warning"-level signals
_LOW_QUIZ_THRESHOLD = 60.0

# Consecutive inactive days that trigger an inactivity timeline item
_INACTIVITY_GAP_DAYS = 3

# Maximum events we pull per query (prevent huge payloads in active students)
_MAX_EVENTS = 500


# ── Public entry-point ─────────────────────────────────────────────────────────

def build_timeline(
    academiq_user_id: str,
    course_id: str | None = None,
    limit: int = 100,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> dict[str, Any]:
    """
    Return the full Evidence Timeline payload for one student.

    Args:
        academiq_user_id: The AcademIQ internal user id (from the users collection).
        course_id:        Optional — restrict to a single Moodle course.
        limit:            Maximum timeline items to return (applied after merge + sort).
        start_date:       Inclusive lower bound for event timestamps.
        end_date:         Inclusive upper bound for event timestamps.

    Returns a dict matching EvidenceTimelineResponse (see schemas/timeline.py).
    """
    items: list[dict[str, Any]] = []

    # 1 ── Raw Moodle interaction events ───────────────────────────────────────
    try:
        raw_events = _fetch_events(academiq_user_id, course_id)
        items.extend(_map_events(raw_events))
    except Exception:
        logger.exception("timeline: failed to fetch/map student_events for %s", academiq_user_id)

    # 2 ── Grade/submission records from the raw payload ───────────────────────
    try:
        grades = _fetch_grades(academiq_user_id, course_id)
        items.extend(_map_grades(grades))
    except Exception:
        logger.exception("timeline: failed to fetch/map grades for %s", academiq_user_id)

    # 3 ── ML prediction history (risk changes) ────────────────────────────────
    try:
        items.extend(_map_ml_results(academiq_user_id))
    except Exception:
        logger.exception("timeline: failed to fetch/map ml_results for %s", academiq_user_id)

    # 4 ── Inactivity gap detection from metrics ───────────────────────────────
    try:
        items.extend(_detect_inactivity(academiq_user_id, course_id, items))
    except Exception:
        logger.exception("timeline: failed inactivity detection for %s", academiq_user_id)

    # 5 ── Date-range filter ───────────────────────────────────────────────────
    if start_date:
        items = [i for i in items if i["date"] >= start_date]
    if end_date:
        items = [i for i in items if i["date"] <= end_date]

    # 6 ── Sort chronologically and deduplicate by id ─────────────────────────
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for item in sorted(items, key=lambda x: x["date"]):
        if item["id"] not in seen:
            seen.add(item["id"])
            unique.append(item)

    # 7 ── Apply limit ─────────────────────────────────────────────────────────
    limited = unique[:limit]

    # 8 ── Summary stats ───────────────────────────────────────────────────────
    risk_signals = sum(1 for i in unique if i["severity"] in ("warning", "danger"))
    positive_signals = sum(1 for i in unique if i["severity"] == "positive")
    last_activity = unique[-1]["date"] if unique else None

    return {
        "student_id": academiq_user_id,
        "course_id": course_id,
        "timeline": limited,
        "summary": {
            "total_events": len(unique),
            "risk_signals": risk_signals,
            "positive_signals": positive_signals,
            "last_activity": last_activity,
        },
    }


# ── Data fetchers ──────────────────────────────────────────────────────────────

def _fetch_events(
    academiq_user_id: str,
    course_id: str | None,
) -> list[dict[str, Any]]:
    query: dict[str, Any] = {"academiq_user_id": academiq_user_id}
    if course_id:
        query["course_id"] = str(course_id)
    return list(
        student_events_collection.find(query)
        .sort("timestamp", -1)
        .limit(_MAX_EVENTS)
    )


def _fetch_grades(
    academiq_user_id: str,
    course_id: str | None,
) -> list[dict[str, Any]]:
    doc = raw_moodle_payload_collection.find_one({"academiq_user_id": academiq_user_id})
    if not doc:
        return []
    all_grades: list[dict[str, Any]] = doc.get("grades", []) or []
    if course_id:
        all_grades = [g for g in all_grades if str(g.get("course_id", "")) == str(course_id)]
    return all_grades


# ── Mappers ────────────────────────────────────────────────────────────────────

def _map_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert raw student_events documents into timeline items."""
    items: list[dict[str, Any]] = []
    for ev in events:
        try:
            item = _event_to_item(ev)
            if item:
                items.append(item)
        except Exception:
            logger.debug("timeline: could not map event %s", ev.get("event_id"))
    return items


def _event_to_item(ev: dict[str, Any]) -> dict[str, Any] | None:
    """
    Map one raw Moodle event to a timeline item.

    Returns None for events that don't carry meaningful user-visible information
    (e.g. bare dashboard page-load views).
    """
    page_type = (ev.get("page_type") or "").lower()
    action_type = (ev.get("action_type") or "").lower()
    title = (ev.get("title") or "").strip()
    course_id = str(ev.get("course_id") or "")

    # Derive a stable id for deduplication
    item_id = _stable_id(ev.get("event_id") or f"ev-{ev.get('timestamp')}-{action_type}-{page_type}")

    ts = _parse_timestamp(ev.get("timestamp"))
    if not ts:
        return None

    # ── Assignment submission ─────────────────────────────────────────────────
    if ev.get("assignment_submission") or (page_type == "assignment" and action_type == "view"
                                            and ev.get("submission_status")):
        submission_status = (ev.get("submission_status") or "").lower()
        is_late = ev.get("late", False) or "late" in submission_status
        label_title = title or "Unknown assignment"

        if is_late:
            return _item(
                id=f"late-{item_id}",
                date=ts,
                label=f"Late submission: {label_title}",
                item_type="late_submission",
                severity="warning",
                source="moodle_event",
                metadata={"course_id": course_id, "submission_status": submission_status},
            )
        return _item(
            id=f"sub-{item_id}",
            date=ts,
            label=f"Submitted assignment: {label_title}",
            item_type="assignment_submission",
            severity="positive",
            source="moodle_event",
            metadata={"course_id": course_id, "submission_status": submission_status},
        )

    # ── Quiz attempt ──────────────────────────────────────────────────────────
    if ev.get("quiz_attempt") or (page_type == "quiz" and action_type in ("view", "quiz_attempt")):
        score_raw = ev.get("score")
        score = _parse_score(score_raw)
        label_title = title or "Unknown quiz"

        if score is not None:
            severity = "danger" if score < 40 else ("warning" if score < _LOW_QUIZ_THRESHOLD else "positive")
            label = f"Attempted quiz: {label_title} — {score:.0f}%"
        else:
            severity = "neutral"
            label = f"Attempted quiz: {label_title}"

        return _item(
            id=f"quiz-{item_id}",
            date=ts,
            label=label,
            item_type="quiz_attempt",
            severity=severity,
            source="moodle_event",
            metadata={"course_id": course_id, "score": score},
        )

    # ── Material view ─────────────────────────────────────────────────────────
    if action_type in ("material_click", "assignment_view", "quiz_view") or (
        page_type == "resource" and action_type in ("view", "click")
    ):
        label_title = title or "course material"
        return _item(
            id=f"mat-{item_id}",
            date=ts,
            label=f"Viewed {label_title}",
            item_type="material_view",
            severity="neutral",
            source="moodle_event",
            metadata={"course_id": course_id, "page_type": page_type},
        )

    # ── Grade page view ───────────────────────────────────────────────────────
    if page_type == "grades" and action_type == "view":
        return _item(
            id=f"grade-view-{item_id}",
            date=ts,
            label="Checked grades",
            item_type="grade_update",
            severity="neutral",
            source="moodle_event",
            metadata={"course_id": course_id},
        )

    # Skip bare dashboard/course-page views — not meaningful for the student
    return None


def _map_grades(grades: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Map raw grade records (from raw_moodle_payload) to timeline items.

    These records represent the Moodle gradebook state and often have richer
    labels (item_name) than the raw click events.
    """
    items: list[dict[str, Any]] = []
    for g in grades:
        try:
            item = _grade_to_item(g)
            if item:
                items.append(item)
        except Exception:
            logger.debug("timeline: could not map grade record %s", g.get("item_name"))
    return items


def _grade_to_item(g: dict[str, Any]) -> dict[str, Any] | None:
    item_type_raw = (g.get("item_type") or "").lower()
    raw_name = (g.get("item_name") or "").strip()

    # Moodle prefixes the type into item_name, e.g. "AssignmentLab Week 1"
    title = _strip_type_prefix(raw_name, item_type_raw)
    if not title:
        return None

    # Use submission_time if present; otherwise this is a gradebook-only record
    ts = _parse_date_string(g.get("submission_time"))
    if not ts:
        # No timestamp means we can't place it on a timeline accurately
        return None

    course_id = str(g.get("course_id") or "")
    percentage = g.get("percentage")
    score = float(percentage) if isinstance(percentage, (int, float)) else None
    submission_status = (g.get("submission_status") or "").lower()
    is_late = "late" in submission_status

    item_id = _stable_id(f"grade-{course_id}-{title}-{g.get('submission_time')}")

    # Determine type + label + severity
    if item_type_raw == "assignment":
        if is_late:
            return _item(
                id=f"grade-late-{item_id}",
                date=ts,
                label=f"Late submission: {title}",
                item_type="late_submission",
                severity="warning",
                source="moodle_grade",
                metadata={"course_id": course_id, "score": score, "submission_status": submission_status},
            )
        severity = "positive" if (score is not None and score >= 60) else "neutral"
        label = f"Submitted assignment: {title}"
        if score is not None:
            label += f" — {score:.0f}%"
        return _item(
            id=f"grade-sub-{item_id}",
            date=ts,
            label=label,
            item_type="assignment_submission",
            severity=severity,
            source="moodle_grade",
            metadata={"course_id": course_id, "score": score},
        )

    if item_type_raw == "quiz":
        if score is not None:
            severity = "danger" if score < 40 else ("warning" if score < _LOW_QUIZ_THRESHOLD else "positive")
            label = f"Attempted quiz: {title} — {score:.0f}%"
        else:
            severity = "neutral"
            label = f"Attempted quiz: {title}"
        return _item(
            id=f"grade-quiz-{item_id}",
            date=ts,
            label=label,
            item_type="quiz_attempt",
            severity=severity,
            source="moodle_grade",
            metadata={"course_id": course_id, "score": score},
        )

    return None


def _map_ml_results(academiq_user_id: str) -> list[dict[str, Any]]:
    """
    Surface ML prediction records as 'risk_change' timeline items.

    We only add a timeline item when a stored prediction exists, using its
    updated_at timestamp. This is the best proxy for "when the system assessed you".
    """
    items: list[dict[str, Any]] = []
    cursor = ml_results_collection.find(
        {"academiq_user_id": academiq_user_id},
        sort=[("updated_at", -1)],
        limit=5,
    )
    for doc in cursor:
        ts = doc.get("updated_at") or doc.get("created_at")
        if not ts:
            continue
        if not isinstance(ts, datetime):
            try:
                ts = datetime.fromisoformat(str(ts))
            except Exception:
                continue

        prediction = doc.get("prediction") or {}
        classification = prediction.get("classification", "Unknown")
        probability = prediction.get("probability")
        model_name = doc.get("model_name", "AI model")
        item_id = _stable_id(f"ml-{academiq_user_id}-{ts.isoformat()}-{model_name}")

        # Map classification to severity
        if "risk" in classification.lower() or "not" in classification.lower():
            severity = "warning"
        elif "high performer" in classification.lower():
            severity = "positive"
        else:
            severity = "neutral"

        label = f"AI assessed your performance: {classification}"
        if probability is not None:
            label += f" ({round(float(probability) * 100)}% confidence)"

        items.append(_item(
            id=f"risk-{item_id}",
            date=ts,
            label=label,
            item_type="risk_change",
            severity=severity,
            source="ai_result",
            metadata={
                "model": model_name,
                "classification": classification,
                "probability": probability,
                "top_negative_drivers": prediction.get("top_negative_drivers"),
            },
        ))
    return items


def _detect_inactivity(
    academiq_user_id: str,
    course_id: str | None,
    existing_items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Find gaps of >= _INACTIVITY_GAP_DAYS between consecutive events and
    emit an inactivity item for each one. We derive this from the metrics
    snapshot's last_active dates, or from the sorted existing event dates.
    """
    # Collect all event dates from already-mapped items
    event_dates: list[datetime] = sorted(
        {i["date"] for i in existing_items if i.get("source") == "moodle_event"},
    )

    if len(event_dates) < 2:
        return []

    inactivity_items: list[dict[str, Any]] = []
    for i in range(1, len(event_dates)):
        gap = event_dates[i] - event_dates[i - 1]
        if gap.days >= _INACTIVITY_GAP_DAYS:
            gap_start = event_dates[i - 1] + timedelta(days=1)
            item_id = _stable_id(f"inactivity-{academiq_user_id}-{gap_start.isoformat()}")
            inactivity_items.append(_item(
                id=f"inact-{item_id}",
                date=gap_start,
                label=f"No activity detected for {gap.days} days",
                item_type="inactivity",
                severity="warning" if gap.days >= 7 else "neutral",
                source="generated",
                metadata={"gap_days": gap.days, "course_id": course_id},
            ))
    return inactivity_items


# ── Helpers ────────────────────────────────────────────────────────────────────

def _item(
    *,
    id: str,
    date: datetime,
    label: str,
    item_type: str,
    severity: str,
    source: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": id,
        "date": date,
        "label": label,
        "type": item_type,
        "severity": severity,
        "source": source,
        "metadata": metadata or {},
    }


def _stable_id(raw: str) -> str:
    """Return a short, stable, URL-safe id derived from a raw string."""
    return hashlib.sha1(raw.encode()).hexdigest()[:16]


def _parse_timestamp(ts: Any) -> datetime | None:
    """Convert epoch-ms int (from the extension) to a UTC datetime."""
    if ts is None:
        return None
    try:
        ms = int(ts)
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).replace(tzinfo=None)
    except (ValueError, TypeError, OSError):
        return None


def _parse_date_string(s: Any) -> datetime | None:
    """Parse an ISO-ish date string from Moodle grade records."""
    if not s:
        return None
    try:
        # Handle common Moodle formats: "2025-01-15" or "2025-01-15T10:30:00"
        return datetime.fromisoformat(str(s).replace("Z", "+00:00")).replace(tzinfo=None)
    except (ValueError, TypeError):
        return None


def _parse_score(raw: Any) -> float | None:
    """Convert a raw score (string or number) to a 0-100 float."""
    if raw is None:
        return None
    try:
        val = float(str(raw).replace("%", "").strip())
        # Scores stored as 0-1 fraction → convert to percentage
        return val * 100 if val <= 1.0 else val
    except (ValueError, TypeError):
        return None


def _strip_type_prefix(name: str, item_type: str) -> str:
    """
    Moodle often includes the item type at the start of item_name,
    e.g. "AssignmentLab Week 1" or "QuizMidterm".
    Strip these common prefixes for cleaner labels.
    """
    for prefix in ("Assignment", "Quiz", "Forum", "File", "Page", "URL", "Resource"):
        if name.startswith(prefix) and len(name) > len(prefix):
            remainder = name[len(prefix):]
            # Only strip if the next char is uppercase or space (real prefix, not part of word)
            if remainder[0].isupper() or remainder[0] == " ":
                return remainder.lstrip()
    return name