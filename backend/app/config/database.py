from pymongo import MongoClient

from routes import moodle, student   # import both

app.include_router(moodle.router)
app.include_router(student.router)   # prefix is /api/student

# Use a short server selection timeout so operations fail fast when MongoDB is unreachable.
client = MongoClient(
    "mongodb+srv://khaledhsabllah:30538890@cluster0.zkhr2oz.mongodb.net/?appName=Cluster0",
    serverSelectionTimeoutMS=2000,
)

db = client.todo_db

collection_name = db["AcademIQ_DB"]
assignments_collection = db["assignments_collection"]
sessions_collection = db["sessions_collection"]
quizzes_collection = db["quizzes_collection"]
courses_collection = db["courses_collection"]
raw_moodle_payload_collection = db["raw_moodle_payload_collection"]

# Fixed: use db instead of database
feature_vectors_collection = db["feature_vectors"]
ml_results_collection = db["ml_results"]
