# AcademIQ

AI-assisted learning analytics for Moodle: a **Chrome extension** captures activity, a **FastAPI** backend stores normalized data in **MongoDB** and runs **ML models**, and the **Next.js** dashboard shows insights, performance, and generated quizzes.

## Architecture

```
Moodle (browser)
    → Chrome extension (content + popup)
        → POST /raw-moodle-payloads — FastAPI
            → normalize → MongoDB → feature vectors → ML models
    → Next.js web app (NEXT_PUBLIC_API_BASE_URL)
        → GET /courses, /dashboard, /courses/{id}/performance|insights|materials
        → POST /courses/{id}/quiz
```

## Prerequisites

- **Python 3.11** (3.12 ok; avoid 3.14 — some ML wheels missing)
- **Node.js 18+** and `npm`
- **MongoDB** locally or **MongoDB Atlas**
- **Chrome** (for the extension)

## 1. Clone and configure

```bash
cd AcademIQ-main
copy backend\.env.example backend\.env
# Edit backend\.env: MONGODB_URI, ALLOWED_ORIGINS, admin credentials
```

## 2. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python -m app.scripts.seed_admin
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- **Swagger UI:** http://127.0.0.1:8000/docs
- **Health:** `GET /health`
- **Extension ingest:** `POST /raw-moodle-payloads`
- **Student pages:** `/courses`, `/dashboard`, `/courses/{id}/performance`, etc.

Trained model artifacts live in **`models/`** (copied into Docker for deploy). Retraining notebooks/scripts are under **`ai/`**.

## 3. Frontend (Next.js)

```bash
cd front-end
copy .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

- **Mock mode (default):** leave `NEXT_PUBLIC_API_BASE_URL` empty — all pages work with demo data.
- **Live mode:** set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` and `NEXT_PUBLIC_USE_MOCK=false`.
- **Sign in:** admin `admin@academiq.local` / `Admin@12345` (after `seed_admin`), or a student account provisioned by the extension sync.

## 4. Chrome extension

1. Open `chrome://extensions` → **Load unpacked** → select **`moodle-ai-extension`**.
2. Browse your Moodle site; open the extension popup.
3. Backend URL is set in `popup.js` (`BACKEND_URL`, default `http://localhost:8000/raw-moodle-payloads`).
4. Click **Sync to Backend** — creates/links a student account and stores normalized data.

Ensure `ALLOWED_ORIGINS` in `backend/.env` includes `http://localhost:3000`.

## 5. End-to-end demo

1. Start **MongoDB** and the **backend**.
2. Start the **frontend** with `.env.local` pointing at the API.
3. Use the **extension** on Moodle → **Sync**.
4. Sign in on the website with the provisioned student credentials.
5. Open **Dashboard**, **Performance**, **Insights**, **Quiz**.

## Project layout

| Path | Role |
|------|------|
| `backend/main.py` | FastAPI entrypoint |
| `backend/app/routes/` | Auth, admin, Moodle ingest, student data, ML |
| `backend/app/services/` | Preprocessing, ML inference, quiz generation |
| `models/` | Production ML artifacts (used at runtime) |
| `ai/` | Training notebooks/scripts (not loaded by the API) |
| `front-end/` | Next.js student + admin UI |
| `moodle-ai-extension/` | Chrome MV3 extension |
| `Datasets/` | Training CSVs and feature engineering |
| `Documents/` | Architecture, deployment, and design docs |

## Security note

Do not commit real **`.env`** secrets. Rotate any credentials that were ever exposed in git history.

## Disclaimer

For academic research and demonstration only.
