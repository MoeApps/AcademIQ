"""
Student profile and risk from DB + phase2_risk_clusters (read-only cache).
Dataset not modified.
"""
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.models.pais_models import Student, Grade, Course

# In-memory cache: student_id -> row from phase2_risk_clusters
_risk_cache: Optional[dict] = None


def _get_project_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent.parent


def _load_risk_cache() -> dict:
    global _risk_cache
    if _risk_cache is not None:
        return _risk_cache
    path = _get_project_root() / "Datasets" / "phase2_risk_clusters.csv"
    if not path.exists():
        _risk_cache = {}
        return _risk_cache
    df = pd.read_csv(path)
    _risk_cache = df.set_index("student_id").to_dict("index")
    return _risk_cache


def get_risk_for_student(student_id: str) -> Optional[dict]:
    """Return risk_cluster (int), risk_level (str), generic_recommendation (str) or None."""
    cache = _load_risk_cache()
    row = cache.get(student_id)
    if row is None:
        return None
    return {
        "risk_cluster": int(row.get("risk_cluster", 0)),
        "risk_level": str(row.get("risk_level", "Unknown")),
        "generic_recommendation": str(row.get("generic_recommendation", "")),
    }


def get_profile(db: Session, student_id: str) -> Optional[dict]:
    """
    Build student profile: strong/weak topics from grades, risk from cache, engagement placeholder.
    """
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return None
    grades = db.query(Grade).filter(Grade.student_id == student_id).all()
    course_ids = [g.course_id for g in grades]
    courses = {c.course_id: c for c in db.query(Course).filter(Course.course_id.in_(course_ids)).all()} if course_ids else {}

    strong_topics = []
    weak_topics = []
    for g in grades:
        name = courses.get(g.course_id)
        name = name.course_name if name else g.course_id
        if g.final_grade is not None:
            if g.final_grade >= 7.0:
                strong_topics.append({"course_id": g.course_id, "name": name, "grade": g.final_grade})
            elif g.final_grade < 5.0:
                weak_topics.append({"course_id": g.course_id, "name": name, "grade": g.final_grade})

    risk_data = get_risk_for_student(student_id)
    risk_level = risk_data["risk_level"] if risk_data else "Unknown"
    risk_cluster = risk_data["risk_cluster"] if risk_data else 0
    engagement_level = "medium"  # placeholder; could derive from study_sessions count later

    return {
        "student_id": student_id,
        "strong_topics": strong_topics,
        "weak_topics": weak_topics,
        "risk_level": risk_level,
        "risk_cluster": risk_cluster,
        "engagement_level": engagement_level,
        "learning_style_cluster": risk_cluster,  # reuse risk cluster as proxy for plan
    }
