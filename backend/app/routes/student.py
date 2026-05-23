"""
student.py — Dashboard and insights endpoints using MongoDB 16‑feature vectors.
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List, Dict, Any
from datetime import datetime
import statistics

from config.database import feature_vectors_collection

router = APIRouter(prefix="/api/student", tags=["Student"])


# ── Mock data (same as old mockData.ts) ───────────────────────────────────────
_MOCK_WEEKLY = [
    {"date": "Mon", "score": 72},
    {"date": "Tue", "score": 78},
    {"date": "Wed", "score": 85},
    {"date": "Thu", "score": 82},
    {"date": "Fri", "score": 88},
    {"date": "Sat", "score": 90},
    {"date": "Sun", "score": 85},
]

_MOCK_PREDICTIONS = [
    {"courseId": "cs101",   "courseName": "Introduction to Programming", "score": 89, "trend": "up"},
    {"courseId": "cs201",   "courseName": "Data Structures",             "score": 78, "trend": "up"},
    {"courseId": "cs301",   "courseName": "Database",                    "score": 66, "trend": "down"},
    {"courseId": "cs401",   "courseName": "Software Engineering",        "score": 92, "trend": "up"},
    {"courseId": "math201", "courseName": "Linear Algebra",              "score": 81, "trend": "flat"},
    {"courseId": "eng101",  "courseName": "English",                     "score": 88, "trend": "up"},
]

_MOCK_ENGAGEMENT = [
    {"day": "Mon", "hours": 2.1},
    {"day": "Tue", "hours": 2.4},
    {"day": "Wed", "hours": 2.0},
    {"day": "Thu", "hours": 3.5},
    {"day": "Fri", "hours": 3.8},
    {"day": "Sat", "hours": 2.5},
    {"day": "Sun", "hours": 2.8},
]

_MOCK_PROGRESS = [
    {"week": "W1", "engagement": 55, "quiz": 60, "predicted": 62},
    {"week": "W2", "engagement": 60, "quiz": 65, "predicted": 66},
    {"week": "W3", "engagement": 68, "quiz": 70, "predicted": 71},
    {"week": "W4", "engagement": 72, "quiz": 75, "predicted": 76},
    {"week": "W5", "engagement": 78, "quiz": 80, "predicted": 81},
    {"week": "W6", "engagement": 82, "quiz": 84, "predicted": 85},
    {"week": "W7", "engagement": 85, "quiz": 88, "predicted": 87},
    {"week": "W8", "engagement": 88, "quiz": 90, "predicted": 89},
]

_MOCK_TIMELINE = [
    {"week": "Week 1", "text": "Improve quiz participation",                 "tone": "warning"},
    {"week": "Week 2", "text": "Submit assignments on time",                 "tone": "warning"},
    {"week": "Week 3", "text": "Engagement improved by 15%",                "tone": "success"},
    {"week": "Week 4", "text": "Quiz accuracy trending upward",             "tone": "success"},
    {"week": "Week 5", "text": "Student behavior becoming more consistent", "tone": "success"},
    {"week": "Week 6", "text": "Maintain current weekly pace",              "tone": "info"},
]

_MOCK_RECOMMENDATIONS = [
    {"title": "Review lecture materials regularly", "description": "Spend 30 minutes daily revisiting recent lectures.",   "priority": "High"},
    {"title": "Start assignments earlier",          "description": "Begin work within 48 hours of assignment release.",    "priority": "High"},
    {"title": "Practice more quizzes",              "description": "Take at least two practice quizzes per week.",         "priority": "Medium"},
    {"title": "Increase study consistency",         "description": "Maintain a steady weekly study schedule.",             "priority": "Medium"},
    {"title": "Maintain current engagement",        "description": "Keep up your participation in discussions.",           "priority": "Low"},
]

# ── Helper functions ──────────────────────────────────────────────────────────

def _overall_status(avg_score: float) -> str:
    if avg_score < 70:
        return "At Risk"
    if avg_score < 85:
        return "Good"
    return "Perfect"

def _burnout(engagement_hours: List[float]) -> bool:
    if not engagement_hours:
        return False
    avg = sum(engagement_hours) / len(engagement_hours)
    return max(engagement_hours) > avg * 2

def _get_latest_features(student_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve the most recent feature vector for a student from MongoDB."""
    doc = feature_vectors_collection.find_one(
        {"student_id": student_id},
        sort=[("created_at", -1)]
    )
    if doc:
        return doc.get("features", {})
    return None

# ── Dashboard endpoint ────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(student_id: str):   # TODO: replace with auth later
    """
    Return frontend-ready dashboard data using stored feature vectors.
    - If real features exist → scale mock engagement hours to match actual study hours.
    - Otherwise → return full mock data.
    """
    features = _get_latest_features(student_id)

    if features:
        # Real data path
        avg_quiz = float(features.get("avg_quiz_score", 83.0))
        total_time_spent_ms = float(features.get("total_time_spent", 0))
        active_days = max(int(features.get("active_days", 7)), 1)

        # Scale mock engagement hours to real average daily hours
        real_avg_hours = (total_time_spent_ms / 3_600_000) / active_days if total_time_spent_ms > 0 else 0
        mock_avg = sum(d["hours"] for d in _MOCK_ENGAGEMENT) / len(_MOCK_ENGAGEMENT)
        scale = (real_avg_hours / mock_avg) if (mock_avg > 0 and real_avg_hours > 0) else 1.0
        scale = max(0.3, min(scale, 3.0))

        engagement = [
            {"day": d["day"], "hours": round(d["hours"] * scale, 1)}
            for d in _MOCK_ENGAGEMENT
        ]
        data_source = "live"
        overall_avg = avg_quiz
    else:
        # Mock data path
        avg_quiz = 83.0
        engagement = _MOCK_ENGAGEMENT
        data_source = "mock"
        overall_avg = avg_quiz

    hours_list = [d["hours"] for d in engagement]
    burnout_risk = _burnout(hours_list)

    return {
        "student_id": student_id,
        "username": f"student_{student_id}",   # placeholder, replace with real name from auth
        "data_source": data_source,
        "avg_score": round(overall_avg, 1),
        "overall_status": _overall_status(overall_avg),
        "weekly_performance": _MOCK_WEEKLY,
        "course_predictions": _MOCK_PREDICTIONS,
        "study_engagement": engagement,
        "burnout_risk": burnout_risk,
        "quick_stats": {
            "enrolled_courses": 6,
            "pending_tasks": 8,
            "upcoming_quizzes": 3,
        },
    }


# ── Insights endpoint (ML placeholder – no model yet) ─────────────────────────

@router.get("/insights")
async def get_insights(student_id: str):
    """
    Return ML‑ready insights using feature vector.
    For now, returns mock insights until ML model is connected.
    Replace the ML part when you integrate your model.
    """
    features = _get_latest_features(student_id)

    if features:
        # Extract some of the 16 features for display
        avg_quiz = float(features.get("avg_quiz_score", 0))
        late_ratio = float(features.get("late_submission_ratio", 0))
        active_days = int(features.get("active_days", 0))
        procrastination = float(features.get("procrastination_index", 0))
        data_source = "live"

        # Derive simple strengths/weaknesses from features
        strengths = []
        weaknesses = []

        if late_ratio < 0.15:
            strengths.append("Consistent on-time assignment submissions")
        if avg_quiz >= 80.0:
            strengths.append("Strong quiz performance across modules")
        if active_days >= 15:
            strengths.append("High activity and consistent engagement")
        if not strengths:
            strengths.append("Consistent attendance in live sessions")

        if late_ratio > 0.25:
            weaknesses.append("Late assignment submissions above average")
        if avg_quiz < 70.0:
            weaknesses.append("Quiz performance needs improvement")
        if active_days < 10:
            weaknesses.append("Inconsistent weekly study behavior")
        if procrastination > 5.0:
            weaknesses.append("High procrastination index – start tasks earlier")
        if not weaknesses:
            weaknesses.append("Low interaction with reading materials")

        # Placeholder ML outputs (replace with real model later)
        pass_probability = 0.72
        risk_level = "LOW"
        engagement_score = 0.5
        classification = "Average Performer"
        confidence = 72

        if avg_quiz >= 80:
            classification = "High Performer"
            confidence = min(99, int(avg_quiz))
        elif avg_quiz < 60:
            classification = "At Risk"
            confidence = min(99, int(100 - avg_quiz))

    else:
        # Mock path
        data_source = "mock"
        strengths = ["Consistent attendance", "Good quiz performance"]
        weaknesses = ["Late submissions", "Low engagement some weeks"]
        pass_probability = 0.72
        risk_level = "LOW"
        engagement_score = 0.5
        classification = "Average Performer"
        confidence = 72
        avg_quiz = 83.0

    return {
        "student_id": student_id,
        "data_source": data_source,
        "classification": classification,
        "confidence": confidence,
        "pass_probability": pass_probability,
        "risk_level": risk_level,
        "engagement_score": engagement_score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": _MOCK_RECOMMENDATIONS,
        "progress_data": _MOCK_PROGRESS,
        "timeline": _MOCK_TIMELINE,
    }