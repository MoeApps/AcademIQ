"""
PAIS schema: students, courses, enrollments, grades, quizzes, assignments,
study_sessions (activities), learning_preferences, recommendations.
SQLAlchemy declarative base; compatible with SQLite (dev) and PostgreSQL (deploy).
"""
from datetime import datetime
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(32), unique=True, nullable=False, index=True)
    enrollment_year = Column(Integer)
    program = Column(String(64))
    level = Column(Integer)


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(String(32), unique=True, nullable=False, index=True)
    course_name = Column(String(256))
    semester = Column(String(64))


class Enrollment(Base):
    __tablename__ = "enrollments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(32), ForeignKey("students.student_id"), nullable=False, index=True)
    course_id = Column(String(32), ForeignKey("courses.course_id"), nullable=False, index=True)


class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(String(64), unique=True, nullable=False, index=True)
    course_id = Column(String(32), ForeignKey("courses.course_id"), nullable=False)
    type = Column(String(32))  # quiz, assignment, resource
    title = Column(String(256))
    due_date = Column(String(32))
    max_grade = Column(Float)


class StudySession(Base):
    """One row per study session (from activity_logs)."""
    __tablename__ = "study_sessions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(32), nullable=False, index=True)
    course_id = Column(String(32), nullable=False, index=True)
    activity_id = Column(String(64), nullable=False)
    event_type = Column(String(32))
    time_spent_sec = Column(Integer)
    timestamp = Column(String(32))


class QuizAttempt(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(String(64), unique=True)
    student_id = Column(String(32), nullable=False, index=True)
    activity_id = Column(String(64), nullable=False)
    score = Column(Float)
    max_score = Column(Float)
    time_spent_sec = Column(Integer)
    attempt_number = Column(Integer)
    submitted_at = Column(String(32))


class AssignmentSubmission(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(String(64), unique=True)
    student_id = Column(String(32), nullable=False, index=True)
    activity_id = Column(String(64), nullable=False)
    score = Column(Float)
    max_score = Column(Float)
    submitted_at = Column(String(32))
    late_submission = Column(Boolean, default=False)


class Grade(Base):
    """One row per (student, course) final grade."""
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(32), nullable=False, index=True)
    course_id = Column(String(32), nullable=False, index=True)
    final_grade = Column(Float)
    status = Column(String(16))  # PASS, FAIL


class LearningPreference(Base):
    __tablename__ = "learning_preferences"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(32), nullable=False, index=True)
    preference_key = Column(String(64))
    preference_value = Column(Text)


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(32), nullable=False, index=True)
    course_id = Column(String(32))
    type = Column(String(64))  # e.g. resource, exercise, pathway
    reason = Column(Text)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
