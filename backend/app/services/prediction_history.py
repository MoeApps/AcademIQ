# backend/app/services/prediction_history.py
"""
Prediction history tracking and trend explanation.

Owns both sides of "probability over time": the write path that appends a
snapshot to ml_results_history every time a fresh prediction is stored (with
near-duplicate dedup and a per-user entry cap), and the read path that
serves the history list and the one-sentence trend explanation.

This is additive and entirely separate from ml_results: ml_results is
upsert-by-(academiq_user_id, model_name) and structurally holds only the
latest snapshot — every existing reader (get_insights, get_performance,
ml_result.py) depends on that shape and is untouched by this module.

Design note: the write-side dedup/cap logic was originally specified to live
inline inside student_data._store_prediction(). It lives here instead, with
_store_prediction() reduced to a single delegating call into
record_prediction(). All "history" concerns — write and read — stay
cohesive in one module rather than being split across two files. This was a
deliberate choice, not an oversight; see the PR/commit notes if you want the
literal-inline version instead.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from app.config.database import ml_results_history_collection
from app.schema.counterfactual_schema import friendly_label

MODEL_NAME = "performance_model_v4"

# Minimum probability movement to count as a meaningful change. Below this,
# a new snapshot is treated as a near-duplicate of the last one (e.g. a
# re-sync with no new behavioural data) and is not recorded — otherwise
# repeated page loads/syncs would flood history with identical points.
# Reused for trend classification too, so "what counts as a real change" is
# consistent between what gets recorded and what gets reported.
CHANGE_THRESHOLD = 0.01

MAX_HISTORY_PER_USER = 30


def _shap_map_from_result(result: Dict[str, Any]) -> Dict[str, float]:
    """
    Build {feature: shap_impact} from the recommendations the performance
    model already computed. No extra SHAP computation happens here — this
    reuses values predict_performance() already produced for the
    recommendations list.
    """
    recs = result.get("recommendations", []) or []
    return {r["feature"]: r.get("shap_impact", 0.0) for r in recs if r.get("feature")}


def record_prediction(
    academiq_user_id: str,
    result: Dict[str, Any],
    model_name: str = MODEL_NAME,
) -> None:
    """
    Append a history snapshot for this prediction, unless it's a
    near-duplicate of the most recent recorded entry (probability moved by
    less than CHANGE_THRESHOLD). Caps history at MAX_HISTORY_PER_USER
    entries per user by deleting the oldest overflow after inserting.

    Scoped by model_name so a second model writing history later (e.g. a
    grade/risk model) can't interleave with this one's probability series
    and corrupt the trend comparison.

    Never raises for ordinary "nothing to record" conditions (missing
    probability, near-duplicate). The caller (student_data._store_prediction)
    also wraps this call in its own try/except, so an unexpected failure
    here can never break the primary "latest prediction" write.
    """
    probability = result.get("probability")
    if probability is None:
        return  # nothing meaningful to chart

    last = ml_results_history_collection.find_one(
        {"academiq_user_id": academiq_user_id, "model_name": model_name},
        sort=[("recorded_at", -1)],
    )
    if last is not None and abs(last.get("probability", 0.0) - probability) < CHANGE_THRESHOLD:
        return

    ml_results_history_collection.insert_one({
        "academiq_user_id": academiq_user_id,
        "model_name": model_name,
        "probability": probability,
        "classification": result.get("classification"),
        "top_negative_drivers": result.get("top_negative_drivers", []),
        "shap_map": _shap_map_from_result(result),
        "recorded_at": datetime.utcnow(),
    })

    # Cap at MAX_HISTORY_PER_USER entries per user — delete the oldest
    # beyond that. A few extra round trips per write, but each query is
    # scoped to a single user's small (<= MAX_HISTORY_PER_USER + 1) document
    # set, so the cost stays negligible even at "thousands of students" scale.
    total = ml_results_history_collection.count_documents(
        {"academiq_user_id": academiq_user_id, "model_name": model_name}
    )
    overflow = total - MAX_HISTORY_PER_USER
    if overflow > 0:
        stale_ids = [
            doc["_id"]
            for doc in ml_results_history_collection.find(
                {"academiq_user_id": academiq_user_id, "model_name": model_name},
                {"_id": 1},
                sort=[("recorded_at", 1)],
                limit=overflow,
            )
        ]
        if stale_ids:
            ml_results_history_collection.delete_many({"_id": {"$in": stale_ids}})


def get_history(
    academiq_user_id: str,
    limit: int = MAX_HISTORY_PER_USER,
    model_name: str = MODEL_NAME,
) -> List[Dict[str, Any]]:
    """
    Return up to `limit` of this user's most recent history entries,
    oldest-to-newest, so a frontend chart can plot left-to-right
    chronologically.
    """
    docs = list(
        ml_results_history_collection.find(
            {"academiq_user_id": academiq_user_id, "model_name": model_name}
        )
        .sort("recorded_at", -1)
        .limit(limit)
    )
    docs.reverse()
    return docs


def get_trend_summary(
    academiq_user_id: str,
    model_name: str = MODEL_NAME,
) -> Dict[str, Any]:
    """
    Compare the two most recent history entries and generate a one-sentence
    explanation of what changed and why, using SHAP deltas.

    Returns {"hasEnoughData": False} — not an error — when fewer than two
    entries exist yet. This is an expected state for new students; a trend
    is never fabricated from a single data point.
    """
    recent = list(
        ml_results_history_collection.find(
            {"academiq_user_id": academiq_user_id, "model_name": model_name}
        )
        .sort("recorded_at", -1)
        .limit(2)
    )

    if len(recent) < 2:
        return {"hasEnoughData": False}

    latest, previous = recent[0], recent[1]
    from_p = float(previous.get("probability", 0.0))
    to_p = float(latest.get("probability", 0.0))
    delta = to_p - from_p

    if delta > CHANGE_THRESHOLD:
        direction = "improving"
    elif delta < -CHANGE_THRESHOLD:
        direction = "declining"
    else:
        direction = "stable"

    summary = _build_summary(direction, from_p, to_p, previous, latest)

    return {
        "hasEnoughData": True,
        "direction": direction,
        "deltaProbability": round(delta, 3),
        "summary": summary,
        "fromProbability": round(from_p, 3),
        "toProbability": round(to_p, 3),
        "fromDate": previous.get("recorded_at"),
        "toDate": latest.get("recorded_at"),
    }


def _build_summary(
    direction: str,
    from_p: float,
    to_p: float,
    previous: Dict[str, Any],
    latest: Dict[str, Any],
) -> str:
    """
    One-sentence explanation: "probability moved from X% to Y%, driven
    mainly by the features whose SHAP contribution swung the most."

    Ranks by the signed change in SHAP value (curr - prev) between the two
    snapshots — that's what actually explains the probability MOVEMENT,
    as opposed to whichever feature simply has the largest SHAP magnitude
    right now. Phrased as "a stronger contribution from X" / "a smaller
    drag from Y" rather than claiming the student's raw behaviour increased
    or decreased: only SHAP values are stored in history (not the raw
    feature vector), so a literal "you did more quizzes" claim can't be
    verified from this data alone.
    """
    prev_shap: Dict[str, float] = previous.get("shap_map", {}) or {}
    curr_shap: Dict[str, float] = latest.get("shap_map", {}) or {}

    deltas = [
        (feat, curr_shap.get(feat, 0.0) - prev_shap.get(feat, 0.0))
        for feat in set(prev_shap) | set(curr_shap)
    ]
    deltas.sort(key=lambda d: -abs(d[1]))
    top = [d for d in deltas if abs(d[1]) > 1e-6][:2]

    verb = (
        "rose" if direction == "improving"
        else "fell" if direction == "declining"
        else "stayed steady"
    )
    base = f"Your performance probability {verb} from {round(from_p * 100)}% to {round(to_p * 100)}%"

    if not top:
        return base + "."

    phrases = []
    for feat, shap_delta in top:
        label = friendly_label(feat).lower()
        phrases.append(
            f"a stronger contribution from {label}"
            if shap_delta > 0
            else f"a smaller drag from {label}"
        )
    return f"{base}, driven mainly by {' and '.join(phrases)}."