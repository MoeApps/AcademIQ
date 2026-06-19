"""
Inference for the clustering + grade model (models/grade_Risk_Model/risk_grade_model.pkl).

Bundle keys: scaler, kmeans, rf_cluster, grade_reg, risk_map, feature_cols,
n_clusters, log_cols, proc_clip. Loaded once, lazily; returns None everywhere
if the file or xgboost is missing so the API stays up on heuristics.
"""

import os
from typing import Any, Dict, Optional

import numpy as np

_BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_PATH = os.path.join(_BASE, "models", "grade_Risk_Model", "risk_grade_model.pkl")

_bundle = None
_loaded = False


def _get():
    global _bundle, _loaded
    if _loaded:
        return _bundle
    _loaded = True
    try:
        import joblib
        _bundle = joblib.load(_PATH)
        print("[OK] risk/grade model loaded.")
    except Exception as exc:
        print(f"[INFO] risk/grade model unavailable: {exc}")
        _bundle = None
    return _bundle


def available() -> bool:
    return _get() is not None


def _pct(v) -> float:
    # live feature vectors store scores as 0-1; the model trained on 0-100.
    v = float(v or 0)
    return v * 100 if 0 <= v <= 1 else v


def _row(b, feats: Dict[str, Any]) -> np.ndarray:
    r = {
        "all_clicks": float(feats.get("all_clicks", 0) or 0),
        "active_days": float(feats.get("active_days", 0) or 0),
        "access_frequency": float(feats.get("access_frequency", 0) or 0),
        "material_clicks": float(feats.get("material_clicks", 0) or 0),
        "avg_quiz_score": _pct(feats.get("avg_quiz_score")),
        "quiz_attempts": float(feats.get("quiz_attempts", 0) or 0),
        "avg_assignment_score": _pct(feats.get("avg_assignment_score")),
        "assignment_submissions": float(feats.get("assignment_submissions", 0) or 0),
        "total_time_spent": float(feats.get("total_time_spent", 0) or 0),
        "procrastination_index": float(feats.get("procrastination_index", 0) or 0),
        "late_submission_count": float(feats.get("late_submission_count", 0) or 0),
    }
    r["clicks_per_day"] = r["all_clicks"] / r["active_days"] if r["active_days"] > 0 else 0.0
    for c in b["log_cols"]:
        r[c] = float(np.log1p(r[c]))
    lo, hi = b["proc_clip"]
    r["procrastination_index"] = min(max(r["procrastination_index"], lo), hi)
    return np.array([[r[c] for c in b["feature_cols"]]], dtype=float)


def predict(feats: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return predicted_grade (0-100), risk_cluster and risk_level, or None."""
    b = _get()
    if not b or not feats:
        return None
    try:
        x = b["scaler"].transform(_row(b, feats))
        cluster = int(b["kmeans"].predict(x)[0])
        x_aug = np.hstack([x, np.eye(b["n_clusters"])[[cluster]]])
        grade = float(np.clip(b["grade_reg"].predict(x_aug)[0], 0, 100))
        return {
            "predicted_grade": round(grade, 1),
            "risk_cluster": cluster,
            "risk_level": b.get("risk_map", {}).get(cluster),
        }
    except Exception:
        return None


def cluster_of(feats: Dict[str, Any]) -> Optional[int]:
    r = predict(feats)
    return r["risk_cluster"] if r else None


def risk_map() -> Dict[int, str]:
    b = _get()
    return (b or {}).get("risk_map", {}) if b else {}
