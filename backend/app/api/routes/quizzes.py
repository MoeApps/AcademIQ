# Get all quizzes
@router.get("/quizzes")
async def get_quizzes():
    try:
        quizzes = list_quiz_serial(quizzes_collection.find())
        return quizzes
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


# Create quiz
@router.post("/quizzes")
async def post_quiz(quiz: Quiz):
    try:
        result = quizzes_collection.insert_one(quiz.dict())
        return {"inserted_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# Update quiz
@router.put("/quizzes/{id}")
async def put_quiz(id: str, quiz: Quiz):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = quizzes_collection.update_one({"_id": oid}, {"$set": quiz.dict()})
        return {"matched_count": result.matched_count, "modified_count": result.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# Delete quiz
@router.delete("/quizzes/{id}")
async def delete_quiz(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = quizzes_collection.delete_one({"_id": oid})
        return {"deleted_count": result.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")