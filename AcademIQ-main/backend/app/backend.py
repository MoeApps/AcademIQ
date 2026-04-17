from __future__ import annotations

import os
import sys
import statistics
import traceback
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# backend/ (parent of app/) — so `routes` and sibling packages resolve
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Project root (AcademIQ-main) — for `config`, `models`, `schema`
ROOT_DIR = os.path.dirname(BACKEND_DIR)
for path in (BACKEND_DIR, ROOT_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(ROOT_DIR, ".env"))
except ImportError:
    pass

from . import ai_study
from .database import ping_db
from .extension_ingest import compute_features_from_extension
from .ml_predictor import predict_risk_cluster
from .student_store import get_student_result, store_student_result
from routes.route import router

DEBUG = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")

# ------------------------------------
# FastAPI
# ------------------------------------
app = FastAPI(
    title="academIQ Backend",
    version="1.0",
    description="LMS analytics, ML risk prediction, and MongoDB-backed Moodle entity storage.",
)

# Env list is merged with local dev origins so older .env files (missing :8080) still work with Vite.
_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000,"
    "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173",
)
_DEV_CORS_ALWAYS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_env_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]
_origins = list(dict.fromkeys(_env_origins + _DEV_CORS_ALWAYS))
# Any chrome-extension:// origin (popup fetch); override list still in CORS_ORIGINS for web apps
_cors_regex = (os.getenv("CORS_ORIGIN_REGEX") or r"chrome-extension://.*").strip()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["http://127.0.0.1:8000"],
    allow_origin_regex=_cors_regex if _cors_regex else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def startup_db():
    try:
        ping_db()
    except Exception as e:
        print(f"startup_db: ping_db() failed: {e}")
        print(traceback.format_exc())


# ------------------------------------
# Schemas
# ------------------------------------
class Assignment(BaseModel):
    title: str
    due_date: Optional[str] = None
    submitted: bool = True
    grade: Optional[str] = None


class Quiz(BaseModel):
    title: str
    attempts: Optional[int] = None
    score: Optional[float] = None
    time_spent_ms: Optional[int] = None


class Course(BaseModel):
    course_id: str
    name: str
    visits: int
    time_spent_ms: int
    assignments: List[Assignment] = Field(default_factory=list)
    quizzes: List[Quiz] = Field(default_factory=list)
    final_grade: Optional[str] = None


class Session(BaseModel):
    start: int
    end: int
    duration_ms: int


class RawMoodlePayload(BaseModel):
    student_id: Optional[str] = None
    clicks: int = 0
    lastActivity: int = 0
    sessions: List[Session] = Field(default_factory=list)
    courses: Dict[str, Course] = Field(default_factory=dict)


class FeaturesPayload(BaseModel):
    total_time_spent: float
    active_days: float
    access_frequency: float
    avg_quiz_score: float
    quiz_score_std: float
    avg_assignment_score: float
    late_submission_ratio: float
    avg_final_grade: float


class StoreResultPayload(BaseModel):
    student_id: str
    features: dict
    risk_cluster: Optional[int] = None
    risk_cluster_encoded: Optional[int] = None
    recommendation: Optional[str] = None


class AiStudyRequest(BaseModel):
    """Web app → AI study endpoints (OpenAI when OPENAI_API_KEY is set; else stub)."""

    course_id: str
    course_name: Optional[str] = None
    chapters: List[str] = Field(default_factory=list)


# ------------------------------------
# Routes
# ------------------------------------
@app.get("/", tags=["Health"])
def root():
    return {"message": "academIQ backend is running"}


@app.post("/ingest", tags=["Analytics & ML"])
async def ingest(raw_data: RawMoodlePayload):
    try:
        features = compute_features(raw_data)
        return {"status": "ok", "features": features, "student_id": raw_data.student_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest/extension", tags=["Analytics & ML"])
async def ingest_extension(body: Dict[str, Any]):
    """
    Accept the JSON shape produced by the Chrome extension (`sanitizePayload` / Download JSON).
    Returns the same 8 engineered features as `/ingest` for `/predict`.
    """
    try:
        features, student_id = compute_features_from_extension(body)
        return {"status": "ok", "features": features, "student_id": student_id, "source": "extension_export"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze", tags=["Analytics & ML"])
async def analyze_extension_export(
    body: Dict[str, Any],
    persist_mongo: bool = Query(
        False,
        description="If true, stores extension JSON + features in MongoDB raw_moodle_payload_collection",
    ),
):
    """
    Full pipeline: extension JSON → features → risk prediction → in-memory store.
    Optional: persist snapshot to MongoDB for thesis / auditing.
    """
    try:
        features, student_id = compute_features_from_extension(body)
        sid = student_id or "anonymous"
        risk_cluster, warn = predict_risk_cluster(features)
        recommendation = generate_recommendation(risk_cluster)
        store_student_result(
            sid,
            features,
            risk_cluster=risk_cluster,
            risk_cluster_encoded=risk_cluster,
            recommendation=recommendation,
        )
        out: Dict[str, Any] = {
            "status": "ok",
            "student_id": sid,
            "features": features,
            "risk_cluster": risk_cluster,
            "risk_cluster_encoded": risk_cluster,
            "recommendation": recommendation,
            "stored": True,
        }
        if warn:
            out["warning"] = warn

        if persist_mongo:
            from config.database import raw_moodle_payload_collection

            raw_moodle_payload_collection.insert_one(
                {
                    "source": "extension_export",
                    "student_id": sid,
                    "payload": body,
                    "features": features,
                    "risk_cluster": risk_cluster,
                    "recommendation": recommendation,
                }
            )
            out["persisted_mongo"] = True

        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict", tags=["Analytics & ML"])
async def predict(features: FeaturesPayload):
    try:
        fd = features.model_dump() if hasattr(features, "model_dump") else features.dict()
        risk_cluster, warn = predict_risk_cluster(fd)
        risk_encoded = risk_cluster
        recommendation = generate_recommendation(risk_cluster)
        body = {
            "status": "ok",
            "risk_cluster": risk_cluster,
            "risk_cluster_encoded": risk_encoded,
            "recommendation": recommendation,
        }
        if warn:
            body["warning"] = warn
        return body
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/store_result", tags=["Analytics & ML"])
async def store_result(payload: StoreResultPayload):
    if not payload.student_id:
        raise HTTPException(status_code=400, detail="student_id is required")
    store_student_result(
        payload.student_id,
        payload.features,
        risk_cluster=payload.risk_cluster,
        risk_cluster_encoded=payload.risk_cluster_encoded,
        recommendation=payload.recommendation,
    )
    return {"status": "ok", "message": "Result stored"}


@app.get("/student_results", tags=["Analytics & ML"])
async def student_results(student_id: str = Query(...)):
    result = get_student_result(student_id)
    if not result:
        raise HTTPException(status_code=404, detail="No result found for this student")
    return {"status": "ok", "student_id": student_id, "result": result}


@app.get("/ai/course/{course_id}/quizzes", tags=["AI Study"])
async def ai_list_course_quizzes(
    course_id: str,
    topic: Optional[str] = Query(None, description="Filter quizzes that include this chapter/topic"),
    limit: int = Query(80, ge=1, le=200),
):
    """Quizzes previously generated for this course (Mongo); optional filter by topic label."""
    items = ai_study.list_quizzes_by_course(course_id, topic=topic, limit=limit)
    return {"status": "ok", "course_id": course_id, "quizzes": items}


@app.get("/ai/course/{course_id}/notes", tags=["AI Study"])
async def ai_list_course_notes(
    course_id: str,
    topic: Optional[str] = Query(None, description="Filter notes that include this chapter/topic"),
    limit: int = Query(80, ge=1, le=200),
):
    """Notes previously generated for this course (Mongo); optional filter by topic."""
    items = ai_study.list_notes_by_course(course_id, topic=topic, limit=limit)
    return {"status": "ok", "course_id": course_id, "notes": items}


@app.post("/ai/generate-quiz", tags=["AI Study"])
async def ai_generate_quiz(req: AiStudyRequest):
    """Generate quiz (OpenAI if configured), save to Mongo, return questions."""
    questions, source, fallback_reason = ai_study.generate_quiz_content(
        req.course_id, req.course_name, req.chapters
    )
    mongo_id, saved = ai_study.save_quiz(
        req.course_id, req.course_name, req.chapters, questions, source
    )
    body: Dict[str, Any] = {
        "status": "ok",
        "course_id": req.course_id,
        "course_name": req.course_name,
        "chapters": req.chapters,
        "questions": questions,
        "source": source,
        "saved": saved,
        "mongo_id": mongo_id,
    }
    if source == "openai":
        body["message"] = "Quiz generated with the configured AI model and stored in MongoDB."
    else:
        body["message"] = (
            "Quiz generated in offline mode (no API key or LLM fallback). "
            "Set OPENAI_API_KEY in `.env` for AI-authored questions."
        )
    if fallback_reason:
        body["fallback_reason"] = fallback_reason
    return body


@app.post("/ai/generate-notes", tags=["AI Study"])
async def ai_generate_notes(req: AiStudyRequest):
    """Generate study notes (OpenAI if configured), save to Mongo."""
    notes, source, fallback_reason = ai_study.generate_notes_content(
        req.course_id, req.course_name, req.chapters
    )
    mongo_id, saved = ai_study.save_notes(
        req.course_id, req.course_name, req.chapters, notes, source
    )
    body: Dict[str, Any] = {
        "status": "ok",
        "course_id": req.course_id,
        "course_name": req.course_name,
        "chapters": req.chapters,
        "notes": notes,
        "source": source,
        "saved": saved,
        "mongo_id": mongo_id,
    }
    if source == "openai":
        body["message"] = "Notes generated with the configured AI model and stored in MongoDB."
    else:
        body["message"] = (
            "Notes generated in offline mode. Set OPENAI_API_KEY in `.env` for AI-authored notes."
        )
    if fallback_reason:
        body["fallback_reason"] = fallback_reason
    return body


@app.exception_handler(Exception)
def global_exception_handler(request, exc: Exception):
    payload: dict = {"error": str(exc)}
    if DEBUG:
        payload["trace"] = traceback.format_exc()
    return JSONResponse(status_code=500, content=payload)


# ------------------------------------
# Feature engineering
# ------------------------------------
def compute_features(payload: RawMoodlePayload) -> dict:
    total_time_spent = sum(s.duration_ms for s in payload.sessions)

    active_days = len(
        {datetime.fromtimestamp(s.start / 1000).date() for s in payload.sessions}
    )

    if payload.courses:
        visit_counts = [c.visits for c in payload.courses.values()]
        access_frequency = statistics.mean(visit_counts) if visit_counts else 0.0
    else:
        access_frequency = 0.0

    quiz_scores = []
    for course in payload.courses.values():
        for q in course.quizzes:
            if q.score is not None:
                quiz_scores.append(q.score)
    avg_quiz_score = float(statistics.mean(quiz_scores)) if quiz_scores else 0.0
    quiz_score_std = float(statistics.stdev(quiz_scores)) if len(quiz_scores) > 1 else 0.0

    assignment_scores: List[float] = []
    late_count = 0
    total_assignments = 0
    now = datetime.now()
    for course in payload.courses.values():
        for a in course.assignments:
            total_assignments += 1
            if a.grade:
                try:
                    val, max_val = a.grade.split("/")
                    assignment_scores.append(float(val) / float(max_val))
                except (ValueError, ZeroDivisionError):
                    pass
            if a.due_date:
                try:
                    due = datetime.fromisoformat(a.due_date.replace("Z", "+00:00"))
                    if due < now and not a.submitted:
                        late_count += 1
                except (ValueError, TypeError):
                    pass

    avg_assignment_score = (
        float(statistics.mean(assignment_scores)) if assignment_scores else 0.0
    )
    late_submission_ratio = (
        float(late_count / total_assignments) if total_assignments else 0.0
    )

    final_grades: List[float] = []
    for course in payload.courses.values():
        if course.final_grade:
            try:
                final_grades.append(float(course.final_grade.strip("%")) / 100.0)
            except (ValueError, AttributeError):
                pass
    avg_final_grade = float(statistics.mean(final_grades)) if final_grades else 0.0

    return {
        "total_time_spent": total_time_spent,
        "active_days": float(active_days),
        "access_frequency": access_frequency,
        "avg_quiz_score": avg_quiz_score,
        "quiz_score_std": quiz_score_std,
        "avg_assignment_score": avg_assignment_score,
        "late_submission_ratio": late_submission_ratio,
        "avg_final_grade": avg_final_grade,
    }


def generate_recommendation(risk_cluster: int) -> str:
    recommendations = {
        0: "Low risk – Keep up the good work!",
        1: "Medium risk – Focus on weak courses.",
        2: "High risk – Immediate intervention recommended!",
    }
    return recommendations.get(risk_cluster, "Unknown risk level")
