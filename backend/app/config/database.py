import sys

import certifi
from pymongo import ASCENDING, MongoClient
from pymongo.server_api import ServerApi

from app.config.settings import MONGODB_URI, MONGODB_DB_NAME

uri = MONGODB_URI

try:
    client = MongoClient(uri, server_api=ServerApi("1"), tlsCAFile=certifi.where())
    client.admin.command("ping")
    print("[OK] Connected to MongoDB Atlas!")
except Exception as e:
    print(f"[ERROR] MongoDB connection failed: {e}")
    sys.exit(1)

db = client[MONGODB_DB_NAME]

# ── Collections ────────────────────────────────────────────────────────────────
collection_name                  = db["AcademIQ"]
assignments_collection           = db["assignments_collection"]
sessions_collection              = db["sessions_collection"]
quizzes_collection               = db["quizzes_collection"]
courses_collection               = db["courses_collection"]
raw_moodle_payload_collection    = db["raw_moodle_payload_collection"]
feature_vectors_collection       = db["feature_vectors"]
ml_results_collection            = db["ml_results"]
# Append-only prediction history (one doc per recorded snapshot, capped at
# 30/user) — separate from ml_results, which is upsert-by-(user, model) and
# structurally holds only the latest snapshot. See services/prediction_history.py.
ml_results_history_collection    = db["ml_results_history"]
auth_sessions_collection         = db["sessions"]

# AcademIQ user accounts (admins + students).
users_collection = db["users"]
user             = users_collection   # backwards-compatible alias

# Normalized Moodle-data collections (see services/moodle_ingest.py).
course_materials_collection = db["course_materials"]
student_metrics_collection  = db["student_metrics"]
student_events_collection   = db["student_events"]
system_events_collection    = db["system_events"]

# Token collections — all short-lived, hashed before storage, single-use.
password_reset_tokens_collection = db["password_reset_tokens"]
magic_link_tokens_collection     = db["magic_link_tokens"]


# ── Index helpers ──────────────────────────────────────────────────────────────

def _ensure_unique_partial(field: str, name: str) -> None:
    """
    Create a unique index that only applies when `field` is a string.

    A partial index (not sparse) is required because we store explicit nulls
    for unset identifiers, and a sparse unique index still collides on
    present-but-null values. Drops and recreates if an older (sparse) index
    with the same name exists.
    """
    spec = dict(
        unique=True,
        partialFilterExpression={field: {"$type": "string"}},
        name=name,
    )
    try:
        users_collection.create_index([(field, ASCENDING)], **spec)
    except Exception:
        try:
            users_collection.drop_index(name)
        except Exception:
            pass
        users_collection.create_index([(field, ASCENDING)], **spec)


def ensure_indexes() -> None:
    """
    Create all indexes the auth/identity-mapping/ingest layers rely on.
    Safe to call repeatedly — invoked on app startup from main.py.
    """
    # ── Users ──────────────────────────────────────────────────────────────
    users_collection.create_index([("email", ASCENDING)], unique=True, name="uniq_email")
    _ensure_unique_partial("moodle_user_id", "uniq_moodle_user_id")
    _ensure_unique_partial("student_id",     "uniq_student_id")

    # ── Auth sessions ──────────────────────────────────────────────────────
    auth_sessions_collection.create_index(
        [("token_hash", ASCENDING)], unique=True, name="uniq_token_hash"
    )
    auth_sessions_collection.create_index(
        [("expires_at", ASCENDING)], name="session_expiry"
    )

    # ── Password reset tokens ──────────────────────────────────────────────
    password_reset_tokens_collection.create_index(
        [("token_hash", ASCENDING)], unique=True, name="uniq_reset_token_hash"
    )
    password_reset_tokens_collection.create_index(
        [("expires_at", ASCENDING)], name="reset_token_expiry"
    )

    # ── Magic-link tokens ──────────────────────────────────────────────────
    magic_link_tokens_collection.create_index(
        [("token_hash", ASCENDING)], unique=True, name="uniq_magic_token_hash"
    )
    magic_link_tokens_collection.create_index(
        [("expires_at", ASCENDING)], name="magic_token_expiry"
    )

    # ── Normalized Moodle data ─────────────────────────────────────────────
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

    # One snapshot per student — re-syncs update in place.
    for coll, name in (
        (raw_moodle_payload_collection, "uniq_raw_user"),
        (feature_vectors_collection,    "uniq_feature_user"),
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

    # ── ML prediction history ────────────────────────────────────────────
    # Compound index covers both query directions this collection needs:
    # "last N for this user" (descending — dedup check + cap logic in
    # prediction_history.record_prediction) and "oldest-to-newest" (ascending
    # — prediction_history.get_history for charting). Mongo can walk a
    # compound index in either direction, so one index serves both instead
    # of paying write overhead for two.
    try:
        ml_results_history_collection.create_index(
            [("academiq_user_id", ASCENDING), ("recorded_at", ASCENDING)],
            name="user_recorded_at",
        )
    except Exception as exc:
        print(f"[WARN] could not create user_recorded_at index: {exc}")