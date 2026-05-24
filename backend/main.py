# backend/main.py

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

from app.config.database import client
from app.routes import moodle, student   # student router is now ready

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

# Include routers – make sure no extra spaces before these lines
app.include_router(moodle.router)    # /raw-moodle-payloads
app.include_router(student.router)   # /api/student/insights/...

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)