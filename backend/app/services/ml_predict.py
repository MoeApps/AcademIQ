# backend/app/services/ml_predict.py

import joblib
import numpy as np
import os
from typing import Dict, Any

# Paths to your trained models (adjust if models folder is outside backend)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BASE_DIR, "models")   # goes up to AcademIQ/models

MODEL_PATH = os.path.join(MODELS_DIR, "burnout_model.pkl")
SCALER_PATH = os.path.join(MODELS_DIR, "riskScaler.pkl")

# Feature order – must exactly match the order used during training.
# These are the 16 features we computed in preprocessing.py.
FEATURE_ORDER = [
    "total_time_spent",
    "active_days",
    "access_frequency",
    "all_clicks",
    "material_clicks",
    "avg_quiz_score",
    "quiz_attempts",
    "avg_assignment_score",
    "assignment_submissions",
    "final_grade",
    "late_submission_count",
    "procrastination_index",
]

def load_model_and_scaler():
    """Load the model and scaler; raise exception if missing."""
    try:
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        print("✅ ML model and scaler loaded successfully")
        return model, scaler
    except Exception as e:
        print(f"❌ Failed to load ML model: {e}")
        return None, None

# Load at module import (once)
model, scaler = load_model_and_scaler()

def predict_features(features_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Accepts a dictionary of features (as stored in feature_vectors_collection),
    orders them, scales, and runs the model. Returns predictions.
    """
    if model is None or scaler is None:
        raise RuntimeError("ML model not loaded. Check paths.")

    # Extract values in the correct order
    try:
        X = np.array([[features_dict.get(key, 0.0) for key in FEATURE_ORDER]])
    except KeyError as e:
        raise ValueError(f"Missing feature in input: {e}")

    # Scale features (if your scaler expects 2D array)
    X_scaled = scaler.transform(X)

    # Predict (adjust based on your model's output)
    # Assume classification: 0 = low risk, 1 = medium, 2 = high
    risk_cluster = int(model.predict(X_scaled)[0])

    # If you have probability predictions:
    # proba = model.predict_proba(X_scaled)[0]
    # pass_probability = proba[1]  # if binary classification

    # For demonstration, derive pass_probability from risk_cluster (you can replace)
    if risk_cluster == 0:
        pass_probability = 0.85
        risk_level = "LOW"
        engagement_score = 0.7
    elif risk_cluster == 1:
        pass_probability = 0.55
        risk_level = "MEDIUM"
        engagement_score = 0.5
    else:
        pass_probability = 0.25
        risk_level = "HIGH"
        engagement_score = 0.3

    return {
        "risk_cluster": risk_cluster,
        "risk_level": risk_level,
        "pass_probability": round(pass_probability, 4),
        "engagement_score": round(engagement_score, 4)
    }