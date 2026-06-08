import sys

import certifi
from pymongo import ASCENDING, MongoClient
from pymongo.server_api import ServerApi

from app.config.settings import MONGODB_URI, MONGODB_DB_NAME

if not MONGODB_URI:
    print("[ERROR] MONGODB_URI is not set. Copy backend/.env.example to backend/.env")
    sys.exit(1)

uri = MONGODB_URI

# Use certifi's CA bundle for the TLS handshake. Atlas connections on Windows/
# macOS often fail with TLS errors when the OS cert store is stale; certifi
# avoids that. (Plain-ASCII logs below — emoji crash cp1252 Windows consoles.)
try:
    client = MongoClient(uri, server_api=ServerApi("1"), tlsCAFile=certifi.where())
    # Force a connection to verify
    client.admin.command("ping")
    print("[OK] Connected to MongoDB Atlas!")
except Exception as e:
    print(f"[ERROR] MongoDB connection failed: {e}")
    sys.exit(1)   # Stop the app if DB is unreachable

db = client[MONGODB_DB_NAME]

# Collections
collection_name = db["AcademIQ"]
assignments_collection = db["assignments_collection"]
sessions_collection = db["sessions_collection"]
quizzes_collection = db["quizzes_collection"]
courses_collection = db["courses_collection"]
raw_moodle_payload_collection = db["raw_moodle_payload_collection"]
feature_vectors_collection = db["feature_vectors"]
ml_results_collection = db["ml_results"]
auth_sessions_collection = db["sessions"]   # for auth session tokens

# AcademIQ user accounts (admins + students). `users_collection` is the
# canonical name used throughout the new auth/admin code; `user` is kept as a
# backwards-compatible alias for any older references.
users_collection = db["users"]
user = users_collection

# Normalized Moodle-data collections (see services/moodle_ingest.py). Materials
# are stored ONCE here instead of being duplicated inside each student payload.
course_materials_collection = db["course_materials"]   # canonical materials
student_metrics_collection = db["student_metrics"]     # per-(user,course) metrics
student_events_collection = db["student_events"]       # per-user event stream


def _ensure_unique_partial(field: str, name: str) -> None:
    """
    Create a unique index that only applies when `field` is a string.

    A *partial* index (not sparse) is required because we store explicit nulls
    for unset identifiers, and a sparse unique index still collides on
    present-but-null values — only a partialFilterExpression excludes them. Drops
    and recreates if an older (sparse) index with the same name exists.
    """
    spec = dict(
        unique=True,
        partialFilterExpression={field: {"$type": "string"}},
        name=name,
    )
    try:
        users_collection.create_index([(field, ASCENDING)], **spec)
    except Exception:
        # Conflicting older index definition — drop and recreate.
        try:
            users_collection.drop_index(name)
        except Exception:
            pass
        users_collection.create_index([(field, ASCENDING)], **spec)


def ensure_indexes() -> None:
    """
    Create the indexes the auth/identity-mapping layer relies on. Safe to call
    repeatedly. Invoked on app startup from main.py.
    """
    # Email is the login identifier — must be unique.
    users_collection.create_index([("email", ASCENDING)], unique=True, name="uniq_email")
    # Moodle identity linkage keys — unique only among real (string) values, so
    # any number of accounts may have a null moodle_user_id / student_id.
    _ensure_unique_partial("moodle_user_id", "uniq_moodle_user_id")
    _ensure_unique_partial("student_id", "uniq_student_id")
    # Session token lookups + TTL-style expiry housekeeping.
    auth_sessions_collection.create_index([("token_hash", ASCENDING)], unique=True, name="uniq_token_hash")
    auth_sessions_collection.create_index([("expires_at", ASCENDING)], name="session_expiry")

    # Normalized Moodle data — uniqueness keys that guarantee a material/metric/
    # event is stored exactly once (the dedup contract for ingestion).
    course_materials_collection.create_index(
        [("course_id", ASCENDING), ("material_id", ASCENDING)],
        unique=True, name="uniq_course_material",
    )
    student_metrics_collection.create_index(
        [("academiq_user_id", ASCENDING), ("course_id", ASCENDING)],
        unique=True, name="uniq_user_course_metrics",
    )
    student_events_collection.create_index(
        [("academiq_user_id", ASCENDING), ("event_id", ASCENDING)],
        unique=True, name="uniq_user_event",
    )

    # One current snapshot per student — re-syncs update the same document
    # rather than inserting a new one. Partial filter so legacy docs without the
    # field don't collide.
    for coll, name in (
        (raw_moodle_payload_collection, "uniq_raw_user"),
        (feature_vectors_collection, "uniq_feature_user"),
    ):
        try:
            coll.create_index(
                [("academiq_user_id", ASCENDING)],
                unique=True,
                partialFilterExpression={"academiq_user_id": {"$type": "string"}},
                name=name,
            )
        except Exception as exc:
            print(f"[WARN] could not create {name} (resolve duplicates first): {exc}")
