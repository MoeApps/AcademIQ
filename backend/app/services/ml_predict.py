# backend/app/services/ml_predict.py

import joblib
import numpy as np
import os
from typing import Dict, Any

# Get the absolute path to AcademIQ root (two levels up from this file)
# Current file: AcademIQ/backend/app/services/ml_predict.py
# Go up: services -> app -> backend -> AcademIQ
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR = os.path.join(BASE_DIR, "models")

MODEL_PATH = os.path.join(MODELS_DIR, "burnout_model.pkl")
SCALER_PATH = os.path.join(MODELS_DIR, "riskScaler.pkl")

# Feature order – adjust to match your trained model
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
  #  "final_grade",
    "late_submission_count",
    "procrastination_index",
]

def load_model_and_scaler():
    try:
        model = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded from {MODEL_PATH}")
    except FileNotFoundError:
        raise RuntimeError(f"Model file not found at {MODEL_PATH}")
    except Exception as e:
        raise RuntimeError(f"Failed to load model: {e}")

    try:
        scaler = joblib.load(SCALER_PATH)
        print(f"✅ Scaler loaded from {SCALER_PATH}")
    except FileNotFoundError:
        print(f"⚠️ Scaler not found at {SCALER_PATH}. Proceeding without scaling.")
        scaler = None
    except Exception as e:
        print(f"⚠️ Could not load scaler: {e}. Proceeding without scaling.")
        scaler = None

    return model, scaler

model, scaler = load_model_and_scaler()

def predict_features(features_dict: Dict[str, Any]) -> Dict[str, Any]:
    if model is None:
        raise RuntimeError("Model not loaded.")

    X = np.array([[features_dict.get(key, 0.0) for key in FEATURE_ORDER]])
    if scaler is not None:
        X = scaler.transform(X)

    risk_cluster = int(model.predict(X)[0])

    # Map to human-readable outputs (adjust as needed)
    risk_map = {
        0: {"level": "LOW", "pass_prob": 0.85, "engagement": 0.7},
        1: {"level": "MEDIUM", "pass_prob": 0.55, "engagement": 0.5},
        2: {"level": "HIGH", "pass_prob": 0.25, "engagement": 0.3},
    }
    result = risk_map.get(risk_cluster, {"level": "UNKNOWN", "pass_prob": 0.5, "engagement": 0.5})

    return {
        "risk_cluster": risk_cluster,
        "risk_level": result["level"],
        "pass_probability": result["pass_prob"],
        "engagement_score": result["engagement"]
    }