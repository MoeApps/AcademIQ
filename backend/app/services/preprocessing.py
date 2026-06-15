from datetime import datetime
from typing import Any, Dict, Optional
import numpy as np
import re


def parse_moodle_date(date_str: str) -> Optional[datetime]:
    """
    Parse Moodle due-date strings like "Monday, 6 October 2025, 2:00 AM".
    Returns a datetime or None if parsing fails.
    """
    if not date_str:
        return None
    cleaned = re.sub(r'^[A-Za-z]+,\s*', '', date_str.strip())
    for fmt in ("%d %B %Y, %I:%M %p", "%d %B %Y"):
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return None


def compute_features(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract ML-ready features from the Chrome extension JSON payload.

    Field-name mapping (extension storage → feature):
      behavior.total_time_spent_on_moodle → total_time_spent  (seconds)
      behavior.active_days_count          → active_days
      metricsByCourse[x].click_count      → all_clicks        (sum across real courses)
      metricsByCourse[x].total_visits     → access_frequency  (mean across real courses)
      metricsByCourse[x].number_of_resources_clicked → material_clicks
      metricsByCourse[x].quiz_attempts    → quiz_attempts
      metricsByCourse[x].assignment_submissions → assignment_submissions
      grades[].percentage                 → avg_quiz_score / avg_assignment_score
      grades[].submission_status          → late_submission_count
    """
    # ── Student identity ───────────────────────────────────────────────────
    student    = payload.get("student") or {}
    student_id = student.get("student_id")

    # ── Behaviour block ────────────────────────────────────────────────────
    behavior         = payload.get("behavior") or {}
    total_time_spent = int(behavior.get("total_time_spent_on_moodle", 0) or 0)
    active_days      = int(behavior.get("active_days_count", 0) or 0)

    # ── Per-course metrics ─────────────────────────────────────────────────
    # metricsByCourse is the authoritative source — the `courses` array is a
    # mirror of it and has the same values, but metricsByCourse is keyed by
    # course_id so filtering bogus entries (id "1", "My courses") is easier.
    metrics_by_course = payload.get("metricsByCourse") or {}

    all_clicks                   = 0
    access_frequency_total       = 0
    material_clicks              = 0
    total_quiz_attempts          = 0
    total_assignment_submissions = 0
    real_course_count            = 0

    _SKIP_NAMES = {"my courses", "home", "dashboard", "site home", "my moodle", "courses"}

    for course_id, m in metrics_by_course.items():
        if not m or str(course_id) == "1":
            continue
        if (m.get("course_name") or "").strip().lower() in _SKIP_NAMES:
            continue
        real_course_count            += 1
        all_clicks                   += int(m.get("click_count", 0) or 0)
        access_frequency_total       += int(m.get("total_visits", 0) or 0)
        material_clicks              += int(m.get("number_of_resources_clicked", 0) or 0)
        total_quiz_attempts          += int(m.get("quiz_attempts", 0) or 0)
        total_assignment_submissions += int(m.get("assignment_submissions", 0) or 0)

    access_frequency = (
        access_frequency_total / real_course_count if real_course_count > 0 else 0.0
    )

    # ── Grades block ───────────────────────────────────────────────────────
    grades            = payload.get("grades") or []
    quiz_scores       = []
    assignment_scores = []
    late_submission_count = 0
    total_assignments     = 0

    for g in grades:
        item_type  = (g.get("item_type") or "").lower()
        percentage = g.get("percentage")
        status     = (g.get("submission_status") or "").lower()

        # Score normalisation: extension stores 0-100 integers → convert to 0-1
        if percentage is not None:
            try:
                score = float(percentage)
                score_01 = score / 100.0 if score > 1.0 else score
                if "quiz" in item_type:
                    quiz_scores.append(score_01)
                elif "assignment" in item_type:
                    assignment_scores.append(score_01)
            except (ValueError, TypeError):
                pass

        # Late submission count — based on Moodle submission_status field
        if "assignment" in item_type:
            total_assignments += 1
            if "late" in status:
                late_submission_count += 1

    avg_quiz_score       = float(np.mean(quiz_scores))       if quiz_scores       else 0.0
    avg_assignment_score = float(np.mean(assignment_scores)) if assignment_scores else 0.0

    # ── Secondary late-submission signal from materials ────────────────────
    # If Moodle didn't report a "late" status but a past-due assignment material
    # exists, use that as a supplementary signal (only adds, never subtracts).
    if total_assignments == 0:
        from app.services.moodle_ingest import materials_from_payload
        now = datetime.now()
        for material in materials_from_payload(payload):
            tags  = {str(t).lower() for t in (material.get("semantic_tags") or [])}
            mtype = str(material.get("material_type") or material.get("type") or "").lower()
            if "assignment" not in tags and mtype != "assignment":
                continue
            total_assignments += 1
            due = parse_moodle_date(material.get("due_date") or "")
            if due and due < now:
                late_submission_count += 1

    # ── Procrastination index ──────────────────────────────────────────────
    if total_assignments > 0:
        procrastination_index = round((late_submission_count / total_assignments) * 10.0, 4)
    else:
        # Fallback heuristic: few active days → higher procrastination signal
        procrastination_index = round(max(0.0, (10 - min(active_days, 10)) * 0.5), 4)

    return {
        "student_id": student_id,

        "total_time_spent":       total_time_spent,
        "active_days":            active_days,
        "access_frequency":       round(access_frequency, 4),
        "all_clicks":             all_clicks,
        "material_clicks":        material_clicks,

        "avg_quiz_score":         round(avg_quiz_score, 4),
        "quiz_attempts":          total_quiz_attempts,

        "avg_assignment_score":   round(avg_assignment_score, 4),
        "assignment_submissions": total_assignment_submissions,

        "late_submission_count":  late_submission_count,
        "procrastination_index":  procrastination_index,

        "final_grade":            0.0,   # not available from the browser
        "risk_cluster":           None,  # filled by the ML pipeline
    }