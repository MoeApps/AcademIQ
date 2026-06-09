"""
Pytest configuration and shared fixtures for AcademIQ backend tests.
"""
import sys
import os
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from mongomock import MongoClient

# Add parent directory to path so we can import app module
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set test environment before importing app
os.environ["MONGODB_URI"] = "mongodb://localhost:27017"
os.environ["MONGODB_DB_NAME"] = "academiq_test"


@pytest.fixture
def mock_mongo_client():
    """Provide a mongomock client for testing (no real database needed)."""
    return MongoClient()


@pytest.fixture
def mock_database(mock_mongo_client):
    """Provide a mock MongoDB database."""
    return mock_mongo_client["academiq_test"]


@pytest.fixture
def mock_collections(mock_database):
    """Provide all mock collections used by AcademIQ."""
    return {
        "users_collection": mock_database["users"],
        "sessions_collection": mock_database["sessions"],
        "courses_collection": mock_database["courses"],
        "assignments_collection": mock_database["assignments"],
        "feature_vectors_collection": mock_database["feature_vectors"],
        "ml_results_collection": mock_database["ml_results"],
        "course_materials_collection": mock_database["course_materials"],
        "student_metrics_collection": mock_database["student_metrics"],
        "student_events_collection": mock_database["student_events"],
    }


@pytest.fixture
def test_client(monkeypatch, mock_collections, mock_database):
    """
    Provide a TestClient with mocked MongoDB connections.
    This patches all database collections before importing the main app.
    """
    # Patch the database module before importing main
    from app.config import database
    
    for collection_name, mock_collection in mock_collections.items():
        monkeypatch.setattr(database, collection_name, mock_collection)
    
    # Also patch the db object itself
    monkeypatch.setattr(database, "db", mock_database)
    monkeypatch.setattr(database, "client", mock_database.client)
    
    # Now import and create the app
    from main import app
    
    return TestClient(app)


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "student@test.academiq.local",
        "password_hash": "$2b$12$abc123",  # bcrypt hash (fake)
        "role": "student",
        "full_name": "Test Student",
        "created_at": "2025-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_admin_data():
    """Sample admin user data for testing."""
    return {
        "email": "admin@test.academiq.local",
        "password_hash": "$2b$12$admin123",  # bcrypt hash (fake)
        "role": "admin",
        "full_name": "Test Admin",
        "created_at": "2025-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_course_data():
    """Sample course data for testing."""
    return {
        "course_id": "101",
        "name": "Introduction to Python",
        "description": "Learn Python basics",
        "visits": 15,
        "time_spent_ms": 3600000,
        "final_grade": 87.5,
    }


@pytest.fixture
def sample_assignment_data():
    """Sample assignment data for testing."""
    return {
        "title": "Assignment 1: Variables",
        "due_date": "2025-02-15T23:59:59Z",
        "submitted": True,
        "grade": 92,
        "course_id": "101",
    }


@pytest.fixture
def sample_feature_vector_data():
    """Sample feature vector data from extension payload."""
    return {
        "student_id": "stu_001",
        "course_id": "101",
        "all_clicks": 145,
        "active_days": 18,
        "access_frequency": 8.5,
        "material_clicks": 62,
        "quiz_attempts": 5,
        "assignment_submissions": 3,
        "total_time_spent": 14400,  # seconds
        "procrastination_index": 2.3,
        "late_submission_count": 1,
        "avg_quiz_score": 78.0,
    }


@pytest.fixture
def sample_moodle_payload():
    """Sample Moodle payload from Chrome extension."""
    return {
        "student": {
            "moodle_user_id": 42,
            "student_id": "stu_001",
            "full_name": "John Doe",
            "email": "john@university.edu",
            "enrollment_year": 2024,
        },
        "courses": [
            {
                "course_id": "101",
                "course_name": "Python Programming",
                "visits": 15,
                "time_spent_ms": 3600000,
                "final_grade": 87.5,
            }
        ],
        "materials": [
            {
                "course_id": "101",
                "material_id": "mat_001",
                "title": "Lecture 1: Variables",
                "type": "learning_material",
                "clicks": 5,
            }
        ],
        "events": [
            {
                "event_id": "evt_001",
                "timestamp": 1704067200,
                "event_type": "click",
                "resource": "assignment",
            }
        ],
    }
