"""
Instructor endpoints: at-risk students list, class analytics (PAIS Phase 5).
Uses phase2_risk_clusters (read-only) and DB.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.sql_db import get_db
from backend.app.models.pais_models import Grade
from backend.app.services.profile_service import _load_risk_cache

router = APIRouter(prefix="/api/v1/instructor", tags=["Instructor"])


@router.get("/at-risk")
def list_at_risk_students():
    """
    List students with Medium or High risk from phase2_risk_clusters (dataset not modified).
    """
    cache = _load_risk_cache()
    at_risk = []
    for student_id, row in cache.items():
        level = str(row.get("risk_level", ""))
        if "Medium" in level or "High" in level:
            at_risk.append({
                "student_id": student_id,
                "risk_level": level,
                "risk_cluster": int(row.get("risk_cluster", 0)),
                "reason": str(row.get("generic_recommendation", "")),
            })
    return {"at_risk": at_risk, "count": len(at_risk)}


@router.get("/analytics")
def class_analytics(db: Session = Depends(get_db)):
    """
    Class-level summary: risk distribution (from cache) and grade distribution (from DB).
    """
    cache = _load_risk_cache()
    risk_dist = {"Low Risk": 0, "Medium Risk": 0, "High Risk": 0}
    for row in cache.values():
        level = str(row.get("risk_level", ""))
        if "Low" in level:
            risk_dist["Low Risk"] += 1
        elif "Medium" in level:
            risk_dist["Medium Risk"] += 1
        elif "High" in level:
            risk_dist["High Risk"] += 1

    grades = db.query(Grade).all()
    grade_values = [g.final_grade for g in grades if g.final_grade is not None]
    avg_grade = sum(grade_values) / len(grade_values) if grade_values else 0
    pass_count = sum(1 for g in grades if g.status == "PASS")
    fail_count = sum(1 for g in grades if g.status == "FAIL")

    return {
        "risk_distribution": risk_dist,
        "grade_summary": {
            "average_final_grade": round(avg_grade, 2),
            "pass_count": pass_count,
            "fail_count": fail_count,
            "total_records": len(grades),
        },
    }
