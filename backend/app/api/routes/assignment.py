# Get all assignments
@router.get("/assignments")
async def get_assignments():
    try:
        assignments = list_assignment_serial(assignments_collection.find())
        return assignments
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


# Create assignment
@router.post("/assignments")
async def post_assignment(assignment: Assignment):
    try:
        result = assignments_collection.insert_one(assignment.dict())
        return {"inserted_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# Update assignment
@router.put("/assignments/{id}")
async def put_assignment(id: str, assignment: Assignment):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = assignments_collection.update_one({"_id": oid}, {"$set": assignment.dict()})
        return {"matched_count": result.matched_count, "modified_count": result.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# Delete assignment
@router.delete("/assignments/{id}")
async def delete_assignment(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = assignments_collection.delete_one({"_id": oid})
        return {"deleted_count": result.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

