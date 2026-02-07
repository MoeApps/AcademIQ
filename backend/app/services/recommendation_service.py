"""
Content-based recommendation engine (PAIS Phase 4).
Recommend resources by weak topics; store in DB.
"""
from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from backend.app.models.pais_models import Recommendation, Course
from backend.app.services.profile_service import get_profile, get_risk_for_student
from backend.app.services.knowledge_gap_service import get_knowledge_gaps


def generate_and_store_recommendations(db: Session, student_id: str) -> List[dict]:
    """
    Build content-based recommendations from profile and knowledge gaps; save to DB.
    Returns list of recommendation dicts with reason and content.
    """
    profile = get_profile(db, student_id)
    if not profile:
        return []
    risk_data = get_risk_for_student(student_id)
    gaps = get_knowledge_gaps(db, student_id)
    courses = {c.course_id: c for c in db.query(Course).all()}
    created = []

    # From knowledge gaps: "Review [prereq] before [course]"
    for g in gaps:
        reason = f"Weak in {g.get('missing_prerequisite_name', g['missing_prerequisite'])}; enrolled in {g.get('course_name', g['course_id'])}."
        content = f"Review topic: {g.get('missing_prerequisite_name', g['missing_prerequisite'])}"
        rec = Recommendation(
            student_id=student_id,
            course_id=g.get("course_id"),
            type="prerequisite_review",
            reason=reason,
            content=content,
        )
        db.add(rec)
        created.append({"reason": reason, "content": content, "type": "prerequisite_review"})

    # From weak topics (no gap): "Improve in [course]"
    weak_ids = [t["course_id"] for t in profile.get("weak_topics", [])]
    for cid in weak_ids:
        if not any(r.get("content", "").startswith(f"Review topic: {courses.get(cid).course_name if courses.get(cid) else cid}") for r in created):
            name = courses.get(cid).course_name if courses.get(cid) else cid
            reason = f"Weak in {name}."
            content = f"Practice exercises and review materials for {name}"
            rec = Recommendation(
                student_id=student_id,
                course_id=cid,
                type="content_based",
                reason=reason,
                content=content,
            )
            db.add(rec)
            created.append({"reason": reason, "content": content, "type": "content_based"})

    # Risk-based generic recommendation
    if risk_data and risk_data.get("risk_level") and "High" in risk_data["risk_level"]:
        reason = risk_data.get("generic_recommendation", "High risk – focus on fundamentals.")
        rec = Recommendation(
            student_id=student_id,
            course_id=None,
            type="risk_intervention",
            reason=reason,
            content=reason,
        )
        db.add(rec)
        created.append({"reason": reason, "content": reason, "type": "risk_intervention"})

    db.commit()
    return created


def get_recommendations_for_student(db: Session, student_id: str) -> List[dict]:
    """Return stored recommendations for student (from DB)."""
    recs = db.query(Recommendation).filter(Recommendation.student_id == student_id).order_by(Recommendation.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "course_id": r.course_id,
            "type": r.type,
            "reason": r.reason,
            "content": r.content,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recs
    ]
