# backend/app/routes/ml_result.py
"""
Public-ish endpoint that returns the latest ML prediction stored for a student.

Called by the Chrome extension after syncing — the extension has no session
cookie, so we accept the academiq_user_id as a query param (same trust model
as /raw-moodle-payloads). Returns null gracefully when no result exists yet
or when models are offline.
"""

from typing import Any, Dict, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException

from app.config.database import ml_results_collection, feature_vectors_collection

router = APIRouter(prefix="/api/ml", tags=["ML Results"])


def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Strip Mongo internals and return a clean payload."""
    doc.pop("_id", None)
    return doc


@router.get("/result")
def get_ml_result(academiq_user_id: str) -> Dict[str, Any]:
    """
    Return the latest stored ML prediction for the given user.

    Shape returned:
        {
            "available": bool,
            "prediction": { probability, classification, tier,
                            top_negative_drivers, recommendations } | null,
            "model_name": str | null,
            "features_snapshot": { ... } | null,
            "updated_at": ISO string | null,
        }
    """
    if not academiq_user_id:
        raise HTTPException(status_code=400, detail="academiq_user_id is required.")

    # Try the canonical ml_results collection first.
    doc = ml_results_collection.find_one(
        {"academiq_user_id": academiq_user_id},
        sort=[("updated_at", -1)],
    )

    # Fallback: check if there's a legacy record keyed by student_id.
    if not doc:
        fv = feature_vectors_collection.find_one({"academiq_user_id": academiq_user_id})
        student_id = (fv or {}).get("student_id")
        if student_id:
            doc = ml_results_collection.find_one(
                {"student_id": student_id},
                sort=[("updated_at", -1)],
            )

    if not doc:
        return {
            "available": False,
            "prediction": None,
            "model_name": None,
            "features_snapshot": None,
            "updated_at": None,
        }

    doc = _serialize(dict(doc))
    updated = doc.get("updated_at") or doc.get("created_at")

    return {
        "available": True,
        "prediction": doc.get("prediction"),
        "model_name": doc.get("model_name"),
        "features_snapshot": doc.get("input_features_snapshot"),
        "updated_at": updated.isoformat() if hasattr(updated, "isoformat") else str(updated) if updated else None,
    }
