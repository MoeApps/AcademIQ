# backend/app/routes/student_data.py
"""
Student-facing data endpoints consumed by the Next.js frontend
(front-end/src/lib/api.ts). All are scoped to the authenticated student via the
session cookie (get_current_user), and read the real normalized collections.

Paths intentionally have NO /api prefix to match the frontend's api.ts calls
(/courses, /dashboard, /courses/{id}/performance, ...).
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import get_current_user
from app.repositories import material_repository, metrics_repository, user_repository
from app.schema.counterfactual_schema import (
    CounterfactualChange,
    CounterfactualResponse,
    friendly_label,
)
from app.schema.prediction_history_schema import (
    PredictionHistoryPoint,
    PredictionTrendResponse,
)
from app.schema.timeline_schema import EvidenceTimelineResponse
from app.services import prediction_history, quiz_gen, student_data, study_buddy
from app.services.timeline_service import build_timeline

router = APIRouter(tags=["Student data"])


class StudyBuddyOptIn(BaseModel):
    optin: bool


@router.get("/courses/{course_id}/study-buddies")
def study_buddies(course_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Recommend up to 5 near-peer study partners in this course.

    Only opted-in classmates are recommendable, and no grades are returned —
    each suggestion is just a name plus a human-readable reason.
    """
    return study_buddy.recommend(str(user["_id"]), course_id, k=5)


@router.put("/me/study-buddy-optin")
def set_study_buddy_optin(
    body: StudyBuddyOptIn,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Toggle whether this student is discoverable as a study buddy (consent)."""
    user_repository.update(str(user["_id"]), {"study_buddy_optin": body.optin})
    return {"studyBuddyOptIn": body.optin}


@router.get("/me/debug-data")
def debug_data(user: Dict[str, Any] = Depends(get_current_user)):
    """Show which user is authenticated and what raw data the backend sees.

    For development/testing only — helps verify that the right MongoDB
    documents are linked to your logged-in account.
    """
    user_id = str(user["_id"])
    feats = student_data._latest_features(user_id)
    grades = student_data._grades(user_id)
    courses = student_data.get_courses(user_id)
    metrics_docs = metrics_repository.list_for_user(user_id)
    per_course = {
        m["course_id"]: m.get("metrics", {})
        for m in metrics_docs
        if m.get("course_id") != metrics_repository.OVERALL
    }
    # Run the live model and report exactly what happens
    model_status: Dict[str, Any] = {"loaded": False, "prediction": None, "error": None}
    try:
        from app.services.performance_predict import (
            _calibrated_model,
            _behavioral_features,
            predict_performance,
        )
        model_status["loaded"] = _calibrated_model is not None
        model_status["expected_features"] = _behavioral_features
        if feats and _calibrated_model is not None:
            perf_keys = [
                "all_clicks", "active_days", "access_frequency", "material_clicks",
                "quiz_attempts", "assignment_submissions", "total_time_spent",
                "procrastination_index", "late_submission_count",
            ]
            raw_input = {k: feats.get(k, 0) for k in perf_keys}
            model_status["raw_input_to_model"] = raw_input
            result = predict_performance(raw_input)
            model_status["prediction"] = {
                "probability": result.get("probability"),
                "classification": result.get("classification"),
                "tier": result.get("tier"),
            }
    except ImportError as exc:
        model_status["error"] = f"Missing dependency: {exc}"
    except Exception as exc:
        model_status["error"] = str(exc)

    return {
        "user_id": user_id,
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "courses_found": len(courses),
        "courses": courses,
        "feature_vector_keys": sorted(feats.keys()) if feats else [],
        "feature_vector_sample": {
            k: feats.get(k)
            for k in [
                "all_clicks", "active_days", "quiz_attempts",
                "assignment_submissions", "total_time_spent",
                "avg_quiz_score", "avg_assignment_score",
            ]
        } if feats else None,
        "grades_count": len(grades),
        "per_course_metrics": per_course,
        "model_status": model_status,
    }


@router.get("/courses")
def list_courses(user: Dict[str, Any] = Depends(get_current_user)):
    return student_data.get_courses(str(user["_id"]))


@router.get("/dashboard")
def dashboard(user: Dict[str, Any] = Depends(get_current_user)):
    return student_data.get_dashboard(user)


@router.get("/courses/{course_id}/performance")
def performance(course_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    return student_data.get_performance(str(user["_id"]), course_id)


@router.get("/courses/{course_id}/insights")
def insights(course_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    return student_data.get_insights(str(user["_id"]), course_id)


@router.get("/courses/{course_id}/materials")
def materials(course_id: str, _user: Dict[str, Any] = Depends(get_current_user)):
    # Materials are course-scoped (shared), but still gated behind auth.
    return student_data.get_materials(course_id)


@router.post("/courses/{course_id}/quiz")
def generate_quiz(
    course_id: str,
    body: Dict[str, Any],
    _user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Generate a quiz from the selected materials' stored text (uploaded by the
    extension via POST /materials/content). Falls back to a clear placeholder
    question when no content/generator is available, so the UI never breaks.
    """
    material_ids: List[str] = body.get("materialIds", []) or []
    text = material_repository.get_content(course_id, material_ids)

    questions: List[Dict[str, Any]] = []
    if text and quiz_gen.available():
        try:
            questions = quiz_gen.generate_from_text(text, num_questions=8)
        except Exception:
            questions = []

    if not questions:
        reason = (
            "No question could be generated — the selected materials have no "
            "uploaded text yet. In the extension, run the materials upload so "
            "the PDFs' text reaches the backend, then try again."
            if not text else
            "The selected materials' text didn't yield enough structured "
            "concepts for question generation. Try different/〈more〉 materials."
        )
        questions = [{
            "id": "placeholder",
            "question": reason,
            "options": ["Understood", "OK", "Got it", "Retry later"],
            "correctIndex": 0,
        }]

    return {"courseId": course_id, "materialIds": material_ids, "questions": questions}


# ── Counterfactual Recommendation Engine ────────────────────────────────────

@router.get("/counterfactual", response_model=CounterfactualResponse)
def counterfactual(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Return the minimum behavioural changes needed for the authenticated
    student to flip from Not High Performer to High Performer.

    Uses the student's latest global feature_vectors document (same source
    as get_insights — not course-scoped, since the underlying performance
    model is a single cross-course behavioural classifier).

    Returns 422 (not 500) when the student has no behavioural data yet, so
    the frontend can show "sync the extension first" instead of a crash.
    """
    user_id = str(user["_id"])
    feats = student_data._latest_features(user_id)

    if not feats:
        raise HTTPException(
            status_code=422,
            detail="No behavioural data yet — sync the extension first.",
        )

    perf = student_data._predict(feats)
    if not perf:
        # ML stack unavailable (e.g. missing scikit-learn/lightgbm/shap on
        # this Python version) — same fallback condition get_insights uses.
        raise HTTPException(
            status_code=422,
            detail="The performance model is currently unavailable on this "
                   "server, so a counterfactual projection can't be computed.",
        )

    try:
        from app.services.counterfactual import find_counterfactual
        result = find_counterfactual(feats)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Counterfactual computation failed: {exc}",
        ) from exc

    changes = [
        CounterfactualChange(
            feature=feat,
            **{"from": vals["from"]},
            to=vals["to"],
            change=vals["change"],
            friendlyLabel=friendly_label(feat),
        )
        for feat, vals in result.get("changes_needed", {}).items()
    ]

    return CounterfactualResponse(
        status=result["status"],
        originalProbability=result["original_probability"],
        newProbability=result["new_probability"],
        probabilityGain=result["probability_gain"],
        changesNeeded=changes,
        heuristic=False,
    )


# ── Prediction History & Trend ──────────────────────────────────────────────
# Built alongside the Counterfactual engine above so the two stay consistent:
# both read from the same model_name ("performance_model_v4") and the same
# friendly_label() mapping for feature names shown to the student.

@router.get("/prediction-history", response_model=List[PredictionHistoryPoint])
def get_prediction_history(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Return the authenticated student's prediction-probability history,
    oldest-to-newest, for the "performance over time" dashboard chart.

    Returns an empty list (not an error) for students with no recorded
    history yet — an expected state, not a failure.
    """
    user_id = str(user["_id"])
    docs = prediction_history.get_history(user_id)
    return [
        {
            "date": d["recorded_at"],
            "probability": d["probability"],
            "classification": d.get("classification") or "",
        }
        for d in docs
    ]


@router.get("/prediction-trend", response_model=PredictionTrendResponse)
def get_prediction_trend(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Return a one-sentence explanation of what changed between the student's
    two most recent prediction snapshots and why (SHAP-delta driven).

    Returns hasEnoughData=False (200, not an error) when fewer than two
    history entries exist yet — expected for new/recently-synced students.
    """
    user_id = str(user["_id"])
    return prediction_history.get_trend_summary(user_id)


# ── Evidence Timeline ──────────────────────────────────────────────────────────

@router.get("/timeline", response_model=EvidenceTimelineResponse)
def get_timeline(
    course_id: Optional[str]  = Query(None, description="Filter to a single Moodle course"),
    limit:     int            = Query(100,  ge=1, le=500, description="Max items to return"),
    start_date: Optional[datetime] = Query(None, description="ISO 8601 lower bound (inclusive)"),
    end_date:   Optional[datetime] = Query(None, description="ISO 8601 upper bound (inclusive)"),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Return the Evidence Timeline for the authenticated student.

    Merges Moodle interaction events, grade records, and ML assessment history
    into a single chronological narrative that answers:
    *"Why did AcademIQ classify me as at risk?"*
    """
    user_id = str(user["_id"])
    try:
        result = build_timeline(
            academiq_user_id=user_id,
            course_id=course_id,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Timeline build failed: {exc}") from exc


@router.get("/courses/{course_id}/timeline", response_model=EvidenceTimelineResponse)
def get_course_timeline(
    course_id:  str,
    limit:      int = Query(100, ge=1, le=500),
    start_date: Optional[datetime] = Query(None),
    end_date:   Optional[datetime] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Course-scoped shorthand for the Evidence Timeline.

    Equivalent to GET /timeline?course_id={course_id}.
    Provided so the frontend can call it alongside the other
    /courses/{course_id}/... endpoints (performance, insights, materials).
    """
    user_id = str(user["_id"])
    try:
        result = build_timeline(
            academiq_user_id=user_id,
            course_id=course_id,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Timeline build failed: {exc}") from exc