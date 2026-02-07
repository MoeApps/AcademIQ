"""
Knowledge gap detection (PAIS Phase 4): rule-based prerequisites.
If weak in course X and enrolled in course Y that requires X, flag gap.
"""
from typing import List

from sqlalchemy.orm import Session

from backend.app.models.pais_models import Enrollment, Grade, Course
from backend.app.services.profile_service import get_profile, get_risk_for_student

# Simple prerequisite map: course_id -> list of required course_ids (from plan: "course A before B")
PREREQUISITES = {
    "C03": ["C01", "C02"],
    "C04": ["C01", "C02", "C03"],
    "C05": ["C01"],
    "C06": ["C02"],
}


def get_weak_course_ids(db: Session, student_id: str) -> List[str]:
    """Course IDs where the student has low grade (e.g. < 5)."""
    grades = db.query(Grade).filter(Grade.student_id == student_id).all()
    return [g.course_id for g in grades if g.final_grade is not None and g.final_grade < 5.0]


def get_enrolled_course_ids(db: Session, student_id: str) -> List[str]:
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
    return [e.course_id for e in enrollments]


def get_knowledge_gaps(db: Session, student_id: str) -> List[dict]:
    """
    Return list of {course_id, course_name, missing_prerequisite, weak_in}.
    """
    weak = set(get_weak_course_ids(db, student_id))
    enrolled = set(get_enrolled_course_ids(db, student_id))
    courses = {c.course_id: c for c in db.query(Course).filter(Course.course_id.in_(enrolled | weak)).all()}
    gaps = []
    for course_id in enrolled:
        prereqs = PREREQUISITES.get(course_id, [])
        for prereq_id in prereqs:
            if prereq_id in weak:
                gaps.append({
                    "course_id": course_id,
                    "course_name": courses.get(course_id).course_name if courses.get(course_id) else course_id,
                    "missing_prerequisite": prereq_id,
                    "missing_prerequisite_name": courses.get(prereq_id).course_name if courses.get(prereq_id) else prereq_id,
                    "weak_in": prereq_id,
                })
    return gaps
