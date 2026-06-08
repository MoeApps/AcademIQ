"""
Seed learning-material text for local quiz testing (no Moodle PDF upload needed).

Reads ai/quiz_generator-main/assessment.txt and stores it against the demo
material created by test_payload.json (course 668, material mat_001).

Usage (from backend/):
    python -m app.scripts.seed_quiz_content
"""

from pathlib import Path

from app.repositories import material_repository

_REPO = Path(__file__).resolve().parents[3]
TEXT_FILE = _REPO / "ai" / "quiz_generator-main" / "assessment.txt"

DEFAULT_COURSE = "668"
DEFAULT_MATERIAL = "mat_001"


def seed_quiz_content(
    course_id: str = DEFAULT_COURSE,
    material_id: str = DEFAULT_MATERIAL,
) -> int:
    if not TEXT_FILE.is_file():
        raise FileNotFoundError(f"Sample text not found: {TEXT_FILE}")

    text = TEXT_FILE.read_text(encoding="utf-8")
    material_repository.set_content(course_id, material_id, text)
    return len(text)


if __name__ == "__main__":
    chars = seed_quiz_content()
    print(f"Stored {chars} chars on course {DEFAULT_COURSE} / material {DEFAULT_MATERIAL}")
