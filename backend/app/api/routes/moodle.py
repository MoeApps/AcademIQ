# Get all raw moodle payloads
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


# Create raw moodle payload
@router.post("/raw-moodle-payloads")
async def post_raw_moodle_payload(payload: RawMoodlePayload):
    try:
        result = raw_moodle_payload_collection.insert_one(payload.dict())
        return {"inserted_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# Update raw moodle payload
@router.put("/raw-moodle-payloads/{id}")
async def put_raw_moodle_payload(id: str, payload: RawMoodlePayload):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = raw_moodle_payload_collection.update_one({"_id": oid}, {"$set": payload.dict()})
        return {"matched_count": result.matched_count, "modified_count": result.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# Delete raw moodle payload
@router.delete("/raw-moodle-payloads/{id}")
async def delete_raw_moodle_payload(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = raw_moodle_payload_collection.delete_one({"_id": oid})
        return {"deleted_count": result.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")