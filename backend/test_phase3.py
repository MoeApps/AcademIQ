"""Phase 3 tests: quiz content + quiz generation API."""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

BASE = "http://localhost:8000"
ROOT = Path(__file__).resolve().parents[1]


def req(method, path, body=None, token=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=120) as resp:
        raw = resp.read().decode() or "{}"
        return json.loads(raw) if raw.strip() else {}


def main():
    from app.scripts.seed_quiz_content import seed_quiz_content

    chars = seed_quiz_content()
    print(f"[OK] Seeded quiz text ({chars} chars)")

    login = req("POST", "/api/auth/login", {
        "email": "phase1.test@academiq.local",
        "password": "StudentTest@123",
    })
    token = login["token"]

    courses = req("GET", "/courses", token=token)
    if not courses:
        print("[FAIL] No courses")
        return 1
    cid = courses[0]["id"]

    materials = req("GET", f"/courses/{cid}/materials", token=token)
    ready = [m for m in materials if m.get("hasContent")]
    if not ready:
        print("[FAIL] No materials with hasContent=true")
        return 1
    print(f"[OK] {len(ready)} material(s) ready for quiz")

    quiz = req("POST", f"/courses/{cid}/quiz", {"materialIds": [ready[0]["id"]]}, token=token)
    questions = quiz.get("questions") or []
    if len(questions) < 1:
        print("[FAIL] Quiz returned no questions")
        return 1
    if questions[0].get("id") == "placeholder":
        print(f"[FAIL] Placeholder quiz: {questions[0].get('question')}")
        return 1

    print(f"[OK] Generated {len(questions)} quiz question(s)")
    print(f"  Sample: {questions[0].get('question', '')[:80]}...")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    sys.exit(main())
