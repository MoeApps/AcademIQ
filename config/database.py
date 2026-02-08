from pymongo import MongoClient

# Use a short server selection timeout so operations fail fast when MongoDB is unreachable.
client = MongoClient(
    "mongodb+srv://khaledhsabllah:30538890@cluster0.zkhr2oz.mongodb.net/?appName=Cluster0",
    serverSelectionTimeoutMS=2000,
)

db = client.todo_db

collection_name = db["todo_collection"]
assignments_collection = db["assignments_collection"]
sessions_collection = db["sessions_collection"]
quizzes_collection = db["quizzes_collection"]
courses_collection = db["courses_collection"]
raw_moodle_payload_collection = db["raw_moodle_payload_collection"]
