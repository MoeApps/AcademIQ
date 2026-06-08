from datetime import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import re


def parse_moodle_date(date_str: str) -> Optional[datetime]:
    """
    Parse due dates like "Monday, 6 October 2025, 2:00 AM"
    Returns datetime object or None if parsing fails.
    """
    if not date_str:
        return None
    # Remove weekday and extra spaces
    cleaned = re.sub(r'^[A-Za-z]+, ', '', date_str)
    try:
        # Try with time
        return datetime.strptime(cleaned, "%d %B %Y, %I:%M %p")
    except ValueError:
        try:
            # Try without time (just date)
            return datetime.strptime(cleaned, "%d %B %Y")
        except ValueError:
            return None


def compute_features(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract ML-ready features from the actual Chrome extension JSON.
    """
    # ------------------------------
    # Student info
    student = payload.get("student", {})
    student_id = student.get("student_id")

    # ------------------------------
    # Behavior aggregates
    behavior = payload.get("behavior", {})
    total_time_spent_seconds = behavior.get("total_time_spent_on_moodle", 0)
    active_days = behavior.get("active_days_count", 0)
    all_clicks = behavior.get("click_count", 0)

    # ------------------------------
    # Courses data (list of course metrics)
    courses_list = payload.get("courses", [])
    # If courses is a list of dicts, we can compute averages/sums
    total_visits = sum(c.get("total_visits", 0) for c in courses_list)
    access_frequency = np.mean([c.get("total_visits", 0) for c in courses_list]) if courses_list else 0.0
    material_clicks = sum(c.get("click_count", 0) for c in courses_list)  # could be refined
    total_quiz_attempts = sum(c.get("quiz_attempts", 0) for c in courses_list)
    total_assignment_submissions = sum(c.get("assignment_submissions", 0) for c in courses_list)

    # ------------------------------
    # Grades processing
    grades = payload.get("grades", [])
    quiz_scores = []
    assignment_scores = []

    for grade_item in grades:
        item_type = grade_item.get("item_type", "")
        percentage = grade_item.get("percentage")

        if percentage is not None:
            try:
                score = float(percentage) / 100.0  # normalize to 0-1
                if item_type == "quiz":
                    quiz_scores.append(score)
                elif item_type == "assignment":
                    assignment_scores.append(score)
            except (ValueError, TypeError):
                pass

    avg_quiz_score = float(np.mean(quiz_scores)) if quiz_scores else 0.0
    avg_assignment_score = float(np.mean(assignment_scores)) if assignment_scores else 0.0

    # ------------------------------
    # Late submissions — derived from the canonical materials instead of the
    # (now removed) duplicated knowledge_base. An assignment is any material
    # tagged/typed "assignment"; it's "late" if its due date has passed. Works
    # with both the new single `materials` array and legacy payload shapes.
    from app.services.moodle_ingest import materials_from_payload

    late_submission_count = 0
    total_assignments = 0
    now = datetime.now()

    for material in materials_from_payload(payload):
        tags = {str(t).lower() for t in (material.get("semantic_tags") or [])}
        mtype = str(material.get("material_type") or material.get("type") or "").lower()
        if "assignment" not in tags and mtype != "assignment":
            continue
        total_assignments += 1
        due_date_str = material.get("due_date")
        if due_date_str:
            due = parse_moodle_date(due_date_str)
            if due and due < now:
                late_submission_count += 1

    # ------------------------------
    # Procrastination index
    if total_assignments > 0:
        late_ratio = late_submission_count / total_assignments
    else:
        late_ratio = 0.0
    procrastination_index = late_ratio * 10.0   # scale to 0-10

    # ------------------------------
    # Final grade (if any)
    # Not directly available; could compute from course final grades if present
    final_grade = 0.0   # placeholder

    # ------------------------------
    # Return exactly the 16 features you need (adjust as per your model)
    return {
        "student_id": student_id,

        "total_time_spent": total_time_spent_seconds,   # seconds
        "active_days": active_days,
        "access_frequency": access_frequency,
        "all_clicks": all_clicks,
        "material_clicks": material_clicks,

        "avg_quiz_score": avg_quiz_score,
        "quiz_attempts": total_quiz_attempts,

        "avg_assignment_score": avg_assignment_score,
        "assignment_submissions": total_assignment_submissions,

        "final_grade": final_grade,

        "late_submission_count": late_submission_count,
        "procrastination_index": procrastination_index,

        # Add any other features your model expects
        "risk_cluster": None,   # to be filled by ML later
    }