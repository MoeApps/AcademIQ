"""Phase 1 smoke tests for AcademIQ local setup."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "http://localhost:8000"
ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "backend" / "test_payload.json"

passed = 0
failed = 0
state: dict = {}


def req(method: str, path: str, body: dict | None = None, token: str | None = None, retries: int = 3):
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            data = None if body is None else json.dumps(body).encode()
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            request = urllib.request.Request(
                f"{BASE}{path}", data=data, headers=headers, method=method
            )
            with urllib.request.urlopen(request, timeout=120) as resp:
                raw = resp.read().decode() or "{}"
                return json.loads(raw) if raw.strip() else {}
        except Exception as exc:
            last_exc = exc
            if attempt < retries - 1:
                time.sleep(2)
    raise last_exc  # type: ignore[misc]


def step(name: str, fn):
    global passed, failed
    try:
        fn()
        print(f"[PASS] {name}")
        passed += 1
    except Exception as exc:
        print(f"[FAIL] {name} -> {exc}")
        failed += 1


def test_health():
    data = req("GET", "/health")
    if data.get("status") != "ok":
        raise RuntimeError(data)


def test_admin():
    login = req("POST", "/api/auth/login", {
        "email": "admin@academiq.local",
        "password": "Admin@12345",
    })
    token = login.get("token")
    if not token:
        raise RuntimeError("no token returned")
    users = req("GET", "/api/admin/users", token=token)
    if not isinstance(users, list) or len(users) < 1:
        raise RuntimeError("admin users empty")
    state["admin_token"] = token


def test_ingest():
    payload = json.loads(SAMPLE.read_text(encoding="utf-8"))
    result = req("POST", "/raw-moodle-payloads", payload)
    user_id = result.get("academiq_user_id")
    if not user_id:
        raise RuntimeError(f"ingest failed: {result}")
    state["ingest"] = result
    state["academiq_user_id"] = user_id

    # Get the synced student via admin and set a known password for testing.
    admin_token = state["admin_token"]
    users = req("GET", "/api/admin/users", token=admin_token)
    match = next((u for u in users if u.get("id") == user_id), None)
    if not match:
        raise RuntimeError(f"ingested user {user_id} not found in admin users")
    reset = req(
        "POST",
        f"/api/admin/users/{user_id}/reset-password",
        {"password": "StudentTest@123"},
        token=admin_token,
    )
    state["student_email"] = match["email"]
    state["student_password"] = reset.get("generatedPassword") or "StudentTest@123"


def test_student():
    login = req("POST", "/api/auth/login", {
        "email": state["student_email"],
        "password": state["student_password"],
    })
    if login.get("role") != "student":
        raise RuntimeError(f"expected student, got {login.get('role')}")
    token = login["token"]
    dash = req("GET", "/dashboard", token=token)
    if not dash.get("student"):
        raise RuntimeError("dashboard missing student")
    burnout = dash.get("burnout") or {}
    level = burnout.get("level")
    if level not in ("Safe", "Low Risk", "Medium Risk", "High Risk"):
        raise RuntimeError(f"invalid burnout level: {level}")
    print(f"  burnout level from ML model: {level}")
    study = dash.get("studyTime") or []
    if not study:
        raise RuntimeError("dashboard missing studyTime")
    print(f"  study-time points: {len(study)}")
    courses = req("GET", "/courses", token=token)
    if not courses:
        raise RuntimeError("no courses returned")
    cid = courses[0]["id"]
    req("GET", f"/courses/{cid}/performance", token=token)
    req("GET", f"/courses/{cid}/insights", token=token)


def test_frontend():
    for url in ("http://localhost:3000", "http://localhost:3000/signin"):
        with urllib.request.urlopen(url, timeout=30) as resp:
            if resp.status != 200:
                raise RuntimeError(f"{url} returned {resp.status}")


def main():
    step("Health", test_health)
    step("Admin login + users", test_admin)
    step("Moodle sample ingest", test_ingest)
    step("Student login + dashboard", test_student)
    step("Frontend pages", test_frontend)

    print(f"\nSummary: {passed} passed, {failed} failed")
    if state.get("student_email"):
        print(f"Test student email: {state['student_email']}")
        print(f"Test student password: {state['student_password']}")
    elif state.get("student_note"):
        print(state["student_note"])
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
