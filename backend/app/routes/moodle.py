from fastapi import APIRouter, HTTPException, BackgroundTasks
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any

from app.config.database import raw_moodle_payload_collection, feature_vectors_collection
from app.schema.schemas import list_raw_moodle_payload_serial
from app.services.preprocessing import compute_features

router = APIRouter()


# GET all raw moodle payloads
@router.get("/raw-moodle-payloads")
async def get_raw_moodle_payloads():
    try:
        payloads = list_raw_moodle_payload_serial(raw_moodle_payload_collection.find())
        return payloads
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


# POST: ingest raw payload, compute features, store both
@router.post("/raw-moodle-payloads")
async def post_raw_moodle_payload(payload: Dict[str, Any], background_tasks: BackgroundTasks):
    """
    Accepts the exact JSON from the Chrome extension.
    Stores raw payload, computes feature vector, stores it,
    and optionally triggers ML pipeline in background.
    """
    try:
        # 1. Store raw payload
        result = raw_moodle_payload_collection.insert_one(payload)
        raw_id = str(result.inserted_id)

        # 2. Compute feature vector using the rewritten function
        features = compute_features(payload)

        # 3. Store feature vector in a separate collection
        feature_doc = {
            "raw_payload_id": raw_id,
            "student_id": features.get("student_id"),
            "features": features,
            "created_at": datetime.utcnow()
        }
        feature_vectors_collection.insert_one(feature_doc)

        # 4. (Optional) Run ML model in background – you can implement later
        # background_tasks.add_task(run_ml_pipeline, feature_doc["_id"])

        return {
            "inserted_id": raw_id,
            "status": "features_computed",
            "student_id": features.get("student_id")
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


# PUT: update raw payload by id (accepts any JSON, no validation)
@router.put("/raw-moodle-payloads/{id}")
async def put_raw_moodle_payload(id: str, payload: Dict[str, Any]):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")

    try:
        result = raw_moodle_payload_collection.update_one(
            {"_id": oid},
            {"$set": payload}
        )
        return {"matched_count": result.matched_count, "modified_count": result.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# DELETE raw moodle payload
@router.delete("/raw-moodle-payloads/{id}")
async def delete_raw_moodle_payload(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")

    try:
        result = raw_moodle_payload_collection.delete_one({"_id": oid})
        # Also consider deleting associated feature vector
        return {"deleted_count": result.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")