from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
# import numpy as np
# import joblib
from .database import ping_db
from ..routes.route import router

# ------------------------------------
# Initialize FastAPI app
# ------------------------------------
app = FastAPI(title="academIQ Backend", version="1.0")

app.include_router(router)

@app.on_event("startup")
def startup_db():
    ping_db()

# ------------------------------------
# Load ML models & scaler
# ------------------------------------
# try:
#     pass_fail_model = joblib.load(r"C:\Users\khale\OneDrive\Desktop\AcademIQ\ai\Pass_Fail_Model\pass_fail_model.pkl")
# except Exception as e:
#     print(f"⚠️ Failed to load pass_fail_model.pkl: {e}")
#     pass_fail_model = None

# try:
#     risk_model = joblib.load("backend/models/ai_model.pkl")
# except Exception as e:
#     print(f"⚠️ Failed to load ai_model.pkl: {e}")
#     risk_model = None

# ------------------------------------
# --------- Schemas ------------------
# ------------------------------------


from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://pelgaliljjfhhboggbncepdblmjobgan", "http://localhost:3000", "http://localhost:8000"],  # or ["*"] for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# For raw Moodle payload from content.js
class Assignment(BaseModel):
    title: str
    due_date: Optional[str]
    submitted: bool = True
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

# For features sent to /predict
class FeaturesPayload(BaseModel):
    total_time_spent: float
    active_days: float
    access_frequency: float
    avg_quiz_score: float
    quiz_score_std: float
    avg_assignment_score: float
    late_submission_ratio: float
    avg_final_grade: float

# ------------------------------------
# --------- Root --------------------
# ------------------------------------
@app.get("/")
def root():
    return {"message": "academIQ backend is running"}

# ------------------------------------
# --------- Ingest ------------------
# ------------------------------------
@app.post("/ingest")
async def ingest(raw_data: RawMoodlePayload):
    try:
        features = compute_features(raw_data)
        return {"status": "ok", "features": features, "student_id": raw_data.student_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------
# --------- Predict -----------------
# ------------------------------------
@app.post("/predict")
async def predict(features: FeaturesPayload):
    if risk_model is None:
        raise HTTPException(status_code=500, detail="Risk model not loaded")
    try:
        X = np.array([[
            features.total_time_spent,
            features.active_days,
            features.access_frequency,
            features.avg_quiz_score,
            features.quiz_score_std,
            features.avg_assignment_score,
            features.late_submission_ratio,
            features.avg_final_grade
        ]])
        risk_cluster = int(risk_model.predict(X)[0])
        risk_encoded = risk_cluster

        recommendation = generate_recommendation(risk_cluster)
        return {
            "status": "ok",
            "risk_cluster": risk_cluster,
            "risk_cluster_encoded": risk_encoded,
            "recommendation": recommendation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------
# --------- Helper functions ---------
# ------------------------------------
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
                try:
                    val, max_val = a.grade.split("/")
                    assignment_scores.append(float(val)/float(max_val))
                except:
                    pass
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

def generate_recommendation(risk_cluster: int) -> str:
    recommendations = {
        0: "Low risk – Keep up the good work!",
        1: "Medium risk – Focus on weak courses.",
        2: "High risk – Immediate intervention recommended!"
    }
    return recommendations.get(risk_cluster, "Unknown risk level")
