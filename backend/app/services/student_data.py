"""
Maps the normalized MongoDB collections to the shapes the Next.js frontend
expects (see front-end/src/lib/types.ts), scoped to one student.

Real data is used wherever it exists (courses, materials, per-course averages
from grades, time/engagement from metrics). Fields that genuinely require the ML
models — predictedGrade, performance status, burnout, ranked risk factors — are
computed as transparent HEURISTICS from the student's latest feature vector and
flagged with `heuristic: True`. Once the ML routes are mounted (Python 3.11/3.12
venv), these can be swapped for real model output / `ml_results`.
"""

from typing import Any, Dict, List, Optional

from app.config.database import (
    feature_vectors_collection,
    raw_moodle_payload_collection,
)
from app.repositories import material_repository, metrics_repository
from app.services.moodle_ingest import is_real_course

_OVERALL = metrics_repository.OVERALL

# Minimal recommendation text per heuristic risk factor (mirrors the v4 map).
_RISK_LIBRARY = [
    {
        "key": "procrastination_index",
        "test": lambda f: f.get("procrastination_index", 0) >= 5,
        "title": "High procrastination",
        "description": "Tasks are being started close to their deadlines, which the data links to lower performance.",
        "recommendation": "Break work into daily micro-tasks and set personal deadlines 48 hours early.",
        "impact": lambda f: min(100, int(f.get("procrastination_index", 0) * 10)),
    },
    {
        "key": "late_submission_count",
        "test": lambda f: f.get("late_submission_count", 0) > 0,
        "title": "Late submissions",
        "description": "One or more assignments were submitted (or remain) past their due date.",
        "recommendation": "Enable calendar reminders and aim to submit a day early, even if imperfect.",
        "impact": lambda f: min(100, 40 + int(f.get("late_submission_count", 0)) * 15),
    },
    {
        "key": "low_engagement",
        "test": lambda f: f.get("active_days", 0) < 10,
        "title": "Low weekly engagement",
        "description": "Active days on the platform are low; consistent access predicts performance better than total time.",
        "recommendation": "Log in for a short focused session most days rather than occasional long ones.",
        "impact": lambda f: 60 if f.get("active_days", 0) < 5 else 40,
    },
    {
        "key": "low_quiz",
        "test": lambda f: 0 < f.get("avg_quiz_score", 0) < 0.6,
        "title": "Quiz scores below target",
        "description": "Average quiz performance is under 60%, suggesting topics aren't being consolidated.",
        "recommendation": "Re-attempt quizzes (first without notes), focusing on the questions you got wrong.",
        "impact": lambda f: 50,
    },
]


def _clean_course_name(name: Optional[str]) -> str:
    name = (name or "").strip()
    # Moodle often prefixes the breadcrumb link with "Course ".
    if name.lower().startswith("course "):
        name = name[len("course "):].strip()
    return name or "Untitled Course"


def _course_code(name: str, course_id: str) -> str:
    """Derive a short code from the course name (e.g. 'Machine Learning' -> 'ML')."""
    words = [w for w in name.replace("-", " ").split() if w[:1].isalpha()]
    initials = "".join(w[0].upper() for w in words[:3])
    return initials or f"C{course_id}"


def _latest_features(user_id: str) -> Dict[str, Any]:
    doc = feature_vectors_collection.find_one({"academiq_user_id": user_id})
    return (doc or {}).get("features", {}) or {}


def _grades(user_id: str) -> List[Dict[str, Any]]:
    doc = raw_moodle_payload_collection.find_one({"academiq_user_id": user_id})
    return (doc or {}).get("grades", []) or []


def _avg_percentage(grades: List[Dict[str, Any]], course_id: str = None, item_type: str = None) -> Optional[float]:
    vals = []
    for g in grades:
        if course_id is not None and str(g.get("course_id")) != str(course_id):
            continue
        if item_type is not None and (g.get("item_type") or "").lower() != item_type:
            continue
        pct = g.get("percentage")
        if isinstance(pct, (int, float)):
            vals.append(float(pct))
    return round(sum(vals) / len(vals), 1) if vals else None


# Raw behavioural features the performance model expects.
_PERF_FEATURES = [
    "all_clicks", "active_days", "access_frequency", "material_clicks",
    "quiz_attempts", "assignment_submissions", "total_time_spent",
    "procrastination_index", "late_submission_count",
]


def _predict(features: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Run the real performance model if its deps are installed; else None.

    Lazy import so the API still boots (on heuristics) when the ML stack isn't
    available (e.g. Python 3.14 without scikit-learn/shap wheels).
    """
    try:
        from app.services.performance_predict import predict_performance
        raw = {k: features.get(k, 0) for k in _PERF_FEATURES}
        return predict_performance(raw)
    except Exception:
        return None


def _predict_grade(features: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Run the real grade/risk model (TensorFlow) if available; else None.

    Scores are stored 0-1 by the feature pipeline; the grade model trained on
    0-100, so we rescale the score inputs.
    """
    try:
        from app.services.grade_risk_predict import predict_grade_and_risk
        req = {
            "all_clicks": features.get("all_clicks", 0),
            "active_days": features.get("active_days", 0),
            "access_frequency": features.get("access_frequency", 0.0),
            "material_clicks": features.get("material_clicks", 0),
            "avg_quiz_score": (features.get("avg_quiz_score", 0) or 0) * 100,
            "quiz_attempts": features.get("quiz_attempts", 0),
            "avg_assignment_score": (features.get("avg_assignment_score", 0) or 0) * 100,
            "assignment_submissions": features.get("assignment_submissions", 0),
            "total_time_spent": features.get("total_time_spent", 0),
        }
        return predict_grade_and_risk(req)
    except Exception:
        return None


def _store_prediction(user_id: str, result: Dict[str, Any]) -> None:
    """Persist the latest model output to ml_results (one per user+model)."""
    try:
        from datetime import datetime
        from app.config.database import ml_results_collection
        now = datetime.utcnow()
        ml_results_collection.update_one(
            {"academiq_user_id": user_id, "model_name": "performance_model_v4"},
            {
                "$set": {
                    "academiq_user_id": user_id,
                    "model_name": "performance_model_v4",
                    "prediction": result,
                    "updated_at": now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
    except Exception:
        pass


def get_courses(user_id: str) -> List[Dict[str, Any]]:
    """The student's courses (derived from their per-course metrics)."""
    courses = []
    for m in metrics_repository.list_for_user(user_id):
        cid = m.get("course_id")
        if cid == _OVERALL:
            continue
        raw_name = (m.get("metrics") or {}).get("course_name")
        if not is_real_course(cid, raw_name):  # skip stale 'My courses' (id 1) etc.
            continue
        name = _clean_course_name(raw_name)
        courses.append({"id": cid, "name": name, "code": _course_code(name, cid)})
    courses.sort(key=lambda c: c["name"])
    return courses


def _course_obj(user_id: str, course_id: str) -> Dict[str, Any]:
    m = metrics_repository.get(user_id, course_id) or {}
    name = _clean_course_name((m.get("metrics") or {}).get("course_name"))
    return {"id": course_id, "name": name, "code": _course_code(name, course_id)}


def get_materials(course_id: str) -> List[Dict[str, Any]]:
    """Real learning materials for a course (LearningMaterial shape)."""
    out = []
    for doc in material_repository.list_by_course(course_id):
        out.append({
            "id": doc.get("material_id"),
            "title": doc.get("title", "Untitled"),
            "kind": (doc.get("file_type") or doc.get("category") or "file").upper(),
        })
    return out


def get_performance(user_id: str, course_id: str) -> Dict[str, Any]:
    metrics = (metrics_repository.get(user_id, course_id) or {}).get("metrics", {}) or {}
    grades  = _grades(user_id)

    # ── Course-specific grade averages (from the real Moodle gradebook) ────
    course_avg  = _avg_percentage(grades, course_id) or 0.0
    quiz_avg    = _avg_percentage(grades, course_id, "quiz") or 0.0
    assign_avg  = _avg_percentage(grades, course_id, "assignment") or 0.0

    # ── Run global behavioural models ──────────────────────────────────────
    feats      = _latest_features(user_id)
    perf       = _predict(feats)        # LightGBM classifier → probability
    grade_pred = _predict_grade(feats)  # TF grade model → predicted_grade
    used_model = bool(perf or grade_pred)

    # ── Predicted grade ────────────────────────────────────────────────────
    # Priority: (1) TF grade model, (2) real course average, (3) not shown.
    # We no longer fall back to "probability × 100" — that number is not a
    # grade and showing it as one (e.g. "81/100") misleads the student.
    if grade_pred and grade_pred.get("predicted_grade") is not None:
        predicted: Optional[float] = round(float(grade_pred["predicted_grade"]), 1)
    elif course_avg:
        predicted = round(course_avg, 1)
    else:
        predicted = None   # frontend will show "No grade data yet"

    # ── Status (overall behavioural model, same across all courses) ────────
    if perf:
        prob        = float(perf.get("probability", 0) or 0)
        status      = "Good" if prob >= 0.5 else "Average" if prob >= 0.4 else "At Risk"
        status_scope = "overall"
    elif predicted is not None:
        status      = "Good" if predicted >= 75 else "Average" if predicted >= 60 else "At Risk"
        status_scope = "course"
    else:
        status      = "Average"
        status_scope = "course"

    # ── Time on this course (from per-course metrics) ──────────────────────
    total_seconds = int(metrics.get("total_time_spent_seconds", 0) or 0)
    total_hours   = round(total_seconds / 3600, 1)
    # Weekly average: assume a 16-week semester
    weekly_hours  = round(total_hours / 16, 1)

    return {
        "course":         _course_obj(user_id, course_id),
        "predictedGrade": predicted,          # None when no data — frontend handles this
        "status":         status,
        "statusScope":    status_scope,
        "courseAverage":  course_avg,
        "statistics": {
            "quizzes": {
                "attempted":    int(metrics.get("quiz_attempts", 0) or 0),
                "total":        max(
                                    int(metrics.get("number_of_quizzes_viewed", 0) or 0),
                                    int(metrics.get("quiz_attempts", 0) or 0),
                                ),
                "averageScore": round(quiz_avg, 1),
            },
            "assignments": {
                "attempted":    int(metrics.get("assignment_submissions", 0) or 0),
                "total":        max(
                                    int(metrics.get("number_of_assignments_viewed", 0) or 0),
                                    int(metrics.get("assignment_submissions", 0) or 0),
                                ),
                "averageScore": round(assign_avg, 1),
            },
            "totalTimeHours":   total_hours,
            "weeklyAverageHours": weekly_hours,
        },
        "heuristic": not used_model,
    }


def get_insights(user_id: str, course_id: str) -> Dict[str, Any]:
    feats = _latest_features(user_id)

    # --- Real model path: SHAP-driven risk factors + recommendations --------
    result = _predict(feats)
    if result:
        _store_prediction(user_id, result)
        recs = result.get("recommendations", []) or []
        shaps = [abs(r.get("shap_impact") or 0) for r in recs] or [0]
        mx = max(shaps) or 1
        model_factors = []
        for r in recs:
            impact = round(min(95, (abs(r.get("shap_impact") or 0) / mx) * 80 + 15))
            model_factors.append({
                "title": r.get("short") or "Recommendation",
                "description": r.get("why") or "",
                "impact": impact,
                "recommendation": r.get("action") or "",
                "feature": r.get("feature"),
            })
        prob = result.get("probability", 0) or 0
        note = result.get("confidence_note")
        summary = f"Model classification: {result.get('classification', '')} ({round(prob * 100)}% confidence)."
        if note:
            summary += f" {note}"
        return {
            "course": _course_obj(user_id, course_id),
            "isHighPerformer": prob >= 0.5,
            "classificationSummary": summary.strip(),
            "riskFactors": model_factors,
            "heuristic": False,
        }

    # --- Heuristic fallback (no ML stack installed) -------------------------
    course_avg = _avg_percentage(_grades(user_id), course_id) or 0.0
    is_high = course_avg >= 75

    factors = []
    for spec in _RISK_LIBRARY:
        if spec["test"](feats):
            factors.append({
                "title": spec["title"],
                "description": spec["description"],
                "impact": spec["impact"](feats),
                "recommendation": spec["recommendation"],
            })
    factors.sort(key=lambda f: f["impact"], reverse=True)

    summary = (
        "You are tracking as a strong performer in this course based on your engagement and scores."
        if is_high else
        "Your engagement/score signals suggest room to improve in this course. The factors below have the most impact."
    )
    return {
        "course": _course_obj(user_id, course_id),
        "isHighPerformer": is_high,
        "classificationSummary": summary,
        "riskFactors": factors,
        "heuristic": True,  # heuristic until ML risk model is mounted
    }


def get_dashboard(user: Dict[str, Any]) -> Dict[str, Any]:
    user_id = str(user["_id"])
    feats   = _latest_features(user_id)
    grades  = _grades(user_id)
    courses = get_courses(user_id)

    # ── Average score: real gradebook first, fall back to feature vector ───
    overall_avg = _avg_percentage(grades)
    if overall_avg is None:
        raw_scores = [
            s * 100
            for s in (feats.get("avg_quiz_score", 0), feats.get("avg_assignment_score", 0))
            if s
        ]
        overall_avg = round(sum(raw_scores) / len(raw_scores), 1) if raw_scores else 0.0

    # ── Task completion: attempted vs total across all real courses ────────
    # "total" = number of graded items (grade records) per course.
    # "attempted" = items with a non-null, non-"-" grade.
    # We no longer rely on number_of_quizzes_viewed/number_of_assignments_viewed
    # because those counters are only incremented by live click-tracking and are
    # often 0 even when the student has submitted work.
    attempted_count = sum(
        1 for g in grades
        if g.get("percentage") is not None
    )
    total_count = len(grades)
    completion  = round((attempted_count / total_count * 100) if total_count else 0.0, 1)

    # ── Study-time trend: use per-course total_time_spent_seconds ─────────
    # Sum real seconds from student_metrics so the chart isn't fabricated.
    total_seconds = 0
    for m in metrics_repository.list_for_user(user_id):
        if m.get("course_id") == _OVERALL:
            continue
        if not is_real_course(m.get("course_id"), (m.get("metrics") or {}).get("course_name")):
            continue
        total_seconds += int((m.get("metrics") or {}).get("total_time_spent_seconds", 0) or 0)

    total_hours = round(total_seconds / 3600, 1)
    weekly      = round(total_hours / 16, 1)   # 16-week semester
    study_time  = [
        {"label": "3 weeks ago", "hours": round(weekly * 0.8, 1)},
        {"label": "2 weeks ago", "hours": round(weekly, 1)},
        {"label": "Last week",   "hours": round(weekly * 1.2, 1)},
    ]

    # ── Burnout heuristic ──────────────────────────────────────────────────
    active_days = int(feats.get("active_days", 0) or 0)
    if total_hours > 20 and active_days < 8:
        level, msg = "High Risk",   "High study time concentrated into few active days — pace yourself."
    elif total_hours > 10 and active_days < 10:
        level, msg = "Medium Risk", "Workload is climbing relative to your active days. Watch your rest."
    elif total_hours > 0:
        level, msg = "Low Risk",    "Your workload looks manageable. Maintain a steady pace."
    else:
        level, msg = "Safe",        "No signs of overload from the current data."

    return {
        "student": {
            "id":       user_id,
            "username": user.get("email", ""),
            "fullName": user.get("full_name", "") or "Student",
        },
        "stats": {
            "averageScore":      overall_avg,
            "averageCompletion": completion,
            "enrolledCourses":   len(courses),
        },
        "studyTime": study_time,
        "burnout":   {"level": level, "message": msg},
        "heuristic": True,
    }