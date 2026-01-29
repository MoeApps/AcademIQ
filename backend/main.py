from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib

# ------------------------------------
# Initialize FastAPI app
# ------------------------------------
app = FastAPI(title="academIQ Backend", version="1.0")

# ------------------------------------
# Load ML model and scaler
# ------------------------------------
model = joblib.load("pass_fail_model.pkl")
scaler = joblib.load("pass_fail_scaler.pkl")

# ------------------------------------
# Input schema (JSON validation)
# ------------------------------------
class StudentFeatures(BaseModel):
    total_time_spent: float
    active_days: float
    access_frequency: float
    avg_quiz_score: float
    quiz_score_std: float
    avg_assignment_score: float
    late_submission_ratio: float
    risk_cluster: float
    risk_cluster_encoded: float
    avg_final_grade: float

# ------------------------------------
# Root endpoint (health check)
# ------------------------------------
@app.get("/")
def root():
    return {"message": "academIQ backend is running"}

# ------------------------------------
# Prediction endpoint
# ------------------------------------
@app.post("/predict")
def predict(student: StudentFeatures):

    # Convert input JSON → DataFrame
    input_df = pd.DataFrame([student.dict()])

    # Scale features
    input_scaled = scaler.transform(input_df)

    # Model prediction
    prediction = model.predict(input_scaled)[0]
    risk_score = model.predict_proba(input_scaled)[0][1]

    # Interpret prediction
    if prediction == 1:
        pass_fail = "fail"
        recommendation = (
            "High academic risk detected. "
            "Focus on attendance, submit all assignments, "
            "and revise weak topics before quizzes."
        )
    else:
        pass_fail = "pass"
        recommendation = (
            "Low academic risk. "
            "Maintain consistency and continue practicing quizzes."
        )

    # Response
    return {
        "risk_probability": round(float(risk_score), 2),
        "pass_fail": pass_fail,
        "recommendation": recommendation
    }
