"""
Map Chrome extension export JSON (sanitizePayload shape) to the 8 ML features.
"""
from __future__ import annotations

import re
import statistics
from typing import Any, Dict, List, Optional, Tuple


def _num(x: Any, default: float = 0.0) -> float:
    try:
        if x is None:
            return default
        return float(x)
    except (TypeError, ValueError):
        return default


def _parse_grade_fraction(grade_text: Any) -> Optional[float]:
    if not grade_text or not isinstance(grade_text, str):
        return None
    m = re.search(r"([\d.]+)\s*/\s*([\d.]+)", grade_text.replace(" ", ""))
    if not m:
        return None
    try:
        a, b = float(m.group(1)), float(m.group(2))
        if b <= 0:
            return None
        return a / b
    except (ValueError, ZeroDivisionError):
        return None


def compute_features_from_extension(data: Dict[str, Any]) -> Tuple[dict, Optional[str]]:
    """
    Build the same 8 keys as RawMoodlePayload / FeaturesPayload.
    Returns (features, student_id).
    """
    student = data.get("student") or {}
    student_id = student.get("student_id")
    if isinstance(student_id, str):
        student_id = student_id.strip() or None

    courses_raw = data.get("courses") or []
    if not isinstance(courses_raw, list):
        courses_raw = []

    behavior = data.get("behavior") or {}
    grades = data.get("grades") or []
    if not isinstance(grades, list):
        grades = []

    # --- Time (ms): prefer behavior total; align with per-course sum if larger ---
    total_sec = _num(behavior.get("total_time_spent_on_moodle"), 0.0)
    per_course_sec = sum(_num(c.get("total_time_spent_seconds"), 0.0) for c in courses_raw)
    total_time_spent = float(max(total_sec, per_course_sec) * 1000.0)

    active_days = _num(behavior.get("active_days_count"), 0.0)

    # Visits: exclude dashboard pseudo-course id "1"
    visits_list: List[float] = []
    for c in courses_raw:
        cid = str(c.get("course_id") or "")
        if cid == "1":
            continue
        visits_list.append(_num(c.get("total_visits"), 0.0))
    access_frequency = float(statistics.mean(visits_list)) if visits_list else 0.0

    quiz_scores: List[float] = []
    assignment_ratios: List[float] = []
    late_flags = 0
    grade_rows = 0

    for g in grades:
        if not isinstance(g, dict):
            continue
        grade_rows += 1
        it = (g.get("item_type") or "").lower()
        pct = g.get("percentage")
        if pct is not None:
            try:
                p = float(pct)
                ratio = min(1.0, max(0.0, p / 100.0)) if p > 1.0 else min(1.0, max(0.0, p))
                if "quiz" in it:
                    quiz_scores.append(ratio)
                else:
                    assignment_ratios.append(ratio)
            except (TypeError, ValueError):
                pass
        frac = _parse_grade_fraction(g.get("grade"))
        if frac is not None:
            if "quiz" in it:
                quiz_scores.append(min(1.0, max(0.0, frac)))
            else:
                assignment_ratios.append(min(1.0, max(0.0, frac)))
        status = (g.get("submission_status") or "").lower()
        if "overdue" in status or "late" in status:
            late_flags += 1

    avg_quiz_score = float(statistics.mean(quiz_scores)) if quiz_scores else 0.0
    quiz_score_std = float(statistics.stdev(quiz_scores)) if len(quiz_scores) > 1 else 0.0
    avg_assignment_score = float(statistics.mean(assignment_ratios)) if assignment_ratios else 0.0

    # Engagement proxies when Moodle grades[] is empty (common before visiting grade report)
    if not quiz_scores and not assignment_ratios:
        qa = sum(int(c.get("quiz_attempts") or 0) for c in courses_raw)
        qv = sum(int(c.get("number_of_quizzes_viewed") or 0) for c in courses_raw)
        if qa + qv > 0:
            avg_quiz_score = min(1.0, 0.12 + 0.07 * min(qa, 5) + 0.02 * min(qv, 10))
        subs = sum(int(c.get("assignment_submissions") or 0) for c in courses_raw)
        av = sum(int(c.get("number_of_assignments_viewed") or 0) for c in courses_raw)
        if subs + av > 0:
            avg_assignment_score = min(1.0, 0.15 + 0.06 * min(subs, 5) + 0.03 * min(av, 8))

    late_den = max(1, grade_rows)
    late_submission_ratio = float(late_flags / late_den)

    # Composite "final" grade estimate
    pct_vals: List[float] = []
    for g in grades:
        if isinstance(g, dict) and g.get("percentage") is not None:
            try:
                p = float(g["percentage"])
                pct_vals.append(min(1.0, max(0.0, p / 100.0)) if p > 1.0 else min(1.0, max(0.0, p)))
            except (TypeError, ValueError):
                pass

    if pct_vals:
        avg_final_grade = float(statistics.mean(pct_vals))
    else:
        avg_final_grade = float(
            min(
                1.0,
                max(
                    0.0,
                    0.45 * avg_assignment_score
                    + 0.45 * avg_quiz_score
                    + 0.1 * (1.0 - late_submission_ratio),
                ),
            )
        )

    features = {
        "total_time_spent": total_time_spent,
        "active_days": active_days,
        "access_frequency": access_frequency,
        "avg_quiz_score": avg_quiz_score,
        "quiz_score_std": quiz_score_std,
        "avg_assignment_score": avg_assignment_score,
        "late_submission_ratio": late_submission_ratio,
        "avg_final_grade": avg_final_grade,
    }
    return features, student_id
