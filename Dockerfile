# AcademIQ backend — container image for Hugging Face Docker Spaces
# (also works on Render / Railway / Fly / any Docker host).
#
# Build context is the repo root so we can copy both `backend/` and the
# trained `models/` (17 MB, already in the repo). HF Spaces expect the app to
# listen on port 7860.

FROM python:3.11-slim

# System libs some ML wheels need at runtime (numpy/scipy/sklearn/tensorflow).
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# App code + trained model artifacts.
# performance_predict.py computes BASE_DIR as the parent of `backend/`, so the
# models must sit at /app/models/... — this layout satisfies that.
COPY backend/ ./backend/
COPY models/ ./models/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app/backend

EXPOSE 7860

# HF Spaces (and most PaaS) inject $PORT; default to 7860 for Spaces.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
