"""
Run ALL phase checks in one command.

Usage (from backend/):
    python test_all_phases.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "http://localhost:8000"
ROOT = Path(__file__).resolve().parents[1]
BACKEND = Path(__file__).resolve().parent
FRONTEND = ROOT / "front-end"

passed = 0
failed = 0
warnings = 0


def ok(name: str):
    global passed
    print(f"[PASS] {name}")
    passed += 1


def fail(name: str, detail: str):
    global failed
    print(f"[FAIL] {name} -> {detail}")
    failed += 1


def warn(name: str, detail: str):
    global warnings
    print(f"[WARN] {name} -> {detail}")
    warnings += 1


def req(method: str, path: str, body=None, token=None, retries: int = 3):
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            data = None if body is None else json.dumps(body).encode()
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            request = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
            with urllib.request.urlopen(request, timeout=120) as resp:
                raw = resp.read().decode() or "{}"
                return json.loads(raw) if raw.strip() else {}
        except Exception as exc:
            last_exc = exc
            if attempt < retries - 1:
                time.sleep(2)
    raise last_exc  # type: ignore[misc]


def run_script(name: str, script: str) -> bool:
    result = subprocess.run(
        [sys.executable, str(BACKEND / script)],
        cwd=str(BACKEND),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        fail(name, (result.stdout + result.stderr)[-300:])
        return False
    ok(name)
    return True


def phase1():
    print("\n=== PHASE 1: Local setup ===")
    run_script("Phase 1 automated tests", "test_phase1.py")
    try:
        login = req("POST", "/api/auth/login", {
            "email": "phase1.test@academiq.local",
            "password": "StudentTest@123",
        })
        token = login.get("token")
        if token:
            ok("Student test account login")
        else:
            fail("Student test account login", "no token returned")
        return token
    except Exception as exc:
        fail("Student test account login", str(exc))
        return None


def phase2(token: str | None):
    print("\n=== PHASE 2: ML models ===")
    if not token:
        fail("Phase 2", "No student token (Phase 1 failed)")
        return

    try:
        from app.services.burnout_predict import available, predict_burnout
        if not available():
            fail("Burnout model loads", "artifacts missing")
        else:
            ok("Burnout model loads")
            sample = predict_burnout({"all_clicks": 100, "active_days": 5, "total_time_spent": 3600})
            if sample and sample.get("level"):
                ok("Burnout prediction works")
            else:
                fail("Burnout prediction", "empty result")
    except Exception as exc:
        fail("Burnout model", str(exc))

    try:
        from app.services.performance_predict import predict_performance
        perf = predict_performance({
            "all_clicks": 100, "active_days": 10, "access_frequency": 2.0,
            "material_clicks": 20, "quiz_attempts": 2, "assignment_submissions": 1,
            "total_time_spent": 5000, "procrastination_index": 2.0, "late_submission_count": 0,
        })
        if perf.get("classification"):
            ok("Performance model works")
        else:
            fail("Performance model", "no classification")
    except Exception as exc:
        fail("Performance model", str(exc))

    try:
        from app.services.grade_risk_predict import TF_AVAILABLE
        if TF_AVAILABLE:
            ok("Grade/risk model (TensorFlow) available")
        else:
            warn("Grade/risk model", "TensorFlow not installed — uses course-average fallback")
    except Exception as exc:
        warn("Grade/risk model", str(exc))

    courses = req("GET", "/courses", token=token)
    if not courses:
        fail("Student courses API", "empty list")
        return
    cid = courses[0]["id"]
    insights = req("GET", f"/courses/{cid}/insights", token=token)
    if insights.get("riskFactors"):
        ok("Insights API returns risk factors")
    else:
        fail("Insights API", "no risk factors")

    perf_page = req("GET", f"/courses/{cid}/performance", token=token)
    if perf_page.get("predictedGrade") is not None:
        ok("Performance API returns predicted grade")
    else:
        fail("Performance API", "missing predictedGrade")


def phase3(token: str | None):
    print("\n=== PHASE 3: Quiz + extension prep ===")
    if not token:
        fail("Phase 3", "No student token")
        return
    if not run_script("Phase 3 quiz tests", "test_phase3.py"):
        return

    ext = ROOT / "moodle-ai-extension"
    for f in ("manifest.json", "popup.js", "content.js", "background.js"):
        if (ext / f).is_file():
            ok(f"Extension file: {f}")
        else:
            fail(f"Extension file: {f}", "missing")

    main_py = (BACKEND / "main.py").read_text(encoding="utf-8")
    if "allow_origin_regex" in main_py and "chrome-extension" in main_py:
        ok("Backend allows Chrome extension CORS")
    else:
        fail("Extension CORS", "missing in main.py")


def phase4():
    print("\n=== PHASE 4: Production ready ===")
    for path, label in (
        (ROOT / "Dockerfile", "Dockerfile"),
        (FRONTEND / ".env.example", "front-end/.env.example"),
        (BACKEND / ".env.example", "backend/.env.example"),
    ):
        if path.is_file():
            ok(f"Deploy file: {label}")
        else:
            fail(f"Deploy file: {label}", "missing")

    api_ts = (FRONTEND / "src" / "lib" / "api.ts").read_text(encoding="utf-8")
    if "Authorization" in api_ts and "academiq.token" in api_ts:
        ok("Frontend Bearer token auth")
    else:
        fail("Frontend auth", "Bearer token not wired")

    main_py = (BACKEND / "main.py").read_text(encoding="utf-8")
    if "BOOTSTRAP_ADMIN" in main_py:
        ok("Cloud admin bootstrap hook")
    else:
        fail("Admin bootstrap", "missing from main.py")

    vercel = FRONTEND / "vercel.json"
    if vercel.is_file():
        ok("Vercel config present")
    else:
        warn("Vercel config", "vercel.json not found (optional for local dev)")

    prod_env = FRONTEND / ".env.production.example"
    if prod_env.is_file():
        ok("Production frontend env template")
    else:
        warn("Production env", ".env.production.example missing")

    build = subprocess.run(
        ["npm", "run", "build"],
        cwd=str(FRONTEND),
        capture_output=True,
        text=True,
        shell=True,
    )
    if build.returncode == 0:
        ok("Frontend production build")
    else:
        fail("Frontend build", (build.stdout + build.stderr)[-400:])


def wait_for_backend(max_attempts: int = 15, delay: float = 2.0) -> bool:
    for _ in range(max_attempts):
        try:
            req("GET", "/health")
            return True
        except Exception:
            time.sleep(delay)
    return False


def main():
    print("AcademIQ - full system check\n")
    if not wait_for_backend():
        fail("Backend is running", "Start backend first: python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000")
        print("\nRESULT: Cannot continue - start backend on port 8000")
        return 1
    ok("Backend is running")

    token = phase1()
    phase2(token)
    phase3(token)
    phase4()

    print("\n" + "=" * 50)
    print(f"DONE: {passed} passed, {failed} failed, {warnings} warnings")
    if failed == 0:
        print("All critical checks passed.")
    else:
        print("Fix the [FAIL] items above.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    sys.path.insert(0, str(BACKEND))
    sys.exit(main())
