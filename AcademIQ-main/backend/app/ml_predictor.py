"""
Load the risk clustering model (3 classes: 0=low, 1=medium, 2=high).
Feature order must match train_risk_model.py and FeaturesPayload.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional, Tuple

import joblib
import numpy as np

FEATURE_ORDER = [
    "total_time_spent",
    "active_days",
    "access_frequency",
    "avg_quiz_score",
    "quiz_score_std",
    "avg_assignment_score",
    "late_submission_ratio",
    "avg_final_grade",
]


def _models_dir() -> Path:
    # backend/app/ml_predictor.py -> backend/models
    return Path(__file__).resolve().parent.parent / "models"


def default_model_path() -> Path:
    override = os.getenv("RISK_MODEL_PATH")
    if override:
        return Path(override)
    return _models_dir() / "risk_model.pkl"


_model: Any = None
_load_error: Optional[str] = None


def load_risk_model():
    global _model, _load_error
    if _model is not None:
        return _model
    path = default_model_path()
    if not path.is_file():
        _load_error = f"No model file at {path}. Run: python backend/scripts/train_risk_model.py"
        return None
    try:
        _model = joblib.load(path)
        _load_error = None
        return _model
    except Exception as e:
        _load_error = str(e)
        return None


def predict_risk_cluster(features: dict) -> Tuple[int, Optional[str]]:
    """
    Returns (cluster 0..2, error_message_if_fallback).
    If the model file is missing, uses a deterministic heuristic fallback.
    """
    model = load_risk_model()
    X = np.array([[float(features.get(k, 0.0)) for k in FEATURE_ORDER]])

    if model is not None:
        try:
            y = int(model.predict(X)[0])
            return max(0, min(2, y)), None
        except Exception as e:
            return _heuristic_cluster(features), f"model inference failed ({e}); used heuristic"

    return _heuristic_cluster(features), _load_error or "model not loaded; used heuristic"


def _heuristic_cluster(features: dict) -> int:
    """Rule-based fallback when .pkl is absent (demo-safe)."""
    grade = float(features.get("avg_final_grade", 0.0))
    late = float(features.get("late_submission_ratio", 0.0))
    quiz = float(features.get("avg_quiz_score", 0.0))
    score = grade * 0.5 + quiz * 0.25 + (1.0 - late) * 0.25
    if score >= 0.65:
        return 0
    if score >= 0.4:
        return 1
    return 2
