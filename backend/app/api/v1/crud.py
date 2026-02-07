"""
Minimal CRUD for students, courses, grades (PAIS Phase 1).
Uses SQLite/SQLAlchemy from app.sql_db.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from backend.app.sql_db import SessionLocal, get_db
from backend.app.models.pais_models import Student, Course, Grade

router = APIRouter(prefix="/api/v1", tags=["CRUD"])


# ---------- Schemas ----------
class StudentOut(BaseModel):
    id: int
    student_id: str
    enrollment_year: Optional[int]
    program: Optional[str]
    level: Optional[int]

    class Config:
        from_attributes = True


class CourseOut(BaseModel):
    id: int
    course_id: str
    course_name: Optional[str]
    semester: Optional[str]

    class Config:
        from_attributes = True


class GradeOut(BaseModel):
    id: int
    student_id: str
    course_id: str
    final_grade: Optional[float]
    status: Optional[str]

    class Config:
        from_attributes = True


# ---------- Students ----------
@router.get("/students", response_model=List[StudentOut])
def list_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Student).offset(skip).limit(limit).all()


@router.get("/students/{student_id}", response_model=StudentOut)
def get_student(student_id: str, db: Session = Depends(get_db)):
    s = db.query(Student).filter(Student.student_id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    return s


# ---------- Courses ----------
@router.get("/courses", response_model=List[CourseOut])
def list_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Course).offset(skip).limit(limit).all()


@router.get("/courses/{course_id}", response_model=CourseOut)
def get_course(course_id: str, db: Session = Depends(get_db)):
    c = db.query(Course).filter(Course.course_id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    return c


# ---------- Grades ----------
@router.get("/grades", response_model=List[GradeOut])
def list_grades(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return db.query(Grade).offset(skip).limit(limit).all()


@router.get("/grades/{student_id}", response_model=List[GradeOut])
def get_grades_by_student(student_id: str, db: Session = Depends(get_db)):
    return db.query(Grade).filter(Grade.student_id == student_id).all()


# ---------- Course stats per student (for UI, no mock) ----------
@router.get("/students/{student_id}/courses/{course_id}/stats")
def get_student_course_stats(student_id: str, course_id: str, db: Session = Depends(get_db)):
    from backend.app.models.pais_models import Activity, AssignmentSubmission, QuizAttempt, StudySession
    activities = db.query(Activity).filter(Activity.course_id == course_id).all()
    assignment_activities = [a.activity_id for a in activities if a.type == "assignment"]
    quiz_activities = [a.activity_id for a in activities if a.type == "quiz"]
    total_assignments = len(assignment_activities)
    total_quizzes = len(quiz_activities)
    submitted = (
        db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.student_id == student_id,
            AssignmentSubmission.activity_id.in_(assignment_activities),
        )
        .all()
    ) if assignment_activities else []
    quiz_attempts = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.student_id == student_id,
            QuizAttempt.activity_id.in_(quiz_activities),
        )
        .all()
    ) if quiz_activities else []
    avg_assignment = (sum(s.score / s.max_score * 100 for s in submitted if s.max_score) / len(submitted)) if submitted else 0
    avg_quiz = (sum(q.score / q.max_score * 100 for q in quiz_attempts if q.max_score) / len(quiz_attempts)) if quiz_attempts else 0
    sessions = db.query(StudySession).filter(
        StudySession.student_id == student_id,
        StudySession.course_id == course_id,
    ).all()
    time_spent_hours = round(sum(s.time_spent_sec or 0 for s in sessions) / 3600, 1)
    return {
        "submittedAssignments": len(submitted),
        "totalAssignments": total_assignments,
        "avgAssignmentGrade": round(avg_assignment, 1),
        "completedQuizzes": len(quiz_attempts),
        "totalQuizzes": total_quizzes,
        "avgQuizGrade": round(avg_quiz, 1),
        "timeSpentHours": time_spent_hours,
    }


# ---------- Student profile (Phase 2) ----------
@router.get("/students/{student_id}/profile")
def get_student_profile(student_id: str, db: Session = Depends(get_db)):
    from backend.app.services.profile_service import get_profile
    profile = get_profile(db, student_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return profile


# ---------- Student predictions / risk (Phase 3) ----------
@router.get("/students/{student_id}/predictions")
def get_student_predictions(student_id: str):
    from backend.app.services.profile_service import get_risk_for_student
    risk = get_risk_for_student(student_id)
    if risk is None:
        raise HTTPException(status_code=404, detail="Student not in risk dataset")
    return {
        "student_id": student_id,
        "risk_cluster": risk["risk_cluster"],
        "risk_level": risk["risk_level"],
        "recommendation": risk["generic_recommendation"],
    }


# ---------- Knowledge gaps (Phase 4) ----------
@router.get("/students/{student_id}/knowledge-gaps")
def get_student_knowledge_gaps(student_id: str, db: Session = Depends(get_db)):
    from backend.app.services.knowledge_gap_service import get_knowledge_gaps
    gaps = get_knowledge_gaps(db, student_id)
    return {"student_id": student_id, "gaps": gaps}


# ---------- Recommendations (Phase 4): get stored or generate ----------
@router.get("/students/{student_id}/recommendations")
def get_student_recommendations(student_id: str, db: Session = Depends(get_db)):
    from backend.app.services.recommendation_service import get_recommendations_for_student
    recs = get_recommendations_for_student(db, student_id)
    return {"student_id": student_id, "recommendations": recs}


@router.post("/students/{student_id}/recommendations/generate")
def generate_student_recommendations(student_id: str, db: Session = Depends(get_db)):
    from backend.app.services.recommendation_service import generate_and_store_recommendations
    created = generate_and_store_recommendations(db, student_id)
    return {"student_id": student_id, "generated": len(created), "recommendations": created}


# ---------- Explainability (Phase 5) ----------
@router.get("/students/{student_id}/explain")
def get_student_explain(student_id: str):
    from backend.app.services.explain_service import get_explainability
    expl = get_explainability(student_id)
    if expl is None:
        raise HTTPException(status_code=404, detail="Student not found in dataset")
    return expl
