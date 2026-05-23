from fastapi import APIRouter, HTTPException
from models.todos import Todo
from models.assignments import Assignment
from models.sessions import Session
from models.quizzes import Quiz
from models.courses import Course
from models.raw_moodle_payload import RawMoodlePayload
from config.database import collection_name, assignments_collection, sessions_collection, quizzes_collection, courses_collection, raw_moodle_payload_collection
from schema.schemas import list_serial, list_assignment_serial, list_session_serial, list_quiz_serial, list_course_serial, list_raw_moodle_payload_serial
from bson import ObjectId

router = APIRouter()


# Get request method
@router.get("/todos")
async def get_todos():
    try:
        todos = list_serial(collection_name.find())
        return todos
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)  # Log to terminal
        raise HTTPException(status_code=500, detail=error_msg)


# Post request method
@router.post("/todos")
async def post_todo(todo: Todo):
    try:
        result = collection_name.insert_one(todo.dict())
        return {"inserted_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

# Put Request Method
@router.put("/todos/{id}")
async def put_todo(id: str, todo: Todo):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = collection_name.update_one({"_id": oid}, {"$set": todo.dict()})
        return {"matched_count": result.matched_count, "modified_count": result.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

# Delete Request Method
@router.delete("/todos/{id}")
async def delete_todo(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = collection_name.delete_one({"_id": oid})
        return {"deleted_count": result.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


