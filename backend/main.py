# backend/main.py

import sys
from pathlib import Path

# Add the current directory to sys.path so Python finds the 'app' package
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

from app.config.database import client
from app.routes import moodle, assignments, course, quizzes, todos
# from app.routes import student   # uncomment when student.py is ready

app = FastAPI(title="AcademIQ Backend", version="1.0")

# CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # for development; restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
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

# Include routers (no prefix – adjust if needed)
app.include_router(moodle.router)       # /raw-moodle-payloads
app.include_router(assignments.router)  # /assignments
app.include_router(course.router)       # /courses
app.include_router(quizzes.router)      # /quizzes
app.include_router(todos.router)        # /todos
# app.include_router(student.router)    # /api/student/...

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)