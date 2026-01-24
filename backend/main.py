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
