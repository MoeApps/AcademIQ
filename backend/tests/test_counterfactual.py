# backend/tests/test_counterfactual.py
"""
Tests for app.services.counterfactual.find_counterfactual().

The real LightGBM/SHAP artifacts (models/performance_model/*.pkl) are not
available in CI, so these tests monkeypatch the four module-level globals in
app.services.performance_predict that counterfactual.py reads
(_calibrated_model, _behavioral_features, _train_medians, _hp_medians) with a
small synthetic logistic model. This keeps the tests fast, deterministic, and
independent of the binary artifacts, while still exercising the real
_rebuild_derived() / find_counterfactual() code paths exactly as they run in
production.

Synthetic model: probability is driven almost entirely by
assignment_submissions and quiz_attempts (the two features the v6 notebook
found to be the dominant SHAP drivers — see Section 10), so the test fixtures
mirror real-world feature importance instead of being arbitrary.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services import performance_predict as pp  # noqa: E402
from app.services import counterfactual as cf  # noqa: E402


BEHAVIORAL_FEATURES = [
    "all_clicks", "active_days", "access_frequency",
    "material_clicks", "quiz_attempts", "assignment_submissions",
    "total_time_spent", "procrastination_index", "late_submission_count",
    "clicks_per_day", "time_per_click", "time_per_active_day",
    "engagement_consistency", "behavioral_risk_score",
    "procrastination_x_late", "submission_rate",
    "all_clicks_vs_median", "total_time_spent_vs_median", "active_days_vs_median",
]

# High-performer cohort medians for the 9 raw mutable features — used as the
# counterfactual engine's "target" values.
HP_MEDIANS = {
    "all_clicks": 4500.0,
    "active_days": 140.0,
    "access_frequency": 25.0,
    "material_clicks": 320.0,
    "quiz_attempts": 14.0,
    "assignment_submissions": 9.0,
    "total_time_spent": 14000.0,
    "procrastination_index": 1.5,
    "late_submission_count": 0.0,
}

TRAIN_MEDIANS = {
    "all_clicks": 1200.0,
    "total_time_spent": 4000.0,
    "active_days": 45.0,
}


class _FakeCalibratedModel:
    """
    Deterministic stand-in for the real CalibratedClassifierCV.

    predict_proba is a hand-rolled logistic function dominated by
    assignment_submissions and quiz_attempts (mirroring the notebook's real
    SHAP findings — see ai/v6_2.ipynb Section 10), with small contributions
    from active_days and total_time_spent so the counterfactual engine has
    more than one feature to consider.
    """

    def predict_proba(self, X_df: pd.DataFrame) -> np.ndarray:
        row = X_df.iloc[0]
        score = (
            -3.0
            + 0.35 * row["assignment_submissions"]
            + 0.18 * row["quiz_attempts"]
            + 0.015 * row["active_days"]
            + 0.00015 * row["total_time_spent"]
            - 0.05 * row["late_submission_count"]
        )
        p1 = 1.0 / (1.0 + np.exp(-score))
        return np.array([[1 - p1, p1]])


@pytest.fixture(autouse=True)
def _patch_model_artifacts(monkeypatch):
    """Wire the fake model + cohort medians into performance_predict's globals."""
    monkeypatch.setattr(pp, "_calibrated_model", _FakeCalibratedModel())
    monkeypatch.setattr(pp, "_behavioral_features", BEHAVIORAL_FEATURES)
    monkeypatch.setattr(pp, "_train_medians", TRAIN_MEDIANS)
    monkeypatch.setattr(pp, "_hp_medians", HP_MEDIANS)
    yield


# ── Fixtures: raw 9-feature student profiles ────────────────────────────────

AT_RISK_STUDENT = {
    "all_clicks": 120.0,
    "active_days": 8.0,
    "access_frequency": 3.5,
    "material_clicks": 15.0,
    "quiz_attempts": 1.0,
    "assignment_submissions": 2.0,
    "total_time_spent": 300.0,
    "procrastination_index": 28.0,
    "late_submission_count": 4.0,
}

HIGH_PERFORMER_STUDENT = {
    "all_clicks": 4500.0,
    "active_days": 140.0,
    "access_frequency": 25.0,
    "material_clicks": 320.0,
    "quiz_attempts": 14.0,
    "assignment_submissions": 9.0,
    "total_time_spent": 14000.0,
    "procrastination_index": 1.5,
    "late_submission_count": 0.0,
}


# ── Tests ────────────────────────────────────────────────────────────────────

def test_already_high_performer_returns_no_changes():
    """A student already classified High Performer gets an empty changes_needed."""
    result = cf.find_counterfactual(HIGH_PERFORMER_STUDENT)

    assert result["status"] == "Already classified as High Performer"
    assert result["changes_needed"] == {}
    assert result["probability_gain"] == 0.0
    assert result["original_probability"] == result["new_probability"]
    assert result["original_probability"] >= 0.5


def test_at_risk_student_gets_non_empty_changes():
    """A clearly at-risk student gets at least one concrete recommended change."""
    result = cf.find_counterfactual(AT_RISK_STUDENT)

    assert result["original_probability"] < 0.5
    assert result["status"] in ("Flip achieved", "Partial improvement")
    assert len(result["changes_needed"]) > 0

    # Every change must reference one of the 9 mutable features, and the
    # {from, to, change} arithmetic must be internally consistent.
    for feat, change in result["changes_needed"].items():
        assert feat in cf.PRIMARY_MUTABLE
        assert set(change.keys()) == {"from", "to", "change"}
        assert round(change["to"] - change["from"], 3) == round(change["change"], 3)


def test_missing_features_does_not_crash():
    """A partial/empty feature dict must not raise — missing keys default to 0."""
    result = cf.find_counterfactual({})
    assert "status" in result
    assert "changes_needed" in result

    # Also check a partially-populated dict (only 3 of 9 raw features present).
    partial = {"quiz_attempts": 2.0, "active_days": 5.0, "all_clicks": 50.0}
    result2 = cf.find_counterfactual(partial)
    assert "status" in result2
    assert isinstance(result2["changes_needed"], dict)


def test_probability_after_changes_is_not_lower_than_original():
    """
    Sanity check: applying changes_needed must move the probability in the
    right direction — new_probability should never be lower than
    original_probability. This is the core correctness guarantee of the
    counterfactual engine; if this regresses, the engine is recommending
    changes that make things worse.
    """
    result = cf.find_counterfactual(AT_RISK_STUDENT)
    assert result["new_probability"] >= result["original_probability"]
    assert result["probability_gain"] >= 0.0

    # Independently replay changes_needed on a fresh copy of the student row
    # and confirm the resulting probability matches new_probability — this
    # guards against changes_needed and new_probability silently diverging.
    raw = {feat: float(AT_RISK_STUDENT.get(feat, 0.0)) for feat in cf.PRIMARY_MUTABLE}
    row = cf._rebuild_derived(pd.Series(raw))
    for feat, change in result["changes_needed"].items():
        row[feat] = change["to"]
        row = cf._rebuild_derived(row)
    replayed_p = cf._predict_proba(row)
    assert round(replayed_p, 3) == result["new_probability"]


def test_changes_needed_only_uses_primary_mutable_features():
    """The engine must never recommend changing a derived feature directly."""
    result = cf.find_counterfactual(AT_RISK_STUDENT)
    for feat in result["changes_needed"]:
        assert feat in cf.PRIMARY_MUTABLE, (
            f"{feat} is a derived feature and must never appear in "
            f"changes_needed — only PRIMARY_MUTABLE features are adjustable."
        )
