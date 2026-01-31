from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import numpy as np

app = FastAPI()

# ------------------------------
# Request schema (raw payload)
# ------------------------------
class Assignment(BaseModel):
    title: str
    due_date: Optional[str]
    submitted: bool
    grade: Optional[str]

class Quiz(BaseModel):
    title: str
    attempts: Optional[int]
    score: Optional[float]
    time_spent_ms: Optional[int]

class Course(BaseModel):
    course_id: str
    name: str
    visits: int
    time_spent_ms: int
    assignments: List[Assignment]
    quizzes: List[Quiz]
    final_grade: Optional[str]

class Session(BaseModel):
    start: int
    end: int
    duration_ms: int

class RawMoodlePayload(BaseModel):
    student_id: Optional[str]
    clicks: int
    lastActivity: int
    sessions: List[Session]
    courses: Dict[str, Course]

# ------------------------------
# Feature computation
# ------------------------------
def compute_features(payload: RawMoodlePayload) -> dict:
    # Total time spent
    total_time_spent = sum([s.duration_ms for s in payload.sessions])

    # Active days
    active_days = len(set([datetime.fromtimestamp(s.start/1000).date() for s in payload.sessions]))

    # Access frequency (average visits per course)
    if payload.courses:
        access_frequency = np.mean([c.visits for c in payload.courses.values()])
    else:
        access_frequency = 0

    # Quiz scores
    quiz_scores = []
    for course in payload.courses.values():
        for q in course.quizzes:
            if q.score is not None:
                quiz_scores.append(q.score)
    avg_quiz_score = float(np.mean(quiz_scores)) if quiz_scores else 0.0
    quiz_score_std = float(np.std(quiz_scores)) if quiz_scores else 0.0

    # Assignment scores & late submission
    assignment_scores = []
    late_count = 0
    total_assignments = 0
    now = datetime.now()
    for course in payload.courses.values():
        for a in course.assignments:
            total_assignments += 1
            if a.grade:
                # Parse grade like "17/20"
                try:
                    val, max_val = a.grade.split("/")
                    assignment_scores.append(float(val)/float(max_val))
                except:
                    pass
            # Check late
            if a.due_date and a.submitted:
                try:
                    due = datetime.fromisoformat(a.due_date)
                    if due < now:
                        late_count += 1
                except:
                    pass
    avg_assignment_score = float(np.mean(assignment_scores)) if assignment_scores else 0.0
    late_submission_ratio = float(late_count/total_assignments) if total_assignments else 0.0

    # Average final grade
    final_grades = []
    for course in payload.courses.values():
        if course.final_grade:
            try:
                val = float(course.final_grade.strip('%')) / 100
                final_grades.append(val)
            except:
                pass
    avg_final_grade = float(np.mean(final_grades)) if final_grades else 0.0

    return {
        "total_time_spent": total_time_spent,
        "active_days": active_days,
        "access_frequency": access_frequency,
        "avg_quiz_score": avg_quiz_score,
        "quiz_score_std": quiz_score_std,
        "avg_assignment_score": avg_assignment_score,
        "late_submission_ratio": late_submission_ratio,
        "avg_final_grade": avg_final_grade
    }

# ------------------------------
# Ingest endpoint
# ------------------------------
@app.post("/ingest")
async def ingest(raw_data: RawMoodlePayload):
    try:
        features = compute_features(raw_data)
        return {"status": "ok", "features": features, "student_id": raw_data.student_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
