# api_server.py
"""
FastAPI server — bridges the quiz generator pipeline with MongoDB and the Next.js frontend.

Run:
    uvicorn api_server:app --reload --port 8000

Environment variables (optional):
    MONGO_URI          MongoDB connection string  (default: mongodb://localhost:27017/)
    MONGO_DB           Database name              (default: management_quizzes)
    MONGO_COLLECTION   Collection name            (default: generated_quizzes)
"""

import os
import sys
import shutil
import tempfile
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Allow importing the quiz-generator modules from the same directory
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(__file__))

from quiz_generator import QuizGenerator
from exporter import MongoDBExporter
from data_structures import QuizQuestion

# ---------------------------------------------------------------------------
# MongoDB helpers
# ---------------------------------------------------------------------------
MONGO_URI        = os.getenv("MONGO_URI",        "mongodb://localhost:27017/")
MONGO_DB         = os.getenv("MONGO_DB",         "management_quizzes")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "generated_quizzes")


def _get_collection():
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5_000)
        client.admin.command("ping")
        return client[MONGO_DB][MONGO_COLLECTION], client
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"MongoDB unavailable: {exc}")


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------
class QuestionOut(BaseModel):
    question_num: int
    question: str
    question_type: str          # "multiple_choice" | "short_answer"
    options: List[str]
    correct_answer: str
    difficulty: float
    keywords: List[str]


class QuizOut(BaseModel):
    id: str
    created_at: str
    total_questions: int
    multiple_choice_count: int
    short_answer_count: int
    average_difficulty: float
    source_file: Optional[str]
    questions: List[QuestionOut]


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AcademIQ Quiz API",
    description="Generate management quizzes from PDF/PPTX and persist them in MongoDB.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict to your frontend domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# POST /api/generate  — upload a file, generate a quiz, save to MongoDB
# ---------------------------------------------------------------------------
@app.post("/api/generate", response_model=QuizOut, summary="Generate a quiz from a document")
async def generate_quiz(
    file: UploadFile = File(..., description="PDF or PPTX file"),
    num_questions: int = Query(10, ge=1, le=50, description="Number of questions to generate"),
):
    # ---- Validate file type ------------------------------------------------
    filename = file.filename or ""
    if not filename.lower().endswith((".pdf", ".ppt", ".pptx")):
        raise HTTPException(status_code=400, detail="Only PDF and PPT/PPTX files are supported.")

    # ---- Save upload to a temp file ----------------------------------------
    suffix = os.path.splitext(filename)[1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.flush()
        tmp_path = tmp.name
    finally:
        tmp.close()

    try:
        # ---- Run the quiz-generator pipeline --------------------------------
        generator = QuizGenerator()
        document   = generator.process_document(tmp_path)

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

        # ---- Persist to MongoDB ---------------------------------------------
        metadata = {
            "source_file": filename,
            "num_questions_requested": num_questions,
            "generator": "AcademIQ API v1",
        }
        doc_id = MongoDBExporter.export_to_mongodb(
            questions,
            db_name=MONGO_DB,
            collection_name=MONGO_COLLECTION,
            mongo_uri=MONGO_URI,
            metadata=metadata,
        )

        if doc_id is None:
            raise HTTPException(status_code=503, detail="Failed to save quiz to MongoDB.")

        # ---- Return the saved quiz ------------------------------------------
        return _fetch_quiz_by_id(doc_id)

    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# GET /api/quizzes  — list recent quizzes (newest first)
# ---------------------------------------------------------------------------
@app.get("/api/quizzes", response_model=List[QuizOut], summary="List recent quizzes")
def list_quizzes(limit: int = Query(20, ge=1, le=100)):
    collection, client = _get_collection()
    try:
        docs = list(collection.find({}, sort=[("created_at", -1)]).limit(limit))
        return [_doc_to_quiz(doc) for doc in docs]
    finally:
        client.close()


# ---------------------------------------------------------------------------
# GET /api/quizzes/{quiz_id}  — fetch a single quiz
# ---------------------------------------------------------------------------
@app.get("/api/quizzes/{quiz_id}", response_model=QuizOut, summary="Fetch a single quiz")
def get_quiz(quiz_id: str):
    return _fetch_quiz_by_id(quiz_id)


# ---------------------------------------------------------------------------
# DELETE /api/quizzes/{quiz_id}
# ---------------------------------------------------------------------------
@app.delete("/api/quizzes/{quiz_id}", summary="Delete a quiz")
def delete_quiz(quiz_id: str):
    from bson import ObjectId
    collection, client = _get_collection()
    try:
        result = collection.delete_one({"_id": ObjectId(quiz_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Quiz not found.")
        return {"deleted": quiz_id}
    finally:
        client.close()


# ---------------------------------------------------------------------------
# GET /api/health
# ---------------------------------------------------------------------------
@app.get("/api/health", summary="Health check")
def health():
    try:
        _, client = _get_collection()
        client.close()
        mongo_ok = True
    except Exception:
        mongo_ok = False
    return {"status": "ok", "mongodb": mongo_ok}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _fetch_quiz_by_id(quiz_id: str) -> QuizOut:
    from bson import ObjectId
    collection, client = _get_collection()
    try:
        doc = collection.find_one({"_id": ObjectId(quiz_id)})
        if doc is None:
            raise HTTPException(status_code=404, detail="Quiz not found.")
        return _doc_to_quiz(doc)
    finally:
        client.close()


def _doc_to_quiz(doc: dict) -> QuizOut:
    return QuizOut(
        id=str(doc["_id"]),
        created_at=doc["created_at"].isoformat() if hasattr(doc["created_at"], "isoformat") else str(doc["created_at"]),
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
