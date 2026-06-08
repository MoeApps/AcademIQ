"""
Seed demo student accounts into MongoDB with bcrypt-hashed passwords.

Idempotent: skips any student_id that already exists.

Run from the backend/ directory:

    python -m app.scripts.seed_students
"""

from datetime import datetime, timezone

from app.config.database import ensure_indexes
from app.models.user import ROLE_STUDENT
from app.repositories import user_repository
from app.services.auth_service import hash_password

STUDENTS = [
    {
        "student_id": "student1",
        "name": "Ahmed Ali",
        "password": "password123",
        "role": ROLE_STUDENT,
    },
    {
        "student_id": "student2",
        "name": "Fatima Mohamed",
        "password": "pass456",
        "role": ROLE_STUDENT,
    },
]


def seed_students() -> None:
    ensure_indexes()
    now = datetime.now(timezone.utc)

    for spec in STUDENTS:
        existing = user_repository.find_by_student_id(spec["student_id"])
        if existing:
            print(f"Student already exists: {spec['student_id']} (no changes made).")
            continue

        # Synthetic email satisfies the unique email index without exposing login via email.
        document = {
            "student_id": spec["student_id"],
            "name": spec["name"],
            "email": f"{spec['student_id']}@students.academiq.local",
            "password_hash": hash_password(spec["password"]),
            "role": spec["role"],
            "created_at": now,
        }
        user_repository.create(document)
        print(f"Created student: {spec['student_id']} ({spec['name']})")


if __name__ == "__main__":
    seed_students()
