# backend/app/services/grade_risk_predict.py

import joblib
import numpy as np
import pandas as pd
import sys
import os
from pathlib import Path
from typing import Dict, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_DIR = os.path.join(BASE_DIR, "models", "grade_risk_model")

# Add MODEL_DIR to path for inference import
if str(MODEL_DIR) not in sys.path:
    sys.path.insert(0, str(MODEL_DIR))

# Try to import TensorFlow and the inference module
TF_AVAILABLE = False
_predictor = None

try:
    import tensorflow as tf
    from inference import StudentPredictor
    TF_AVAILABLE = True
    print("✅ TensorFlow loaded – grade/risk model available")
except ImportError as e:
    print(f"⚠️ TensorFlow not available (grade/risk model disabled): {e}")

def get_predictor():
    global _predictor
    if not TF_AVAILABLE:
        raise RuntimeError("TensorFlow not installed. Grade/risk model unavailable.")
    if _predictor is None:
        _predictor = StudentPredictor()
    return _predictor

def predict_grade_and_risk(raw_features: dict) -> dict:
    """
    raw_features must contain at least:
        all_clicks, active_days, access_frequency, material_clicks,
        avg_quiz_score, quiz_attempts, avg_assignment_score,
        assignment_submissions, total_time_spent
    Returns dict with risk_cluster, risk_label, predicted_grade, grade_letter.
    """
    if not TF_AVAILABLE:
        raise RuntimeError("Grade/risk model not available (TensorFlow missing).")
    predictor = get_predictor()
    required = [
        'all_clicks', 'active_days', 'access_frequency', 'material_clicks',
        'avg_quiz_score', 'quiz_attempts', 'avg_assignment_score',
        'assignment_submissions', 'total_time_spent'
    ]
    input_dict = {k: raw_features.get(k, 0) for k in required}
    return predictor.predict(input_dict)