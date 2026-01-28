import joblib

# Load model & scaler once at startup
model = joblib.load("ai/pass_fail_model.pkl")
# scaler = joblib.load("scaler.pkl")

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Test root endpoint
@app.get("/")
def read_root():
    return {"message": "academIQ backend is live!"}

class StudentFeatures(BaseModel):
    attendance: float
    assignments: float
    quizzes: float

import pandas as pd

@app.post("/predict")
def predict(student: StudentFeatures):
    # Convert input to dataframe
    data = pd.DataFrame([student.dict()])

    # Scale features
    data_scaled = scaler.transform(data)

    # Get prediction and probability
    pred = model.predict(data_scaled)[0]
    risk = model.predict_proba(data_scaled)[0][1]  # probability of failing

    # Generate recommendation
    if pred == 0:
        status = "pass"
        recommendation = "Keep up the good work! Focus on assignments and quizzes."
    else:
        status = "fail"
        recommendation = "We recommend reviewing weak topics, completing missing assignments, and practicing quizzes."

    return {
        "risk": round(risk, 2),
        "pass_fail": status,
        "recommendation": recommendation
    }
