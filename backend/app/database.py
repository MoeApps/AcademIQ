import os
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# Read URI from environment if provided (safer for production)
uri = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://khaledhsabllah:30538890@cluster0.zkhr2oz.mongodb.net/?appName=Cluster0",
)

# Create a client instance (will lazily connect)
client = MongoClient(uri, server_api=ServerApi('1'))

def ping_db() -> bool:
    """Ping the MongoDB deployment to verify connectivity.

    Returns True if ping succeeds, False otherwise. Logs errors to stdout.
    """
    try:
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
        return True
    except Exception as e:
        print(f"MongoDB ping failed: {e}")
        return False


# Exported names: `client` and `ping_db` are available for import