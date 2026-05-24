# backend/app/routes/performance.py

from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import Dict, Any

from app.config.database import feature_vectors_collection, ml_results_collection
from app.services.performance_predict import predict_performance

router = APIRouter(prefix="/api/performance", tags=["Performance"])

def get_latest_features(student_id: str) -> Dict[str, Any]:
    """Retrieve the most recent feature vector for a student."""
    doc = feature_vectors_collection.find_one(
        {"student_id": student_id},
        sort=[("created_at", -1)]
    )
    if not doc:
        return None
    return doc.get("features", {})

@router.get("/insights/{student_id}")
async def performance_insights(student_id: str):
    """
    Run the performance model on a student's latest feature vector.
    Returns probability, tier, personalised recommendations, and stores result.
    """
    features = get_latest_features(student_id)
    if not features:
        raise HTTPException(status_code=404, detail="No feature vector found for this student")

    # The performance model expects specific raw keys; extract them from the stored features
    # Note: Our compute_features returns many fields, we map to required ones.
    raw_input = {
        "all_clicks": features.get("all_clicks", 0),
        "active_days": features.get("active_days", 0),
        "access_frequency": features.get("access_frequency", 0.0),
        "material_clicks": features.get("material_clicks", 0),
        "quiz_attempts": features.get("quiz_attempts", 0),
        "assignment_submissions": features.get("assignment_submissions", 0),
        "total_time_spent": features.get("total_time_spent", 0),
        "procrastination_index": features.get("procrastination_index", 0.0),
        "late_submission_count": features.get("late_submission_count", 0)
    }

    try:
        result = predict_performance(raw_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {str(e)}")

    # Store result in ml_results_collection
    doc = {
        "student_id": student_id,
        "model_name": "performance_model_v4",
        "input_features_snapshot": raw_input,
        "prediction": {
            "probability": result["probability"],
            "classification": result["classification"],
            "tier": result["tier"],
            "top_negative_drivers": result["top_negative_drivers"],
            "recommendations": result["recommendations"]
        },
        "created_at": datetime.utcnow()
    }
    ml_results_collection.insert_one(doc)

    # Return what the frontend needs
    return {
        "student_id": student_id,
        "probability": result["probability"],
        "classification": result["classification"],
        "tier": result["tier"],
        "confidence_note": result.get("confidence_note"),
        "recommendations": result["recommendations"],
        # Optionally include SHAP for debugging but not needed for UI
        # "shap_map": result["shap_map"]
    }