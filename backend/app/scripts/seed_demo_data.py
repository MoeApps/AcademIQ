"""
Seed a realistic behavioural/academic profile for a single student so the
frontend (dashboard, performance, insights, ML result) renders believable
numbers during testing — without needing a live Moodle sync.

It writes the same collections a real extension sync would populate:
    student_metrics            (per-course engagement + _overall aggregate)
    raw_moodle_payload_*       (gradebook rows with real percentages)
    feature_vectors            (the behavioural feature vector)
    ml_results                 (a realistic performance-model prediction)

Idempotent: re-running overwrites the same documents (keyed by user/course).

Usage (from backend/):
    python -m app.scripts.seed_demo_data                       # default email
    python -m app.scripts.seed_demo_data student@x.edu          # any account
"""

import sys
from datetime import datetime, timedelta, timezone

from app.config.database import (
    feature_vectors_collection,
    ml_results_collection,
    raw_moodle_payload_collection,
)
from app.repositories import metrics_repository, user_repository

DEFAULT_EMAIL = "khaled2112180@miuegypt.edu.eg"

# (course_id, name, time_seconds, quiz_attempts, quizzes_viewed,
#  assign_subs, assign_viewed, active_days, clicks, resources, visits)
COURSES = [
    ("668", "Foundation of Natural Language Processing - 26S", 100800, 6, 8, 5, 6, 26, 240, 52, 58),
    ("808", "Designing Intelligent Agents - 26S",               79200, 5, 6, 4, 5, 22, 190, 40, 46),
    ("669", "Senior Project in Computer Science - 26S",         64800, 0, 0, 3, 3, 18, 120, 30, 32),
    ("919", "Entrepreneurship and Innovation - 26S",            43200, 3, 4, 3, 4, 14,  95, 22, 26),
    ("920", "Professional Ethics - 26S",                        32400, 2, 3, 2, 3, 11,  70, 16, 20),
]

# Per-course gradebook: (item_name, item_type, percentage). None = not graded yet.
GRADES_BY_COURSE = {
    "668": [
        ("Quiz 1 - Tokenization",      "quiz",       88.0),
        ("Quiz 2 - Language Models",   "quiz",       82.0),
        ("Assignment 1 - N-grams",     "assignment", 90.0),
        ("Assignment 2 - POS Tagging", "assignment", 84.0),
        ("Midterm Exam",               "quiz",       80.0),
        ("Assignment 3 - Transformers","assignment", None),
    ],
    "808": [
        ("Quiz 1 - Search Agents",     "quiz",       79.0),
        ("Quiz 2 - Planning",          "quiz",       83.0),
        ("Assignment 1 - A* Agent",    "assignment", 86.0),
        ("Assignment 2 - Q-Learning",  "assignment", 74.0),
        ("Midterm Exam",               "quiz",       78.0),
    ],
    "669": [
        ("Proposal Defence",           "assignment", 90.0),
        ("Progress Report 1",          "assignment", 88.0),
        ("Progress Report 2",          "assignment", 86.0),
    ],
    "919": [
        ("Quiz 1 - Lean Canvas",       "quiz",       76.0),
        ("Assignment 1 - Pitch Deck",  "assignment", 81.0),
        ("Assignment 2 - Market Study","assignment", 77.0),
        ("Group Presentation",         "quiz",       None),
    ],
    "920": [
        ("Quiz 1 - Ethical Frameworks","quiz",       85.0),
        ("Assignment 1 - Case Study",  "assignment", 82.0),
        ("Final Reflection",           "assignment", 84.0),
    ],
}


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _iso(days_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


def seed(email: str) -> None:
    user = user_repository.find_by_email(email)
    if not user:
        print(f"❌ No user with email {email}. Aborting.")
        sys.exit(1)

    uid = str(user["_id"])
    student_id = user.get("student_id") or f"stu_{uid[:8]}"
    now = _utcnow()

    # ── 1. Per-course metrics + grades ────────────────────────────────────────
    grades: list[dict] = []
    course_blocks: list[dict] = []
    total_seconds = total_clicks = total_resources = 0
    total_quiz_attempts = total_assign_subs = 0

    for (cid, name, secs, qa, qv, asub, av, ad, clicks, res, visits) in COURSES:
        metrics = {
            "course_id": cid,
            "course_name": name,
            "total_time_spent_seconds": secs,
            "total_visits": visits,
            "click_count": clicks,
            "active_days_count": ad,
            "number_of_resources_clicked": res,
            "number_of_quizzes_viewed": qv,
            "number_of_assignments_viewed": av,
            "quiz_attempts": qa,
            "assignment_submissions": asub,
            "last_access_time": _iso(2),
        }
        metrics_repository.upsert(uid, cid, metrics)
        course_blocks.append(metrics)

        total_seconds += secs
        total_clicks += clicks
        total_resources += res
        total_quiz_attempts += qa
        total_assign_subs += asub

        for (item_name, item_type, pct) in GRADES_BY_COURSE.get(cid, []):
            graded = pct is not None
            grades.append({
                "course_id": cid,
                "item_name": item_name,
                "item_type": item_type,
                "grade": f"{pct:.2f}" if graded else "-",
                "max_grade": "0–100",
                "percentage": pct,
                "submission_status": "submitted" if graded else None,
                "submission_time": _iso(7) if graded else None,
            })

    # ── 2. Overall behavioural aggregate ─────────────────────────────────────
    overall_active_days = 34
    metrics_repository.upsert(uid, metrics_repository.OVERALL, {
        "active_days_count": overall_active_days,
        "average_session_duration": 612.5,
        "clicks_per_session": 4.1,
        "peak_activity_hours": [10, 14, 21],
        "total_time_spent_seconds": total_seconds,
        "total_visits": sum(c["total_visits"] for c in course_blocks),
        "click_count": total_clicks,
    })

    # ── 3. Feature vector (drives heuristic insights + burnout) ──────────────
    features = {
        "student_id": student_id,
        "total_time_spent": total_seconds,
        "active_days": overall_active_days,
        "access_frequency": 0.62,
        "all_clicks": total_clicks,
        "material_clicks": total_resources,
        "avg_quiz_score": 0.83,
        "quiz_attempts": total_quiz_attempts,
        "avg_assignment_score": 0.85,
        "assignment_submissions": total_assign_subs,
        "late_submission_count": 1,
        "procrastination_index": 3.2,
        "final_grade": 0.0,
        "risk_cluster": 1,
    }
    feature_vectors_collection.update_one(
        {"academiq_user_id": uid},
        {"$set": {
            "academiq_user_id": uid,
            "student_id": student_id,
            "features": features,
            "updated_at": now,
        }, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    # ── 4. Raw Moodle payload (grades source) ────────────────────────────────
    raw_moodle_payload_collection.update_one(
        {"academiq_user_id": uid},
        {"$set": {
            "academiq_user_id": uid,
            "student": {"student_id": student_id, "full_name": user.get("full_name", "")},
            "courses": course_blocks,
            "grades": grades,
            "metricsByCourse": {c["course_id"]: c for c in course_blocks},
            "behavior": {"active_days": overall_active_days, "all_clicks": total_clicks},
            "updated_at": now,
        }, "$setOnInsert": {"created_at": now, "sync_count": 1}},
        upsert=True,
    )

    # ── 5. ML result (the /api/ml/result AI prediction) ──────────────────────
    prediction = {
        "probability": 0.78,
        "classification": "High Performer",
        "tier": "On Track ✅",
        "confidence_note": "Strong, consistent engagement across most courses.",
        "top_negative_drivers": ["late_submission_count", "procrastination_index"],
        "recommendations": [
            {
                "icon": "⏰",
                "short": "Submit a little earlier",
                "action": "Aim to submit assignments a day before the deadline.",
                "why": "One late submission this term slightly lowered your trajectory.",
                "feature": "late_submission_count",
                "shap_impact": -0.42,
                "your_value": 1,
                "median_value": 0.0,
            },
            {
                "icon": "📅",
                "short": "Keep your study days spread out",
                "action": "Maintain short sessions across the week rather than long crammed ones.",
                "why": "Spaced practice protects long-term retention before finals.",
                "feature": "procrastination_index",
                "shap_impact": -0.21,
                "your_value": 3.2,
                "median_value": 2.5,
            },
        ],
        "shap_map": {
            "assignment_submissions": 2.10,
            "avg_quiz_score": 1.35,
            "active_days": 1.12,
            "quiz_attempts": 0.74,
            "material_clicks": 0.31,
            "late_submission_count": -0.42,
            "procrastination_index": -0.21,
        },
    }
    ml_results_collection.update_one(
        {"academiq_user_id": uid, "model_name": "performance_model_v4"},
        {"$set": {
            "academiq_user_id": uid,
            "student_id": student_id,
            "model_name": "performance_model_v4",
            "prediction": prediction,
            "input_features_snapshot": features,
            "updated_at": now,
        }, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    graded = [g for g in grades if g["percentage"] is not None]
    avg = round(sum(g["percentage"] for g in graded) / len(graded), 1)
    print(f"✅ Seeded realistic profile for {email}")
    print(f"   Courses:        {len(COURSES)}")
    print(f"   Graded items:   {len(graded)}/{len(grades)}  (avg {avg}%)")
    print(f"   Total study:    {round(total_seconds/3600, 1)} h")
    print(f"   ML prediction:  {prediction['classification']} ({int(prediction['probability']*100)}%)")


if __name__ == "__main__":
    seed(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EMAIL)
