# backend/main.py

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config.database import client, ensure_indexes
from app.config.settings import ALLOWED_ORIGINS
from app.routes import moodle, auth, admin, student_data

app = FastAPI(title="AcademIQ Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    try:
        ensure_indexes()
    except Exception as exc:
        print(f"Could not ensure indexes: {exc}")

    if os.environ.get("BOOTSTRAP_ADMIN", "").lower() == "true":
        try:
            from app.scripts.seed_admin import seed_admin

            seed_admin()
        except Exception as exc:
            print(f"Admin bootstrap skipped: {exc}")

    if os.environ.get("BOOTSTRAP_STUDENTS", "").lower() == "true":
        try:
            from app.scripts.seed_students import seed_students

            seed_students()
        except Exception as exc:
            print(f"Student bootstrap skipped: {exc}")


@app.get("/")
def root():
    return {"message": "AcademIQ Backend running. Go to /docs for API docs."}


@app.get("/health")
def health():
    """Liveness probe for Render — always returns 200 when the process is up."""
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    """Optional readiness probe — verifies MongoDB connectivity."""
    try:
        client.admin.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unreachable: {e}")


# Core routers — always available (student JWT auth + dashboard results).
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(moodle.router)
app.include_router(student_data.router)

from app.routes.student import demo_router as student_demo_router

app.include_router(student_demo_router)

# ML routers are optional — not loaded when ML deps are absent (auth-only deploy).
try:
    from app.routes import student, performance

    app.include_router(student.router)
    app.include_router(performance.router)
    print("[OK] ML routes mounted.")
except Exception as exc:
    print(f"[INFO] ML routes not mounted (auth-only or missing deps): {exc}")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
