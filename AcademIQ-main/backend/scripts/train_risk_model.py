"""
Train a 3-class risk model from synthetic data and save backend/models/risk_model.pkl.

Run from repo root:
  python backend/scripts/train_risk_model.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

BACKEND = Path(__file__).resolve().parents[1]
MODEL_DIR = BACKEND / "models"
MODEL_PATH = MODEL_DIR / "risk_model.pkl"

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


def _label_row(row: np.ndarray) -> int:
    """Weak synthetic rule to build class labels (0=low, 1=med, 2=high risk)."""
    total_time, active_days, access_freq, avg_quiz, quiz_std, avg_asg, late_ratio, avg_final = row
    score = (
        float(avg_final) * 0.35
        + float(avg_quiz) * 0.2
        + float(avg_asg) * 0.2
        + min(float(active_days) / 30.0, 1.0) * 0.1
        + min(float(access_freq) / 20.0, 1.0) * 0.1
        - float(late_ratio) * 0.25
        - min(float(quiz_std), 1.0) * 0.05
    )
    if score >= 0.55:
        return 0
    if score >= 0.35:
        return 1
    return 2


def main():
    rng = np.random.default_rng(42)
    n = 800
    X = np.zeros((n, len(FEATURE_ORDER)))
    X[:, 0] = rng.uniform(1e5, 5e7, n)
    X[:, 1] = rng.integers(1, 31, n)
    X[:, 2] = rng.uniform(0, 25, n)
    X[:, 3] = rng.uniform(0, 1, n)
    X[:, 4] = rng.uniform(0, 0.5, n)
    X[:, 5] = rng.uniform(0, 1, n)
    X[:, 6] = rng.uniform(0, 1, n)
    X[:, 7] = rng.uniform(0, 1, n)

    y = np.array([_label_row(X[i]) for i in range(n)], dtype=int)

    clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=12,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X, y)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    print(f"Saved {MODEL_PATH} (classes={list(clf.classes_)})")


if __name__ == "__main__":
    main()
