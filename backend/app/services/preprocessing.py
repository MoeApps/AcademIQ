from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import numpy as np


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
# Feature computation (FINAL SCHEMA ALIGNED)
# ------------------------------
def compute_features(payload: RawMoodlePayload) -> dict:

    courses = payload.courses or {}
    sessions = payload.sessions or []

    # --------------------------
    # BASIC ACTIVITY FEATURES
    # --------------------------
    student_id = payload.student_id
    all_clicks = payload.clicks or 0

    total_time_spent = sum(s.duration_ms for s in sessions)

    active_days = len(set(
        datetime.fromtimestamp(s.start / 1000).date()
        for s in sessions
    ))

    # --------------------------
    # COURSE INTERACTION FEATURES
    # --------------------------
    access_frequency = float(np.mean([c.visits for c in courses.values()])) if courses else 0.0
    material_clicks = sum(c.visits for c in courses.values()) if courses else 0

    # --------------------------
    # QUIZ FEATURES
    # --------------------------
    quiz_scores = []
    quiz_attempts = 0

    for course in courses.values():
        for q in course.quizzes:
            quiz_attempts += q.attempts or 0
            if q.score is not None:
                quiz_scores.append(q.score)

    avg_quiz_score = float(np.mean(quiz_scores)) if quiz_scores else 0.0

    # --------------------------
# ASSIGNMENT FEATURES
# --------------------------
assignment_scores = []
assignment_submissions = 0
late_submission_count = 0
total_assignments = 0

now = datetime.now()

for course in courses.values():
    for a in course.assignments:
        total_assignments += 1

        # submission tracking
        if a.submitted:
            assignment_submissions += 1

        # grade processing
        if a.grade:
            try:
                val, max_val = a.grade.split("/")
                assignment_scores.append(float(val) / float(max_val))
            except:
                pass

        # late detection
        if a.due_date and a.submitted:
            try:
                due = datetime.fromisoformat(a.due_date)
                if due < now:
                    late_submission_count += 1
            except:
                pass

# base metrics
avg_assignment_score = float(np.mean(assignment_scores)) if assignment_scores else 0.0

# --------------------------
# PROCRASTINATION INDEX
# --------------------------
if total_assignments > 0:
    late_ratio = late_submission_count / total_assignments
else:
    late_ratio = 0.0

# simple but effective behavioral proxy
procrastination_index = float(late_ratio * 10)

# --------------------------
# FINAL GRADE
# --------------------------
final_grades = []
for course in courses.values():
    if course.final_grade:
        try:
            final_grades.append(float(course.final_grade.strip("%")) / 100)
        except:
            pass

final_grade = float(np.mean(final_grades)) if final_grades else 0.0

    # --------------------------
    # OUTPUT (MATCHES YOUR SCHEMA EXACTLY)
    # --------------------------
    return {
        "student_id": student_id,

        "all_clicks": all_clicks,
        "active_days": active_days,
        "access_frequency": access_frequency,
        "material_clicks": material_clicks,

        "avg_quiz_score": avg_quiz_score,
        "quiz_attempts": quiz_attempts,

        "avg_assignment_score": avg_assignment_score,
        "assignment_submissions": assignment_submissions,

        "final_grade": final_grade,

        "risk_cluster": None,   # NOT from Moodle (ML model output later)

        "total_time_spent": total_time_spent,

        "late_submission_count": late_submission_count,
        "procrastination_index": procrastination_index,
    }
