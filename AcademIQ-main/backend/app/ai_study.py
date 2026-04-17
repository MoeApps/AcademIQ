"""
AI quiz / study notes: uses OpenAI when OPENAI_API_KEY is set; otherwise deterministic stubs.
Persists to Mongo (ai_quizzes_collection, ai_notes_collection).
"""
from __future__ import annotations

import json
import os
import traceback
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from config.database import ai_notes_collection, ai_quizzes_collection


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _openai_chat_json(system: str, user: str) -> Dict[str, Any]:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")
    model = (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.35,
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"]
    return json.loads(content)


def _normalize_questions(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: List[Dict[str, Any]] = []
    for i, q in enumerate(raw, 1):
        if not isinstance(q, dict):
            continue
        choices = q.get("choices") or []
        if not isinstance(choices, list) or len(choices) < 2:
            continue
        prompt = str(q.get("prompt", "")).strip()
        if not prompt:
            continue
        str_choices = [str(c).strip() for c in choices if str(c).strip()]
        if len(str_choices) < 2:
            continue
        ans = str(q.get("answer", "")).strip()
        if ans not in str_choices:
            ans = str_choices[0]
        out.append(
            {
                "id": int(q.get("id", i)),
                "type": "mcq",
                "prompt": prompt,
                "choices": str_choices[:8],
                "answer": ans,
            }
        )
    return out


def _stub_questions(course_name: str, chapters: List[str]) -> List[Dict[str, Any]]:
    topic = ", ".join(chapters) if chapters else (course_name or "this course")
    return [
        {
            "id": 1,
            "type": "mcq",
            "prompt": f"Regarding {topic}: which study habit best supports understanding (not just memorizing)?",
            "choices": [
                "Only re-read slides",
                "Explain concepts in your own words",
                "Skip practice problems",
                "Avoid instructor office hours",
            ],
            "answer": "Explain concepts in your own words",
        },
        {
            "id": 2,
            "type": "mcq",
            "prompt": f"For {topic} topics: what should you do first when you see a difficult problem?",
            "choices": [
                "Guess randomly",
                "Break it into smaller steps and identify what you know",
                "Ignore the problem",
                "Copy a solution without reading",
            ],
            "answer": "Break it into smaller steps and identify what you know",
        },
    ]


def generate_quiz_content(
    course_id: str,
    course_name: Optional[str],
    chapters: List[str],
) -> Tuple[List[Dict[str, Any]], str, Optional[str]]:
    """
    Returns (questions, source, error_detail).
    source is 'openai' | 'stub'.
    error_detail is set when falling back from OpenAI.
    """
    cn = course_name or course_id
    ch = chapters or []
    n = max(2, min(8, int(os.getenv("AI_QUIZ_NUM_QUESTIONS", "4"))))

    if (os.getenv("OPENAI_API_KEY") or "").strip():
        system = (
            "You output only valid JSON. The object must have key 'questions' whose value is an array. "
            "Each question: id (number), type 'mcq', prompt (string), choices (array of 4 distinct strings), "
            "answer (exactly one string equal to one of choices)."
        )
        user = (
            f"Course: {cn}. Topics/chapters: {', '.join(ch) if ch else 'general course content'}.\n"
            f"Generate {n} multiple-choice questions that test understanding of these topics (not generic study tips)."
        )
        try:
            raw = _openai_chat_json(system, user)
            qs = _normalize_questions(raw.get("questions"))
            if len(qs) >= 2:
                return qs, "openai", None
            return _stub_questions(cn, ch), "stub", "LLM returned too few questions; used fallback."
        except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError, KeyError, RuntimeError) as e:
            print(f"ai_study generate_quiz OpenAI error: {e}\n{traceback.format_exc()}")
            return _stub_questions(cn, ch), "stub", str(e)

    return _stub_questions(cn, ch), "stub", None


def _stub_notes(course_name: str, chapters: List[str]) -> str:
    topic = ", ".join(chapters) if chapters else "the syllabus"
    cn = course_name or "this course"
    return (
        f"## Study outline (offline mode)\n\n"
        f"- **Course:** {cn}\n"
        f"- **Focus:** {topic}\n\n"
        "1. Skim each chapter heading and write three bullet takeaways.\n"
        "2. Work one practice problem per section.\n"
        "3. Revisit weak areas flagged by AcademIQ risk features.\n\n"
        "_Set `OPENAI_API_KEY` in `.env` for AI-generated notes._"
    )


def generate_notes_content(
    course_id: str,
    course_name: Optional[str],
    chapters: List[str],
) -> Tuple[str, str, Optional[str]]:
    cn = course_name or course_id
    ch = chapters or []

    if (os.getenv("OPENAI_API_KEY") or "").strip():
        system = "You output only valid JSON with a single key 'notes' whose value is markdown string (headings, bullets)."
        user = (
            f"Course: {cn}. Topics: {', '.join(ch) if ch else 'general'}.\n"
            "Write concise study notes: key definitions, common pitfalls, and 2–3 practice prompts."
        )
        try:
            raw = _openai_chat_json(system, user)
            notes = raw.get("notes")
            if isinstance(notes, str) and notes.strip():
                return notes.strip(), "openai", None
            return _stub_notes(cn, ch), "stub", "LLM returned empty notes; used fallback."
        except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError, KeyError, RuntimeError) as e:
            print(f"ai_study generate_notes OpenAI error: {e}\n{traceback.format_exc()}")
            return _stub_notes(cn, ch), "stub", str(e)

    return _stub_notes(cn, ch), "stub", None


def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: v for k, v in doc.items() if k != "_id"}
    oid = doc.get("_id")
    if oid is not None:
        out["id"] = str(oid)
    if isinstance(out.get("created_at"), datetime):
        out["created_at"] = out["created_at"].isoformat()
    return out


def save_quiz(
    course_id: str,
    course_name: Optional[str],
    chapters: List[str],
    questions: List[Dict[str, Any]],
    source: str,
) -> Tuple[Optional[str], bool]:
    doc = {
        "course_id": course_id,
        "course_name": course_name or course_id,
        "topics": list(chapters),
        "questions": questions,
        "source": source,
        "created_at": _utcnow(),
    }
    try:
        r = ai_quizzes_collection.insert_one(doc)
        return str(r.inserted_id), True
    except Exception as e:
        print(f"save_quiz Mongo error: {e}\n{traceback.format_exc()}")
        return None, False


def save_notes(
    course_id: str,
    course_name: Optional[str],
    chapters: List[str],
    notes: str,
    source: str,
) -> Tuple[Optional[str], bool]:
    doc = {
        "course_id": course_id,
        "course_name": course_name or course_id,
        "topics": list(chapters),
        "notes": notes,
        "source": source,
        "created_at": _utcnow(),
    }
    try:
        r = ai_notes_collection.insert_one(doc)
        return str(r.inserted_id), True
    except Exception as e:
        print(f"save_notes Mongo error: {e}\n{traceback.format_exc()}")
        return None, False


def list_quizzes_by_course(course_id: str, topic: Optional[str] = None, limit: int = 80) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {"course_id": course_id}
    if topic:
        q["topics"] = topic
    cur = ai_quizzes_collection.find(q).sort("created_at", -1).limit(limit)
    return [_serialize_doc(d) for d in cur]


def list_notes_by_course(course_id: str, topic: Optional[str] = None, limit: int = 80) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {"course_id": course_id}
    if topic:
        q["topics"] = topic
    cur = ai_notes_collection.find(q).sort("created_at", -1).limit(limit)
    return [_serialize_doc(d) for d in cur]


