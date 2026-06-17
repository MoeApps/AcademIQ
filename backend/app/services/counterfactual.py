# backend/app/services/counterfactual.py
"""
Counterfactual recommendation engine.

Answers: "What is the minimum behavioural change needed for this student to
flip from Not High Performer to High Performer?"

This is a direct port of Section 12 ("Counterfactual Analysis") from the v6
training notebook (ai/v6_2.ipynb) — _rebuild_derived() and
find_counterfactual(). The math is not redesigned here; it is reproduced
exactly so the live API's projections match what was validated offline.

IMPORTANT — dependency note (flagged, not fixed here):
The notebook's _rebuild_derived() computes 7 derived fields from the 9 raw
features: clicks_per_day, time_per_click, time_per_active_day,
engagement_consistency, behavioral_risk_score, procrastination_x_late, and
submission_rate, plus 3 *_vs_median ratios (10 total derived fields, 19
features overall with the 9 raw inputs).

The live backend's app/services/performance_predict.py::_engineer_features()
currently computes only 5 of those (it's missing time_per_active_day,
procrastination_x_late, and submission_rate, and names the ratio fields
*_relative instead of *_vs_median). If _behavioral_features (loaded from
features_behavioral.pkl) expects the full 19-feature notebook schema, the
live predict_performance() path is feeding the model the wrong feature
vector. That is a pre-existing bug in performance_predict.py, independent of
this engine — it is NOT fixed here, since the task is to port the notebook's
counterfactual logic, not the prediction pipeline. It should be fixed in
performance_predict.py separately so _rebuild_derived() here and
_engineer_features() there agree on the exact same 19 columns; otherwise the
"original_probability" returned by predict_performance() and the
"new_probability" computed by this module's repeated calls into that same
function will be internally consistent with each other (since both go
through the same _calibrated_model and _behavioral_features), but the
absolute prediction quality is only as good as _engineer_features() upstream.

FIX (this revision): _train_medians / _hp_medians are loaded directly from
joblib artifacts (train_medians.pkl / hp_train_medians.pkl), which were
saved as pandas Series in the notebook (X_train.median() /
X_train[mask].median()). The previous code used `(_pp._train_medians or
{}).get(...)`, which evaluates the Series' truthiness — pandas raises
`ValueError: The truth value of a Series is ambiguous` for any Series with
more than one element. That crashed on the very first call to
_rebuild_derived(), before SHAP or anything else ran. _safe_median_get()
below replaces the `or {}` pattern with an explicit None-check and works
identically whether the underlying object is a dict, a pandas Series, or
None.
"""

from typing import Any, Dict, Optional

import pandas as pd

from app.services import performance_predict as _pp

# Same 9 mutable behavioural features as PRIMARY_MUTABLE in the notebook.
# These are the only features the counterfactual engine is allowed to move —
# everything else (the 10 derived columns) is recomputed by _rebuild_derived.
PRIMARY_MUTABLE = [
    "quiz_attempts", "assignment_submissions", "active_days",
    "total_time_spent", "all_clicks", "access_frequency",
    "material_clicks", "procrastination_index", "late_submission_count",
]


def _safe_median_get(medians: Optional[Any], key: str, default: float) -> float:
    """
    Look up `key` in `medians`, where `medians` may be a dict, a pandas
    Series, or None (artifacts not loaded yet).

    Never use `medians or {}` here: pandas raises ValueError on the
    truthiness check for any Series with more than one element. `.get()`
    itself is safe on both dict and Series, so the only thing we need to
    guard against explicitly is `medians is None`.
    """
    if medians is None:
        return default
    return medians.get(key, default)


def _rebuild_derived(row: pd.Series) -> pd.Series:
    """
    Recompute all derived features from the 9 raw inputs.

    Exact port of the notebook's _rebuild_derived(). Must be called after
    every mutation to a raw feature so the derived columns stay consistent
    with what the model was trained on — never patch a derived column
    directly.
    """
    row = row.copy()
    row["clicks_per_day"] = row["all_clicks"] / (row["active_days"] + 1)
    row["time_per_click"] = row["total_time_spent"] / (row["all_clicks"] + 1)
    row["time_per_active_day"] = row["total_time_spent"] / (row["active_days"] + 1)
    row["engagement_consistency"] = row["active_days"] / (row["total_time_spent"] / 60 + 1)
    row["behavioral_risk_score"] = (
        max(row["procrastination_index"], 0) * 0.6
        + row["late_submission_count"] * 10 * 0.4
    )
    row["procrastination_x_late"] = (
        max(row["procrastination_index"], 0) * max(row["late_submission_count"], 0)
    )
    for col in ["all_clicks", "total_time_spent", "active_days"]:
        med = _safe_median_get(_pp._train_medians, col, 1)
        row[f"{col}_vs_median"] = row[col] / (med + 1)
    row["submission_rate"] = row["assignment_submissions"] / (row["active_days"] / 14 + 1)
    return row


def _predict_proba(row: pd.Series) -> float:
    """Run the calibrated model on a fully-derived feature row."""
    if _pp._calibrated_model is None:
        # Mirrors performance_predict.predict_performance()'s own lazy-load
        # guard — artifacts should already be loaded at import time, but if
        # something cleared them, retry once rather than crashing on a None
        # model.
        _pp.load_artifacts()
    X_df = pd.DataFrame([row], columns=_pp._behavioral_features)
    return float(_pp._calibrated_model.predict_proba(X_df)[0][1])


def find_counterfactual(student_features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Find the minimum set of behavioural changes that flip the student's
    classification from Not High Performer to High Performer.

    Args:
        student_features: dict of the 9 raw behavioural features
            (all_clicks, active_days, access_frequency, material_clicks,
            quiz_attempts, assignment_submissions, total_time_spent,
            procrastination_index, late_submission_count). Extra keys are
            ignored; missing keys default to 0.0 so a partial feature
            vector never crashes the engine (it will just produce a less
            informed counterfactual).

    Returns:
        {
            "status": str,
            "original_probability": float,
            "new_probability": float,
            "probability_gain": float,
            "changes_needed": {
                feature: {"from": float, "to": float, "change": float},
                ...
            },
        }
    """
    raw = {feat: float(student_features.get(feat, 0.0) or 0.0) for feat in PRIMARY_MUTABLE}
    student_row = _rebuild_derived(pd.Series(raw))

    orig_p = _predict_proba(student_row)
    if orig_p >= 0.5:
        return {
            "status": "Already classified as High Performer",
            "original_probability": round(orig_p, 3),
            "new_probability": round(orig_p, 3),
            "probability_gain": 0.0,
            "changes_needed": {},
        }

    modified = student_row.copy()
    changes: Dict[str, Dict[str, float]] = {}
    current_p = orig_p

    # Step 1 — for each mutable feature, measure the probability gain from
    # moving it (alone) to the high-performer cohort median.
    gains = []
    for feat in PRIMARY_MUTABLE:
        if feat not in modified.index:
            continue
        target = float(_safe_median_get(_pp._hp_medians, feat, modified[feat]))
        if abs(target - float(modified[feat])) < 1e-6:
            continue
        test = _rebuild_derived(modified.copy())
        test[feat] = target
        test = _rebuild_derived(test)
        gain = _predict_proba(test) - current_p
        gains.append((feat, gain, target))

    # Step 2 — apply changes in descending order of impact until the
    # student flips (or we run out of mutable features).
    gains.sort(key=lambda x: -x[1])

    for feat, _gain, target in gains:
        if current_p >= 0.5:
            break
        old_val = float(modified[feat])
        modified[feat] = target
        modified = _rebuild_derived(modified)
        current_p = _predict_proba(modified)
        changes[feat] = {
            "from": round(old_val, 3),
            "to": round(float(target), 3),
            "change": round(float(target) - old_val, 3),
        }

    final_p = _predict_proba(modified)
    return {
        "status": "Flip achieved" if final_p >= 0.5 else "Partial improvement",
        "original_probability": round(orig_p, 3),
        "new_probability": round(final_p, 3),
        "probability_gain": round(final_p - orig_p, 3),
        "changes_needed": changes,
    }