# app/routes/quiz_router.py
"""
Quiz-generator routes — mounted into the existing AcademIQ backend.

Endpoints:
    POST   /api/quiz/generate          upload PDF/PPTX, generate & save quiz
    GET    /api/quiz/quizzes           list recent quizzes (newest first)
    GET    /api/quiz/quizzes/{id}      fetch a single quiz
    DELETE /api/quiz/quizzes/{id}      delete a quiz
    GET    /api/quiz/health            health check
"""

import os
import sys
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

# ── Make quiz_generator modules importable ────────────────────────────────────
# File lives at:  AcademIQ/backend/app/routes/quiz_router.py
# 4x .parent      → AcademIQ/
# then down into  → AcademIQ/ai/quiz_generator-main/
_QUIZ_GEN_DIR = Path(__file__).resolve().parent.parent.parent.parent / "ai" / "quiz_generator-main"
if str(_QUIZ_GEN_DIR) not in sys.path:
    sys.path.insert(0, str(_QUIZ_GEN_DIR))

try:
    from quiz_generator import QuizGenerator
    from data_structures import QuizQuestion
    _QUIZ_GEN_AVAILABLE = True
    _QUIZ_GEN_ERROR = ""
except Exception as _import_err:
    _QUIZ_GEN_AVAILABLE = False
    _QUIZ_GEN_ERROR = str(_import_err)

# ── Reuse the existing app MongoDB collection ─────────────────────────────────
try:
    from app.config.database import quizzes_collection
    _COLLECTION_READY = True
except Exception as _db_err:
    _COLLECTION_READY = False
    quizzes_collection = None
    print(f"[WARN] quiz_router: could not import quizzes_collection: {_db_err}")


def _col():
    """Return the quizzes collection, raising 503 if unavailable."""
    if not _COLLECTION_READY or quizzes_collection is None:
        raise HTTPException(status_code=503, detail="Database collection unavailable.")
    return quizzes_collection


# ── Pydantic models ───────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    question_num:   int
    question:       str
    question_type:  str
    options:        List[str]
    correct_answer: str
    difficulty:     float
    keywords:       List[str]


class QuizOut(BaseModel):
    id:                    str
    created_at:            str
    total_questions:       int
    multiple_choice_count: int
    short_answer_count:    int
    average_difficulty:    float
    source_file:           Optional[str]
    questions:             List[QuestionOut]


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/quiz", tags=["Quiz Generator"])


# POST /api/quiz/generate
@router.post("/generate", response_model=QuizOut, summary="Generate a quiz from a PDF or PPTX")
async def generate_quiz(
    file: UploadFile = File(..., description="PDF or PPTX file"),
    num_questions: int = Query(10, ge=1, le=50, description="Number of questions"),
):
    if not _QUIZ_GEN_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=f"Quiz generator modules not available: {_QUIZ_GEN_ERROR}",
        )

    filename = file.filename or ""
    if not filename.lower().endswith((".pdf", ".ppt", ".pptx")):
        raise HTTPException(status_code=400, detail="Only PDF and PPT/PPTX files are supported.")

    # Save upload to a temp file
    suffix = Path(filename).suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.flush()
        tmp_path = tmp.name
    finally:
        tmp.close()

    try:
        generator = QuizGenerator()
        document  = generator.process_document(tmp_path)

        if not document.concepts:
            raise HTTPException(
                status_code=422,
                detail="No valid concepts found in the document. Please try a different file.",
            )

        questions: List[QuizQuestion] = generator.generate_quiz(document, num_questions)

        if not questions:
            raise HTTPException(
                status_code=422,
                detail="Could not generate questions from this document.",
            )

        # Build the document and save directly using the app's collection
        quiz_doc = {
            "created_at": datetime.utcnow(),
            "total_questions": len(questions),
            "multiple_choice_count": sum(1 for q in questions if q.question_type == "multiple_choice"),
            "short_answer_count":    sum(1 for q in questions if q.question_type == "short_answer"),
            "average_difficulty": round(
                sum(q.difficulty for q in questions) / len(questions), 2
            ),
            "questions": [
                {
                    "question_num":  idx + 1,
                    "question":      q.question,
                    "question_type": q.question_type,
                    "options":       sorted(q.options) if q.options else [],
                    "correct_answer": q.correct_answer,
                    "context":       (q.context or "")[:600],
                    "difficulty":    round(q.difficulty, 2),
                    "keywords":      q.keywords or [],
                }
                for idx, q in enumerate(questions)
            ],
            "metadata": {
                "source_file": filename,
                "num_questions_requested": num_questions,
                "generator": "AcademIQ Quiz Generator",
            },
        }

        result = _col().insert_one(quiz_doc)
        doc_id = str(result.inserted_id)
        print(f"[OK] Quiz saved — id: {doc_id}, questions: {len(questions)}")

        return _fetch_quiz_by_id(doc_id)

    finally:
        os.unlink(tmp_path)


# GET /api/quiz/quizzes
@router.get("/quizzes", response_model=List[QuizOut], summary="List recent quizzes")
def list_quizzes(limit: int = Query(20, ge=1, le=100)):
    docs = list(_col().find({}, sort=[("created_at", -1)]).limit(limit))
    return [_doc_to_quiz(doc) for doc in docs]


# GET /api/quiz/quizzes/{quiz_id}
@router.get("/quizzes/{quiz_id}", response_model=QuizOut, summary="Fetch a single quiz")
def get_quiz(quiz_id: str):
    return _fetch_quiz_by_id(quiz_id)


# DELETE /api/quiz/quizzes/{quiz_id}
@router.delete("/quizzes/{quiz_id}", summary="Delete a quiz")
def delete_quiz(quiz_id: str):
    from bson import ObjectId
    result = _col().delete_one({"_id": ObjectId(quiz_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return {"deleted": quiz_id}


# GET /api/quiz/health
@router.get("/health", summary="Quiz generator health check")
def quiz_health():
    return {
        "quiz_generator_available": _QUIZ_GEN_AVAILABLE,
        "quiz_generator_path": str(_QUIZ_GEN_DIR),
        "quiz_generator_path_exists": _QUIZ_GEN_DIR.exists(),
        "collection_ready": _COLLECTION_READY,
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _fetch_quiz_by_id(quiz_id: str) -> QuizOut:
    from bson import ObjectId
    doc = _col().find_one({"_id": ObjectId(quiz_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return _doc_to_quiz(doc)


def _doc_to_quiz(doc: dict) -> QuizOut:
    return QuizOut(
        id=str(doc["_id"]),
        created_at=(
            doc["created_at"].isoformat()
            if hasattr(doc.get("created_at"), "isoformat")
            else str(doc.get("created_at", ""))
        ),
        total_questions=doc.get("total_questions", 0),
        multiple_choice_count=doc.get("multiple_choice_count", 0),
        short_answer_count=doc.get("short_answer_count", 0),
        average_difficulty=doc.get("average_difficulty", 0.0),
        source_file=doc.get("metadata", {}).get("source_file"),
        questions=[
            QuestionOut(
                question_num=q.get("question_num", i + 1),
                question=q.get("question", ""),
                question_type=q.get("question_type", "multiple_choice"),
                options=q.get("options", []),
                correct_answer=q.get("correct_answer", ""),
                difficulty=q.get("difficulty", 0.5),
                keywords=q.get("keywords", []),
            )
            for i, q in enumerate(doc.get("questions", []))
        ],
    )