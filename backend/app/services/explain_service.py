"""
Explainability (PAIS Phase 5): structured reasons for risk level.
Compares student features to dataset means (no SHAP; add SHAP when using XGBoost/RF).
"""
from pathlib import Path
from typing import Optional

import pandas as pd

from backend.app.services.profile_service import _load_risk_cache, get_risk_for_student

FEATURE_LABELS = {
    "total_time_spent": "Total study time",
    "active_days": "Active days",
    "access_frequency": "Access frequency",
    "avg_quiz_score": "Quiz score average",
    "quiz_score_std": "Quiz score consistency",
    "avg_assignment_score": "Assignment score average",
    "late_submission_ratio": "Late submission ratio",
    "avg_final_grade": "Final grade average",
}


def get_explainability(student_id: str) -> Optional[dict]:
    """
    Return risk level and structured reasons (feature vs dataset mean).
    Dataset is read-only (phase2_risk_clusters).
    """
    cache = _load_risk_cache()
    row = cache.get(student_id)
    if row is None:
        return None
    risk = get_risk_for_student(student_id)
    if not risk:
        return None

    # Build dataframe to compute means (from cache)
    if not cache:
        return {"risk_level": risk["risk_level"], "reasons": [risk["generic_recommendation"]], "summary": risk["generic_recommendation"]}
    df = pd.DataFrame.from_dict(cache, orient="index")
    feature_cols = [c for c in FEATURE_LABELS if c in df.columns]
    if not feature_cols:
        return {"risk_level": risk["risk_level"], "reasons": [risk["generic_recommendation"]], "summary": risk["generic_recommendation"]}
    means = df[feature_cols].mean()
    reasons = []
    for col in feature_cols:
        label = FEATURE_LABELS.get(col, col)
        val = row.get(col)
        if val is None or pd.isna(val):
            continue
        mean_val = means.get(col)
        if mean_val is None or pd.isna(mean_val):
            continue
        try:
            v, m = float(val), float(mean_val)
            if v < m * 0.9:
                reasons.append(f"{label}: below average ({v:.1f} vs {m:.1f})")
            elif v > m * 1.1:
                reasons.append(f"{label}: above average ({v:.1f} vs {m:.1f})")
        except (TypeError, ValueError):
            pass
    if not reasons:
        reasons = [risk["generic_recommendation"]]
    summary = risk["generic_recommendation"]
    return {
        "student_id": student_id,
        "risk_level": risk["risk_level"],
        "risk_cluster": risk["risk_cluster"],
        "reasons": reasons,
        "summary": summary,
    }
