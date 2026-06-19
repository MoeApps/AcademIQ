"""
Study-buddy recommender — near-peer matching within a course.

For the authenticated student, find up to k OTHER opted-in students in the same
course whose study pattern is closest, biased toward peers performing slightly
AHEAD (so they can actually help). Grounded in Vygotsky's Zone of Proximal
Development.

Algorithm (see recommend()):
    1. POOL    co-enrolled, opted-in, != target
    2. TIER    same risk cluster + the next-better one      (skipped if no model)
    3. OFFSET  0..+DELTA_MAX grade points ahead of target   (skipped if no grades)
    4. RANK    by behavioural distance (study-style), standardised within the pool
    5. RELAX   if fewer than k survive, loosen OFFSET then TIER (never randoms)
    6. RETURN  top k as {studentId, fullName, why} — grades are NEVER exposed

Data sources (already populated by the extension sync):
    co-enrolment  -> student_metrics            (metrics_repository)
    study pattern -> feature_vectors.features    (student_data._latest_features)
    performance   -> raw_moodle_payload.grades   (student_data._avg_percentage)
    risk cluster  -> models/grade_Risk_Model/risk_grade_model.pkl (optional)
    identity/opt-in -> users                     (user_repository)
"""

from typing import Any, Dict, List, Optional

import numpy as np

from app.repositories import metrics_repository, user_repository
from app.services import risk_grade_service, student_data

# Behavioural signals used for study-style distance.
_BEHAVIOUR = [
    "all_clicks", "active_days", "access_frequency", "material_clicks",
    "avg_quiz_score", "quiz_attempts", "avg_assignment_score",
    "assignment_submissions", "total_time_spent",
    "procrastination_index", "late_submission_count",
]

_RISK_RANK = {"High Risk": 0, "Medium Risk": 1, "Low Risk": 2}
DELTA_MIN, DELTA_MAX = 0.0, 15.0   # a buddy should be 0-15 grade points ahead


def _allowed_clusters(cluster: int) -> List[int]:
    """A student's own cluster plus the next-better one (by mean grade)."""
    rmap = risk_grade_service.risk_map()
    if cluster not in rmap:
        return [cluster]
    rank = _RISK_RANK.get(rmap[cluster], 0)
    wanted = {rank, min(rank + 1, 2)}
    return [c for c, label in rmap.items() if _RISK_RANK.get(label, 0) in wanted]


# ── Candidate assembly ───────────────────────────────────────────────────────

def _candidate(user_id: str, course_id: str) -> Optional[Dict[str, Any]]:
    feats = student_data._latest_features(user_id)
    if not feats:
        return None
    user = user_repository.find_by_id(user_id)
    if not user:
        return None
    grade = student_data._avg_percentage(student_data._grades(user_id), course_id)
    return {
        "user_id": user_id,
        "name": user.get("full_name") or "Student",
        "email": user.get("email", ""),
        "optin": bool(user.get("study_buddy_optin", False)),
        "vec": np.array([float(feats.get(c, 0) or 0) for c in _BEHAVIOUR]),
        "grade": grade,                      # may be None when no grades yet
        "cluster": risk_grade_service.cluster_of(feats),   # None when model offline
    }


def _rank_by_distance(target: Dict[str, Any], cands: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Closest study-style first, using z-scores computed within this pool so
    distance is meaningful regardless of raw feature scales."""
    if not cands:
        return []
    M = np.vstack([target["vec"]] + [c["vec"] for c in cands]).astype(float)
    mu, sd = M.mean(0), M.std(0)
    sd[sd == 0] = 1.0
    Z = (M - mu) / sd
    dists = np.linalg.norm(Z[1:] - Z[0], axis=1)
    return [cands[i] for i in np.argsort(dists)]


def _why(target: Dict[str, Any], cand: Dict[str, Any]) -> str:
    if target["grade"] is not None and cand["grade"] is not None:
        return ("similar study style, a bit ahead"
                if cand["grade"] - target["grade"] > 0
                else "similar level & study style")
    return "similar study style"


# ── Public entry point ───────────────────────────────────────────────────────

def recommend(target_user_id: str, course_id: str, k: int = 5) -> Dict[str, Any]:
    target = _candidate(target_user_id, course_id)
    if not target:
        return {"available": False,
                "reason": "No behavioural data for you in this course yet — sync the extension first.",
                "buddies": []}

    ids = [i for i in metrics_repository.list_user_ids_for_course(course_id)
           if i and i != target_user_id]
    cands = [c for c in (_candidate(i, course_id) for i in ids) if c and c["optin"]]
    if not cands:
        return {"available": True, "buddies": [],
                "reason": "No opted-in classmates are available in this course yet."}

    # 2) tier filter (only when clusters are available)
    if target["cluster"] is not None:
        allowed = _allowed_clusters(target["cluster"])
        cands = [c for c in cands if c["cluster"] in allowed] or cands

    # 3) near-peer offset + 5) progressive relaxation (only when grades known)
    pool = cands
    if target["grade"] is not None:
        ahead = [c for c in cands if c["grade"] is not None
                 and DELTA_MIN <= (c["grade"] - target["grade"]) <= DELTA_MAX]
        if len(ahead) >= k:
            pool = ahead
        else:  # relax: allow roughly-equal peers, never clearly-weaker ones
            pool = [c for c in cands
                    if c["grade"] is None or (c["grade"] - target["grade"]) >= -2] or cands

    # 4) rank by study-style distance, take top k
    picks = _rank_by_distance(target, pool)[:k]
    return {
        "available": True,
        "buddies": [
            {"studentId": p["user_id"], "fullName": p["name"],
             "email": p["email"], "why": _why(target, p)}
            for p in picks
        ],
    }
