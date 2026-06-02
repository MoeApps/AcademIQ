# backend/main.py

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

from app.config.database import client, ensure_indexes
# Core routers (no heavy ML/data-science deps).
from app.routes import moodle, auth, admin, student_data

app = FastAPI(title="AcademIQ Backend", version="1.0")

# NOTE: cookie-based sessions require explicit origins (not "*") when
# allow_credentials is True. Configure ALLOWED_ORIGINS in production; the
# localhost defaults cover the Next.js dev server.
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
    # Create auth/identity indexes once the app boots.
    try:
        ensure_indexes()
    except Exception as exc:
        print(f"⚠️  Could not ensure indexes: {exc}")

@app.get("/")
def root():
    return {"message": "AcademIQ Backend running. Go to /docs for API docs."}

@app.get("/health")
def health():
    try:
        client.admin.command('ping')
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database unreachable: {str(e)}")

# Core routers — always available.
app.include_router(auth.router)      # /api/auth/login, /logout, /me
app.include_router(admin.router)     # /api/admin/users (admin-only)
app.include_router(moodle.router)    # /raw-moodle-payloads
app.include_router(student_data.router)  # /courses, /dashboard, /courses/{id}/...

# ML routers are optional: they depend on joblib/scikit-learn/shap/tensorflow,
# which may not be installed (or have no wheels on very new Python versions).
# Mount them only if their imports succeed, so a missing ML dependency never
# takes down auth/admin/ingest.
try:
    from app.routes import student, performance
    app.include_router(student.router)        # /api/student/insights/...
    app.include_router(performance.router)
    print("[OK] ML routes mounted.")
except Exception as exc:
    print(f"[WARN] ML routes NOT mounted (missing deps): {exc}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)