"""
MongoDB connection for AcademIQ.

Set MONGODB_URI in the environment (or a .env file loaded by the app).
Default is local MongoDB — no credentials are stored in the repository.
"""
import os
from pymongo import MongoClient
from pymongo.server_api import ServerApi

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "todo_db")


def _create_client() -> MongoClient:
    kwargs = {"serverSelectionTimeoutMS": 5000}
    # Atlas and modern clusters often use SRV + Server API
    if "mongodb+srv://" in MONGODB_URI:
        return MongoClient(MONGODB_URI, server_api=ServerApi("1"), **kwargs)
    return MongoClient(MONGODB_URI, **kwargs)


client = _create_client()
db = client[MONGODB_DB_NAME]

collection_name = db["todo_collection"]
assignments_collection = db["assignments_collection"]
sessions_collection = db["sessions_collection"]
quizzes_collection = db["quizzes_collection"]
courses_collection = db["courses_collection"]
raw_moodle_payload_collection = db["raw_moodle_payload_collection"]
# AI-generated study material (React course page + optional OpenAI)
ai_quizzes_collection = db["ai_quizzes_collection"]
ai_notes_collection = db["ai_notes_collection"]


def ping_db() -> bool:
    """Verify MongoDB connectivity (called on FastAPI startup)."""
    try:
        client.admin.command("ping")
        print("MongoDB: ping OK")
        return True
    except Exception as e:
        print(f"MongoDB ping failed: {e}")
        return False
