"""
Inference for the burnout model (models/burnout detection/burnout_model.pkl).

Bundle keys: model (XGBClassifier), preprocessor (imputer+scaler Pipeline),
feature_cols, threshold, log_cols, proc_clip. Loaded once, lazily; returns None
everywhere if the file or xgboost is missing so the dashboard falls back to the
heuristic.
"""

import os
from typing import Any, Dict, Optional

import numpy as np

_BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_PATH = os.path.join(_BASE, "models", "burnout detection", "burnout_model.pkl")

_bundle = None
_loaded = False

_MESSAGES = {
    "Safe":        "No signs of overload from your current activity.",
    "Low Risk":    "Your workload looks manageable. Keep a steady pace.",
    "Medium Risk": "Some early signs of strain — watch your rest and pacing.",
    "High Risk":   "High burnout risk detected — ease your workload and take breaks.",
}


def _get():
    global _bundle, _loaded
    if _loaded:
        return _bundle
    _loaded = True
    try:
        import joblib
        _bundle = joblib.load(_PATH)
        print("[OK] burnout model loaded.")
    except Exception as exc:
        print(f"[INFO] burnout model unavailable: {exc}")
        _bundle = None
    return _bundle


def available() -> bool:
    return _get() is not None


def _pct(v) -> float:
    # live feature vectors store scores as 0-1; the model trained on 0-100.
    v = float(v or 0)
    return v * 100 if 0 <= v <= 1 else v


def _risk_level(prob: float, threshold: float) -> str:
    if prob < threshold * 0.6:
        return "Safe"
    if prob < threshold:
        return "Low Risk"
    if prob < min(threshold + 0.2, 0.95):
        return "Medium Risk"
    return "High Risk"


def _row(b, feats: Dict[str, Any]) -> np.ndarray:
    ac   = float(feats.get("all_clicks", 0) or 0)
    ad   = float(feats.get("active_days", 0) or 0)
    mc   = float(feats.get("material_clicks", 0) or 0)
    tt   = float(feats.get("total_time_spent", 0) or 0)
    qa   = float(feats.get("quiz_attempts", 0) or 0)
    asub = float(feats.get("assignment_submissions", 0) or 0)
    late = float(feats.get("late_submission_count", 0) or 0)
    qs   = _pct(feats.get("avg_quiz_score"))
    asc  = _pct(feats.get("avg_assignment_score"))

    r = {
        "all_clicks": ac,
        "active_days": ad,
        "access_frequency": float(feats.get("access_frequency", 0) or 0),
        "material_clicks": mc,
        "avg_quiz_score": qs,
        "quiz_attempts": qa,
        "avg_assignment_score": asc,
        "assignment_submissions": asub,
        "total_time_spent": tt,
        "procrastination_index": float(feats.get("procrastination_index", 0) or 0),
        "late_submission_count": late,
        "clicks_per_day": ac / ad if ad > 0 else 0.0,
        "time_per_day": tt / ad if ad > 0 else 0.0,
        "time_per_click": tt / ac if ac > 0 else 0.0,
        "material_intensity": mc / ad if ad > 0 else 0.0,
        "quiz_rate": qa / ad if ad > 0 else 0.0,
        "late_ratio": late / asub if asub > 0 else 0.0,
        "quiz_performance": qs * float(np.log1p(qa)),
        "assignment_performance": asc * float(np.log1p(asub)),
    }
    for c in b["log_cols"]:
        r[c] = float(np.log1p(r[c]))
    lo, hi = b["proc_clip"]
    r["procrastination_index"] = min(max(r["procrastination_index"], lo), hi)
    return np.array([[r[c] for c in b["feature_cols"]]], dtype=float)


def _preprocess(b, x: np.ndarray) -> np.ndarray:
    # Apply the fitted pipeline, skipping the imputer: it only fills NaN, our
    # rows never contain NaN, and its pickle is incompatible across sklearn
    # 1.6.1 -> 1.9.0. The scaler step transforms identically either way.
    from sklearn.impute import SimpleImputer
    x = np.nan_to_num(x, nan=0.0)
    for _name, step in b["preprocessor"].steps:
        if isinstance(step, SimpleImputer):
            continue
        x = step.transform(x)
    return x


def predict(feats: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return {probability, level, at_risk, message}, or None if unavailable."""
    b = _get()
    if not b or not feats:
        return None
    try:
        x = _preprocess(b, _row(b, feats))
        prob = float(b["model"].predict_proba(x)[0, 1])
        threshold = float(b["threshold"])
        level = _risk_level(prob, threshold)
        return {
            "probability": round(prob, 3),
            "level": level,
            "at_risk": prob >= threshold,
            "message": _MESSAGES[level],
        }
    except Exception:
        return None
