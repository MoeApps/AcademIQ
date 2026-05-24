# backend/app/routes/student.py

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime

from app.config.database import feature_vectors_collection, ml_results_collection
from app.services.ml_predict import predict_features

router = APIRouter(prefix="/api/student", tags=["Student"])

def get_latest_features(student_id: str) -> Dict[str, Any]:
    """Retrieve the most recent feature vector for a student."""
    doc = feature_vectors_collection.find_one(
        {"student_id": student_id},
        sort=[("created_at", -1)]
    )
    if not doc:
        return None
    return doc.get("features", {})

def store_prediction(student_id: str, features_used: Dict[str, Any], prediction: Dict[str, Any]):
    """Store ML result in ml_results_collection."""
    doc = {
        "student_id": student_id,
        "features_snapshot": features_used,
        "prediction": prediction,
        "created_at": datetime.utcnow()
    }
    ml_results_collection.insert_one(doc)

@router.get("/insights/{student_id}")
async def get_insights(student_id: str):
    """
    For a given student_id, fetch latest feature vector, run ML prediction,
    store the result, and return insights.
    """
    features = get_latest_features(student_id)
    if not features:
        raise HTTPException(status_code=404, detail="No feature vector found for this student")

    try:
        prediction = predict_features(features)
        # Store the prediction for history
        store_prediction(student_id, features, prediction)
        return {
            "student_id": student_id,
            "data_source": "live",
            "classification": "High Performer" if prediction["risk_cluster"] == 0 else "Average Performer" if prediction["risk_cluster"] == 1 else "At Risk",
            "confidence": round(prediction["pass_probability"] * 100, 1),
            "pass_probability": prediction["pass_probability"],
            "risk_level": prediction["risk_level"],
            "engagement_score": prediction["engagement_score"],
            # Add mock strengths/weaknesses for now; you can generate from features
            "strengths": ["Good quiz performance", "Consistent activity"],
            "weaknesses": ["Late submissions detected"] if features.get("late_submission_count", 0) > 2 else [],
            "recommendations": [
                {"title": "Review weak topics", "description": "Focus on areas with low quiz scores", "priority": "High"}
            ],
            "progress_data": [],  # You can add later
            "timeline": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML prediction failed: {str(e)}")