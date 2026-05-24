from pymongo import MongoClient
from pymongo.server_api import ServerApi
import sys

# SRV connection string (replace with your actual password)
uri = "mongodb+srv://mohamed2106404_db:UINS6z2r6TpUiTNS@cluster0.hcvs2st.mongodb.net/?appName=Cluster0"

try:
    client = MongoClient(uri, server_api=ServerApi('1'))
    # Force a connection to verify
    client.admin.command('ping')
    print("✅ Connected to MongoDB Atlas!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)   # Stop the app if DB is unreachable

db = client.todo_db

# Collections
collection_name = db["todo_collection"]
assignments_collection = db["assignments_collection"]
sessions_collection = db["sessions_collection"]
quizzes_collection = db["quizzes_collection"]
courses_collection = db["courses_collection"]
raw_moodle_payload_collection = db["raw_moodle_payload_collection"]
feature_vectors_collection = db["feature_vectors"]
ml_results_collection = db["ml_results"]
auth_sessions_collection = db["sessions"]   # for auth tokens