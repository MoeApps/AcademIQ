"""
Load existing Datasets/*.csv into PAIS SQLite. Does not modify any CSV.
Run from project root (AcademIQ-main): python -m backend.scripts.load_datasets_to_db
"""
import sys
from pathlib import Path

# Add project root so backend.app is importable
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.sql_db import engine, init_db, SessionLocal
from backend.app.models.pais_models import (
    Base,
    Student,
    Course,
    Enrollment,
    Activity,
    StudySession,
    QuizAttempt,
    AssignmentSubmission,
    Grade,
    Recommendation,
)


def load_students(db: Session, datasets_path: Path) -> int:
    df = pd.read_csv(datasets_path / "students.csv")
    for _, row in df.iterrows():
        db.add(Student(
            student_id=row["student_id"],
            enrollment_year=int(row["enrollment_year"]) if pd.notna(row["enrollment_year"]) else None,
            program=str(row["program"]) if pd.notna(row["program"]) else None,
            level=int(row["level"]) if pd.notna(row["level"]) else None,
        ))
    return len(df)


def load_courses(db: Session, datasets_path: Path) -> int:
    df = pd.read_csv(datasets_path / "courses.csv")
    for _, row in df.iterrows():
        db.add(Course(
            course_id=row["course_id"],
            course_name=str(row["course_name"]) if pd.notna(row["course_name"]) else None,
            semester=str(row["semester"]) if pd.notna(row["semester"]) else None,
        ))
    return len(df)


def load_enrollments(db: Session, datasets_path: Path) -> int:
    df = pd.read_csv(datasets_path / "enrollments.csv")
    for _, row in df.iterrows():
        db.add(Enrollment(student_id=row["student_id"], course_id=row["course_id"]))
    return len(df)


def load_activities(db: Session, datasets_path: Path) -> int:
    df = pd.read_csv(datasets_path / "activities.csv")
    for _, row in df.iterrows():
        db.add(Activity(
            activity_id=row["activity_id"],
            course_id=row["course_id"],
            type=str(row["type"]) if pd.notna(row["type"]) else None,
            title=str(row["title"]) if pd.notna(row["title"]) else None,
            due_date=str(row["due_date"]) if pd.notna(row["due_date"]) else None,
            max_grade=float(row["max_grade"]) if pd.notna(row["max_grade"]) else None,
        ))
    return len(df)


def load_study_sessions(db: Session, datasets_path: Path) -> int:
    df = pd.read_csv(datasets_path / "activity_logs.csv")
    for _, row in df.iterrows():
        db.add(StudySession(
            student_id=row["student_id"],
            course_id=row["course_id"],
            activity_id=row["activity_id"],
            event_type=str(row["event_type"]) if pd.notna(row["event_type"]) else None,
            time_spent_sec=int(row["time_spent_sec"]) if pd.notna(row["time_spent_sec"]) else None,
            timestamp=str(row["timestamp"]) if pd.notna(row["timestamp"]) else None,
        ))
    return len(df)


def load_quizzes(db: Session, datasets_path: Path) -> int:
    df = pd.read_csv(datasets_path / "quiz_attempts.csv")
    for _, row in df.iterrows():
        db.add(QuizAttempt(
            attempt_id=str(row["attempt_id"]),
            student_id=row["student_id"],
            activity_id=row["activity_id"],
            score=float(row["score"]) if pd.notna(row["score"]) else None,
            max_score=float(row["max_score"]) if pd.notna(row["max_score"]) else None,
            time_spent_sec=int(row["time_spent_sec"]) if pd.notna(row["time_spent_sec"]) else None,
            attempt_number=int(row["attempt_number"]) if pd.notna(row["attempt_number"]) else None,
            submitted_at=str(row["submitted_at"]) if pd.notna(row["submitted_at"]) else None,
        ))
    return len(df)


def load_assignments(db: Session, datasets_path: Path) -> int:
    df = pd.read_csv(datasets_path / "assignment_submissions.csv")
    for _, row in df.iterrows():
        db.add(AssignmentSubmission(
            submission_id=str(row["submission_id"]),
            student_id=row["student_id"],
            activity_id=row["activity_id"],
            score=float(row["score"]) if pd.notna(row["score"]) else None,
            max_score=float(row["max_score"]) if pd.notna(row["max_score"]) else None,
            submitted_at=str(row["submitted_at"]) if pd.notna(row["submitted_at"]) else None,
            late_submission=bool(row["late_submission"]) if pd.notna(row["late_submission"]) else False,
        ))
    return len(df)


def load_grades(db: Session, datasets_path: Path) -> int:
    df = pd.read_csv(datasets_path / "course_results.csv")
    for _, row in df.iterrows():
        db.add(Grade(
            student_id=row["student_id"],
            course_id=row["course_id"],
            final_grade=float(row["final_grade"]) if pd.notna(row["final_grade"]) else None,
            status=str(row["status"]) if pd.notna(row["status"]) else None,
        ))
    return len(df)


def main():
    datasets_path = project_root / "Datasets"
    if not datasets_path.exists():
        print(f"Datasets path not found: {datasets_path}")
        return 1

    print("Dropping and creating tables...")
    Base.metadata.drop_all(bind=engine)
    init_db()

    db = SessionLocal()
    try:
        n = load_students(db, datasets_path)
        print(f"Loaded {n} students")
        n = load_courses(db, datasets_path)
        print(f"Loaded {n} courses")
        n = load_enrollments(db, datasets_path)
        print(f"Loaded {n} enrollments")
        n = load_activities(db, datasets_path)
        print(f"Loaded {n} activities")
        n = load_study_sessions(db, datasets_path)
        print(f"Loaded {n} study_sessions")
        n = load_quizzes(db, datasets_path)
        print(f"Loaded {n} quiz attempts")
        n = load_assignments(db, datasets_path)
        print(f"Loaded {n} assignment submissions")
        n = load_grades(db, datasets_path)
        print(f"Loaded {n} grades")
        db.commit()
        print("Done. Dataset files were not modified.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        return 1
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
