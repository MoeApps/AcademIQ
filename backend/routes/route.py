from fastapi import APIRouter, HTTPException
from models.todos import Todo
from config.database import collection_name
from schema.schemas import list_serial

router = APIRouter()


# Get request method
@router.get("/todos")
async def get_todos():
    todos = list_serial(collection_name.find())
    return todos


# Post request method
@router.post("/todos")
async def post_todo(todo: Todo):
    try:
        result = collection_name.insert_one(todo.dict())
        return {"inserted_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))