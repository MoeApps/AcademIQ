# backend/main.py

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

from app.config.database import client
from app.routes import moodle  # only import the working route
# from app.routes import assignments, course, quizzes, todos  # commented out for now

app = FastAPI(title="AcademIQ Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Only include the moodle router for now
app.include_router(moodle.router)   # /raw-moodle-payloads

# The following routers are commented out because they depend on missing models
# app.include_router(assignments.router)
# app.include_router(course.router)
# app.include_router(quizzes.router)
# app.include_router(todos.router)
# app.include_router(student.router)   # uncomment when student.py is ready

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)