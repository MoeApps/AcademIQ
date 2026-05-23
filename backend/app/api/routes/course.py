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


# Get all courses
@router.get("/courses")
async def get_courses():
    try:
        courses = list_course_serial(courses_collection.find())
        return courses
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


# Create course
@router.post("/courses")
async def post_course(course: Course):
    try:
        result = courses_collection.insert_one(course.dict())
        return {"inserted_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# Update course
@router.put("/courses/{id}")
async def put_course(id: str, course: Course):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = courses_collection.update_one({"_id": oid}, {"$set": course.dict()})
        return {"matched_count": result.matched_count, "modified_count": result.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


# Delete course
@router.delete("/courses/{id}")
async def delete_course(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id format")
    
    try:
        result = courses_collection.delete_one({"_id": oid})
        return {"deleted_count": result.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

