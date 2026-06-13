# backend/main.py

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config.database import client, ensure_indexes
from app.routes import moodle, auth, admin, student_data, system_status
from app.routes.ml_result import router as ml_result_router

app = FastAPI(title="AcademIQ Backend", version="1.0")

import os

_allowed = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [o.strip() for o in _allowed.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    try:
        ensure_indexes()
    except Exception as exc:
        print(f"[WARN] Could not ensure indexes: {exc}")


@app.get("/")
def root():
    return {"message": "AcademIQ Backend running. Go to /docs for API docs."}


@app.get("/health")
def health():
    try:
        client.admin.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database unreachable: {str(e)}")


# ── Core routers — always available ───────────────────────────────────────────
app.include_router(auth.router)           # /api/auth/*
app.include_router(admin.router)          # /api/admin/users (admin-only)
app.include_router(moodle.router)         # /raw-moodle-payloads
app.include_router(student_data.router)   # /courses, /dashboard, /courses/{id}/...
app.include_router(system_status.router)  # /api/system/status
app.include_router(ml_result_router)      # /api/ml/result

# ── ML routers — optional, skipped if deps are missing ───────────────────────
try:
    from app.routes import student, performance
    app.include_router(student.router)
    app.include_router(performance.router)
    print("[OK] ML routes mounted.")
except Exception as exc:
    print(f"[WARN] ML routes NOT mounted (missing deps): {exc}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
