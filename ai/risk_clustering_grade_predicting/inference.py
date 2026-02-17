import pandas as pd
import numpy as np
import joblib
import os

# Set BASE_DIR to the current working directory for Colab compatibility
BASE_DIR = os.getcwd()

# Load the "Translator" (Scaler) and "Brains" (Models)
SCALER = joblib.load(os.path.join(BASE_DIR, 'academIQ_scaler.pkl'))
CLUSTER_MODEL = joblib.load(os.path.join(BASE_DIR, 'academIQ_cluster_model.pkl'))
GRADE_MODEL = joblib.load(os.path.join(BASE_DIR, 'academIQ_grade_model.pkl'))

def map_grade_letter(score):
    if score > 85: return "A"
    elif score >= 70: return "B"
    elif score >= 55: return "C"
    elif score >= 50: return "D"
    else: return "F"

def predict_student(data_dict):
    # Convert input dictionary to DataFrame
    df = pd.DataFrame([data_dict])
    
    # Define exact feature order used in your notebook
    feature_cols = [
        'all_clicks', 'active_days', 'access_frequency', 'material_clicks',
        'avg_quiz_score', 'quiz_attempts', 'avg_assignment_score',
        'assignment_submissions', 'total_time_spent', 'avg_daily_time', 
        'clicks_per_day', 'procrastination_index', 'late_submission_count'
    ]
    
    # Apply the Log Transformation (Fixes skewed input)
    skewed = ['all_clicks', 'material_clicks', 'total_time_spent', 'avg_daily_time', 'clicks_per_day']
    for col in skewed:
        if col in df.columns:
            df[col] = np.log1p(df[col])
            
    # Scale data using the saved academIQ_scaler
    X_scaled = SCALER.transform(df[feature_cols])
    
    # Execute Predictions
    cluster_id = CLUSTER_MODEL.predict(X_scaled)[0]
    predicted_score = GRADE_MODEL.predict(X_scaled)[0]
    
    return {
        "risk_cluster": int(cluster_id),
        "expected_score": round(float(predicted_score), 1),
        "grade_letter": map_grade_letter(predicted_score)
    }
