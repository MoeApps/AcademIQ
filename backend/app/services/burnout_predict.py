# backend/app/services/burnout_predict.py
"""
Burnout risk inference using the Random Forest trained in ai/Burnoutdetection.

Artifacts live in models/burnout_model/:
  model.pkl, scaler.pkl, selected_features.pkl, all_features.pkl, feature_medians.pkl
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

import joblib
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODEL_DIR = os.path.join(BASE_DIR, "models", "burnout_model")

ALL_FEATURES = [
    "all_clicks",
    "active_days",
    "access_frequency",
    "material_clicks",
    "avg_quiz_score",
    "quiz_attempts",
    "avg_assignment_score",
    "assignment_submissions",
    "total_time_spent",
    "procrastination_index",
    "late_submission_count",
    "spike_count",
    "crash_count",
    "decline_weeks",
    "avg_instability",
    "max_instability",
]

LEVEL_MESSAGES = {
    "High Risk": (
        "Your activity patterns indicate a high burnout risk — reduce cramming, "
        "sleep regularly, and break work into smaller daily sessions."
    ),
    "Medium Risk": (
        "Workload is building faster than your recovery. Spread study time across "
        "more days and watch for fatigue."
    ),
    "Low Risk": (
        "Mild stress signals detected. Maintain a steady pace and avoid last-minute "
        "marathon sessions."
    ),
    "Safe": (
        "No significant burnout signals from your current Moodle activity data."
    ),
}

_artifacts: Dict[str, Any] | None = None


def _load(path: str):
    full = os.path.join(MODEL_DIR, path)
    if not os.path.isfile(full):
        raise FileNotFoundError(full)
    return joblib.load(full)


def _ensure_loaded() -> None:
    global _artifacts
    if _artifacts is not None:
        return
    _artifacts = {
        "model": _load("model.pkl"),
        "scaler": _load("scaler.pkl"),
        "selected": _load("selected_features.pkl"),
        "all_features": _load("all_features.pkl"),
        "medians": _load("feature_medians.pkl"),
    }


def available() -> bool:
    try:
        _ensure_loaded()
        return True
    except Exception:
        return False


def _risk_level(probability: float) -> str:
    if probability >= 0.80:
        return "High Risk"
    if probability >= 0.55:
        return "Medium Risk"
    if probability >= 0.30:
        return "Low Risk"
    return "Safe"


def _to_model_row(features: Dict[str, Any], medians: Dict[str, float]) -> Dict[str, float]:
    """Map stored feature vector → model input row (0–100 scores, training medians)."""
    row: Dict[str, float] = {}
    for key in ALL_FEATURES:
        raw = features.get(key, medians.get(key, 0.0))
        if raw is None:
            raw = medians.get(key, 0.0)
        value = float(raw)
        if key in ("avg_quiz_score", "avg_assignment_score") and value <= 1.0:
            # Feature pipeline stores grades 0–1; the burnout model trained on 0–100.
            value *= 100.0
        row[key] = value
    return row


def predict_burnout(features: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Run burnout inference on a student's latest feature dict.

    Returns {level, message, probability, heuristic: False} or None if the
    model/artifacts cannot be loaded.
    """
    try:
        _ensure_loaded()
    except Exception:
        return None

    assert _artifacts is not None
    medians = _artifacts["medians"]
    row = _to_model_row(features, medians)

    all_features = _artifacts["all_features"]
    X = np.array([[row[f] for f in all_features]], dtype=float)
    X_scaled = _artifacts["scaler"].transform(X)

    selected = _artifacts["selected"]
    idx = [all_features.index(f) for f in selected]
    X_sel = X_scaled[:, idx]

    prob = float(_artifacts["model"].predict_proba(X_sel)[0, 1])
    level = _risk_level(prob)

    return {
        "level": level,
        "message": LEVEL_MESSAGES[level],
        "probability": round(prob, 4),
        "heuristic": False,
    }
