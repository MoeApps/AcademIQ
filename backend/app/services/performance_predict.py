# backend/app/services/performance_predict.py

import os
import sys
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODEL_DIR = os.path.join(BASE_DIR, "models", "performance_model")

ARTIFACTS = {
    "calibrated_model": "model_calibrated.pkl",
    "raw_model": "model_raw.pkl",
    "shap_explainer": "shap_explainer.pkl",
    "behavioral_features": "features_behavioral.pkl",
    "hp_train_medians": "hp_train_medians.pkl",
    "train_medians": "train_medians.pkl",
}

# Recommendation mapping (copied from notebook)
RECOMMENDATION_MAP = {
    "procrastination_index": {
        "icon": "⏰", "short": "Procrastination is your biggest hurdle",
        "action": "Break assignments into daily micro-tasks. Use the 2-minute rule.",
        "why": "High procrastination is the #1 behavioural predictor of low performance."
    },
    "late_submission_count": {
        "icon": "📅", "short": "Late submissions are costing you",
        "action": "Set personal deadlines 48 hours before official ones. Enable calendar reminders.",
        "why": "Each late submission significantly reduces your probability of high performance."
    },
    "access_frequency": {
        "icon": "🔄", "short": "Access the platform more regularly",
        "action": "Log in at least once daily, even for 10 minutes.",
        "why": "Consistency beats marathon sessions."
    },
    "total_time_spent": {
        "icon": "🕐", "short": "Increase your total study time",
        "action": "Add two 30-minute focused sessions per week. Use Pomodoro.",
        "why": "You're spending significantly less time than high performers."
    },
    "quiz_attempts": {
        "icon": "📝", "short": "Practice quizzes more",
        "action": "Attempt every available quiz at least twice – first without notes, then with.",
        "why": "Active recall through quizzes is one of the most evidence-backed learning strategies."
    },
    "material_clicks": {
        "icon": "📚", "short": "Engage more with course materials",
        "action": "Read each module's materials before attempting assignments.",
        "why": "Limited material interaction suggests gaps in foundational knowledge."
    },
    "active_days": {
        "icon": "📆", "short": "Spread study across more days",
        "action": "Study 5 days a week for 30 minutes rather than 2 days for 75 minutes.",
        "why": "Spaced repetition dramatically improves long-term retention."
    },
    "assignment_submissions": {
        "icon": "📤", "short": "Submit all assignments",
        "action": "Prioritise completing every assignment, even if imperfect.",
        "why": "Missing assignments compound into significant grade drops."
    },
    "behavioral_risk_score": {
        "icon": "⚠️", "short": "High behavioural risk detected",
        "action": "Address procrastination and late submissions together.",
        "why": "Your combined behavioural risk score places you in the bottom quartile."
    },
    "engagement_consistency": {
        "icon": "📊", "short": "Improve engagement consistency",
        "action": "Avoid binge-studying before deadlines. Build a regular weekly schedule.",
        "why": "Consistent engagement predicts performance better than total time spent."
    },
    "clicks_per_day": {
        "icon": "🖱️", "short": "Increase daily platform interaction",
        "action": "Click through materials and resources actively during every study session.",
        "why": "Daily active interaction signals deeper engagement."
    },
    "all_clicks": {
        "icon": "🖱️", "short": "Increase overall platform activity",
        "action": "Explore more resources, forums, and supplementary materials each week.",
        "why": "Total engagement volume is a strong proxy for learning effort."
    },
}

TIER_LABELS = {0: "At Risk ⚠️", 1: "Moderate 📊", 2: "High Performer 🎯", 3: "Distinction 🏆"}

# Global variable for loaded artifacts
_artifacts = None
_behavioral_features = None
_calibrated_model = None
_shap_explainer = None
_train_medians = None
_hp_medians = None

def load_artifacts():
    """Load all performance model artifacts once at startup."""
    global _artifacts, _behavioral_features, _calibrated_model, _shap_explainer, _train_medians, _hp_medians

    if not os.path.exists(MODEL_DIR):
        raise FileNotFoundError(f"Model directory not found: {MODEL_DIR}")

    artifacts = {}
    for name, filename in ARTIFACTS.items():
        path = os.path.join(MODEL_DIR, filename)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Missing artifact: {path}")
        artifacts[name] = joblib.load(path)
        print(f"✅ Loaded {name} from {path}")

    _artifacts = artifacts
    _behavioral_features = artifacts["behavioral_features"]
    _calibrated_model = artifacts["calibrated_model"]
    _shap_explainer = artifacts["shap_explainer"]
    _train_medians = artifacts["train_medians"]
    _hp_medians = artifacts["hp_train_medians"]

def _engineer_features(row: pd.Series, train_medians: pd.Series) -> pd.Series:
    """Recreate derived features exactly as in the notebook."""
    row = row.copy()
    row["clicks_per_day"] = row["all_clicks"] / (row["active_days"] + 1)
    row["time_per_click"] = row["total_time_spent"] / (row["all_clicks"] + 1)
    row["engagement_consistency"] = row["active_days"] / (row["total_time_spent"] / 60 + 1)
    row["behavioral_risk_score"] = (
        max(row["procrastination_index"], 0) * 0.6 +
        row["late_submission_count"] * 10 * 0.4
    )
    for col in ["all_clicks", "total_time_spent", "active_days"]:
        median_val = train_medians.get(col, 1)
        row[f"{col}_relative"] = row[col] / (median_val + 1)
    return row

def predict_performance(raw_features: Dict[str, Any]) -> Dict[str, Any]:
    """Run performance model inference."""
    if _calibrated_model is None:
        # Attempt to load (for initial call after module load)
        load_artifacts()

    required = ["all_clicks", "active_days", "access_frequency", "material_clicks",
                "quiz_attempts", "assignment_submissions", "total_time_spent",
                "procrastination_index", "late_submission_count"]
    missing = [k for k in required if k not in raw_features]
    if missing:
        raise ValueError(f"Missing features: {missing}")

    base = pd.Series(raw_features)
    engineered = _engineer_features(base, _train_medians)
    X_student = engineered[_behavioral_features].values.reshape(1, -1)
    X_df = pd.DataFrame(X_student, columns=_behavioral_features)

    probability = float(_calibrated_model.predict_proba(X_df)[0][1])
    classification = "High Performer" if probability >= 0.5 else "Not High Performer"

    # Approximate grade for tier
    approx_grade = int(round(probability * 100))
    if approx_grade >= 85:
        tier = 3
    elif approx_grade >= 75:
        tier = 2
    elif approx_grade >= 60:
        tier = 1
    else:
        tier = 0
    tier_label = TIER_LABELS[tier]

    # SHAP
    shap_vals = _shap_explainer.shap_values(X_df)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[1]
    shap_map = {feat: float(shap_vals[0][i]) for i, feat in enumerate(_behavioral_features)}

    # Negative drivers
    negative_drivers = sorted([(feat, val) for feat, val in shap_map.items() if val < 0],
                              key=lambda x: x[1])[:3]
    driver_names = [f for f, _ in negative_drivers]

    recommendations = []
    for feat, shap_val in negative_drivers:
        if feat in RECOMMENDATION_MAP:
            rec = RECOMMENDATION_MAP[feat].copy()
            rec["feature"] = feat
            rec["shap_impact"] = round(shap_val, 4)
            if feat in raw_features:
                rec["your_value"] = round(raw_features[feat], 2)
                med_val = _train_medians.get(feat, 0)
                rec["median_value"] = round(med_val, 2)
            recommendations.append(rec)

    if not recommendations:
        recommendations = [{
            "icon": "✅", "short": "Strong engagement – keep it up!",
            "action": "Challenge yourself with optional advanced materials.",
            "why": "Your behavioural patterns align with high performers.",
            "feature": None, "shap_impact": 0.0
        }]

    confidence_note = None
    if 0.4 <= probability <= 0.6:
        confidence_note = "⚠️ Model is uncertain about this student's classification. Recommendations are directional."

    return {
        "probability": round(probability, 4),
        "classification": classification,
        "tier": tier_label,
        "confidence_note": confidence_note,
        "top_negative_drivers": driver_names,
        "recommendations": recommendations,
        "shap_map": {k: round(v, 4) for k, v in shap_map.items()},
    }

# Load artifacts immediately when module is imported (unless we defer)
try:
    load_artifacts()
except Exception as e:
    print(f"⚠️ Performance model artifacts not loaded: {e}")