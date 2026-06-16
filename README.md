# AcademIQ

> **AI-powered learning analytics platform for Moodle** — captures behavioral engagement signals from the browser, engineers predictive features, runs a calibrated LightGBM classifier, and surfaces personalized risk explanations through a Next.js dashboard.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Repository Structure](#repository-structure)
4. [ML Pipeline](#ml-pipeline)
5. [MongoDB Collections](#mongodb-collections)
6. [API Reference](#api-reference)
7. [Prerequisites](#prerequisites)
8. [Setup](#setup)
9. [Environment Variables](#environment-variables)
10. [End-to-End Demo](#end-to-end-demo)
11. [Tech Stack](#tech-stack)
12. [Security Notes](#security-notes)
13. [Disclaimer](#disclaimer)

---

## Overview

AcademIQ sits on top of Moodle LMS and closes the gap between raw activity logs and actionable student intelligence. It works in three stages:

1. **Capture** — A Chrome extension (MV3) runs on the student's Moodle session. `content.js` tracks clicks, time-on-page, quiz attempts, and assignment activity. `background.js` aggregates session data and manages the sync queue. `popup.js` lets students trigger a sync, see their latest ML result, and open the dashboard via a magic-link.

2. **Predict** — `POST /raw-moodle-payloads` receives the raw payload. The backend normalizes it into three collections (`course_materials`, `student_metrics`, `student_events`), engineers 19 behavioral features, runs the calibrated LightGBM performance classifier, and stores the result in `ml_results`.

3. **Explain** — A Next.js 14 dashboard reads the live collections and presents risk classification, performance probability, SHAP-driven negative drivers, counterfactual interventions ("what would flip your prediction?"), a progress tracker, and a quiz generator — all personalized per student.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Moodle LMS  (student's browser)                   │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │                 Chrome Extension  (MV3)                          │   │
│   │  content.js    — click / time / quiz / assignment tracking       │   │
│   │  background.js — session aggregation, sync queue                 │   │
│   │  popup.js      — sync trigger, ML result display, magic-link     │   │
│   └──────────────────────────┬───────────────────────────────────────┘   │
└─────────────────────────────-│───────────────────────────────────────────┘
                               │  POST /raw-moodle-payloads
                               │  GET  /api/ml/result?academiq_user_id=...
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          FastAPI Backend  (Python 3.11+)                  │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Route Layer  (backend/app/routes/)                                 │ │
│  │   moodle.py        /raw-moodle-payloads  /materials/content         │ │
│  │   auth.py          /api/auth/*  (login, logout, magic-link,         │ │
│  │                                  forgot-password, reset-password)   │ │
│  │   student_data.py  /courses  /dashboard  /courses/{id}/performance  │ │
│  │                    /courses/{id}/insights  /courses/{id}/materials   │ │
│  │                    /courses/{id}/evidence  /courses/{id}/quiz        │ │
│  │   ml_result.py     /api/ml/result                                   │ │
│  │   admin.py         /api/admin/*  (user CRUD, role management)       │ │
│  │   system_status.py /api/system/status                               │ │
│  └───────────────┬─────────────────────────────────────────────────────┘ │
│                  │                                                        │
│  ┌───────────────▼─────────────────────────────────────────────────────┐ │
│  │  Service Layer  (backend/app/services/)                             │ │
│  │   moodle_ingest.py      — payload normalization                     │ │
│  │   user_provisioning.py  — Moodle→AcademIQ identity mapping          │ │
│  │   performance_predict.py — 19-feature engineering + LightGBM        │ │
│  │   student_data.py       — collection→frontend shape mapping         │ │
│  │   quiz_gen.py           — NLP-based quiz generation from PDFs       │ │
│  │   email_service.py      — SMTP (magic-link, password reset)         │ │
│  │   security.py           — bcrypt, session token hashing             │ │
│  │   timeline_service.py   — evidence timeline builder                 │ │
│  │   system_status_service.py — component health checks                │ │
│  └───────────────┬─────────────────────────────────────────────────────┘ │
│                  │                                                        │
│  ┌───────────────▼─────────────────────────────────────────────────────┐ │
│  │  Repository Layer  (backend/app/repositories/)                      │ │
│  │   user_repository     session_repository    material_repository      │ │
│  │   metrics_repository  event_repository      magic_link_repository    │ │
│  │   password_reset_repository                                          │ │
│  └───────────────┬─────────────────────────────────────────────────────┘ │
└──────────────────│───────────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          MongoDB  (Atlas or local)                        │
│  users  sessions  feature_vectors  student_metrics  student_events        │
│  course_materials  raw_moodle_payload_collection  ml_results              │
│  assignments_collection  quizzes_collection  courses_collection           │
│  password_reset_tokens  magic_link_tokens  system_events                  │
└──────────────────────────────────────────────────────────────────────────┘
                   │
                   │  httpOnly session cookie
                   │  GET /dashboard  /courses  /courses/{id}/performance …
                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend  (front-end/)                      │
│                                                                          │
│  /              — Landing page                                           │
│  /signin        — Email + password login                                 │
│  /dashboard     — Overview: risk score, performance probability          │
│  /performance   — Per-course grade trajectory and prediction             │
│  /insights      — SHAP-driven behavioral risk factors                   │
│  /evidence      — Event timeline (activity audit trail)                  │
│  /quiz          — AI quiz generator from course materials                │
│  /system-status — Component health (backend, ML models, MongoDB)        │
│  /admin         — Admin panel: user management, role assignment          │
└──────────────────────────────────────────────────────────────────────────┘
```

**End-to-end data flow:**

```
Extension sync
  → POST /raw-moodle-payloads
      → user_provisioning  (resolve or auto-create AcademIQ account)
      → moodle_ingest      (normalize → course_materials, student_metrics, student_events)
      → compute_features   (19 behavioral features → feature_vectors)
      → performance_predict (LightGBM inference → ml_results)
  → GET /api/ml/result     (extension popup reads latest prediction)

Frontend (authenticated)
  → GET /dashboard         → student_data.get_dashboard()
  → GET /courses/{id}/performance → student_data.get_performance()
  → GET /courses/{id}/insights    → student_data.get_insights()  [SHAP drivers]
  → GET /courses/{id}/evidence    → timeline_service.build_timeline()
  → GET /courses/{id}/quiz        → quiz_gen (NLP from PDF materials)
```

---

## Repository Structure

```
AcademIQ/
│
├── ai/                                  # Jupyter notebooks & ML experiments
│   └── *.ipynb                          # v6 performance classification notebook
│
├── backend/
│   ├── main.py                          # FastAPI application entry point
│   └── app/
│       ├── auth.py                      # Session cookie auth & role guards
│       ├── config/
│       │   ├── database.py              # MongoDB client + all collection handles
│       │   └── settings.py              # Env-driven config (MONGODB_URI, SMTP, …)
│       ├── models/
│       │   ├── user.py                  # User document builder + serializers
│       │   └── material.py              # Material document helpers
│       ├── routes/
│       │   ├── moodle.py                # POST /raw-moodle-payloads, POST /materials/content
│       │   ├── auth.py                  # /api/auth/* (login, logout, magic-link, reset)
│       │   ├── student_data.py          # /courses, /dashboard, /courses/{id}/*
│       │   ├── ml_result.py             # GET /api/ml/result
│       │   ├── admin.py                 # /api/admin/* (user CRUD, role management)
│       │   └── system_status.py         # GET /api/system/status
│       ├── repositories/
│       │   ├── user_repository.py
│       │   ├── session_repository.py
│       │   ├── material_repository.py
│       │   ├── metrics_repository.py
│       │   ├── event_repository.py
│       │   ├── magic_link_repository.py
│       │   └── password_reset_repository.py
│       ├── services/
│       │   ├── moodle_ingest.py         # Payload → normalized collections
│       │   ├── user_provisioning.py     # Moodle identity → AcademIQ account
│       │   ├── performance_predict.py   # Feature engineering + LightGBM inference
│       │   ├── student_data.py          # Collections → frontend-shaped responses
│       │   ├── quiz_gen.py              # NLP quiz generation from PDF/PPTX materials
│       │   ├── email_service.py         # SMTP: magic-link, account creation, reset
│       │   ├── security.py              # bcrypt hashing, session token generation
│       │   ├── preprocessing.py         # compute_features() — 19-feature pipeline
│       │   ├── timeline_service.py      # Evidence timeline builder
│       │   └── system_status_service.py # Component health aggregator
│       ├── schema/
│       │   ├── schemas.py               # Pydantic serializers
│       │   └── timeline_schema.py       # EvidenceTimelineResponse shape
│       └── utils/
│           └── password.py              # Secure random password generator
│
├── models/
│   └── performance_model/               # Serialized ML artifacts (joblib)
│       ├── model_calibrated.pkl         # LightGBM + isotonic calibration (prod)
│       ├── model_raw.pkl                # Base LightGBM (SHAP source)
│       ├── shap_explainer.pkl           # TreeExplainer for per-student attribution
│       ├── features_behavioral.pkl      # Ordered list of 19 feature names
│       ├── hp_train_medians.pkl         # High-performer cohort medians (counterfactual)
│       └── train_medians.pkl            # Full training set medians (vs_median features)
│
├── front-end/                           # Next.js 14 + React 19 dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                 # Landing page
│   │   │   ├── signin/                  # Login page
│   │   │   ├── dashboard/               # Risk overview
│   │   │   ├── performance/             # Per-course performance
│   │   │   ├── insights/                # SHAP behavioral insights
│   │   │   ├── evidence/                # Activity timeline
│   │   │   ├── quiz/                    # AI quiz generator
│   │   │   ├── system-status/           # Component health
│   │   │   └── admin/                   # Admin user management
│   │   ├── components/
│   │   │   ├── home/                    # HeroSection, FeaturesSection
│   │   │   └── layout/                  # MarketingHeader, Footer
│   │   ├── context/
│   │   │   └── UserContext.tsx          # Auth state provider
│   │   └── lib/
│   │       ├── api.ts                   # Unified API client (mock/live switch)
│   │       ├── mock.ts                  # Mock data layer (dev/demo)
│   │       └── types.ts                 # Shared TypeScript types
│   └── package.json                     # Next 16, React 19, recharts, tailwind
│
├── moodle-ai-extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json                    # MV3 manifest, service worker declaration
│   ├── content.js                       # Click/time/quiz/assignment tracking
│   ├── background.js                    # Session aggregation, sync queue
│   ├── popup.js                         # Sync UI, ML result display, magic-link
│   └── popup.html
│
├── Datasets/
│   └── academiq_v7_final_v2.csv        # OULAD-derived dataset (29,472 × 14)
│
├── Documents/                           # Project reports and documentation
├── .dockerignore
├── .gitignore
├── Dockerfile
└── README.md
```

---

## ML Pipeline

### Model 1 — Risk Clustering (Unsupervised)

Segments students into behavioral risk groups. The `risk_cluster` label (0–3) is stored in `student_metrics` and drives dashboard color-coding and cohort comparison.

### Model 2 — Grade Regression (TensorFlow, disabled on Python 3.13)

Predicts a continuous `final_grade` score for trajectory forecasting. `tensorflow-cpu` is listed in `requirements.txt` but the route falls back to heuristics when the package is unavailable. Use Python 3.11 or 3.12 to enable this model.

### Model 3 — Performance Classification (Primary, LightGBM v6)

Binary classifier: predicts whether a student is a **High Performer** (final grade ≥ 65) using only behavioral engagement signals — no grade inputs.

**Dataset:** OULAD (UCI Machine Learning Repository) — 29,472 student records, 14 columns.

**Design decisions:**

| Decision | Implementation |
|---|---|
| Class imbalance | SMOTE applied to training split only |
| Data leakage prevention | `GroupShuffleSplit` on `student_id` — zero student overlap between train and test |
| Model selection | 5-fold stratified CV across Random Forest, XGBoost, LightGBM |
| Winner | LightGBM (CV ROC-AUC: 0.8966) |
| Hyperparameter tuning | `RandomizedSearchCV` (20 iterations, 3-fold) |
| Calibration | `CalibratedClassifierCV` (isotonic, 5-fold) |
| Missing values | `SimpleImputer` (median), fitted on training data only |
| Explainability | SHAP `TreeExplainer` — per-student feature attribution |

**Held-out test set performance:**

| Metric | Score |
|---|---|
| Accuracy | 74.5% |
| ROC-AUC | 82.9% |
| Brier Score | 0.162 |
| HP F1 | 0.61 |

**19 engineered features** (input: 9 raw base features from extension):

| # | Feature | Derived from |
|---|---|---|
| 1 | `all_clicks` | raw |
| 2 | `active_days` | raw |
| 3 | `access_frequency` | raw |
| 4 | `material_clicks` | raw |
| 5 | `quiz_attempts` | raw |
| 6 | `assignment_submissions` | raw |
| 7 | `total_time_spent` | raw |
| 8 | `procrastination_index` | raw |
| 9 | `late_submission_count` | raw |
| 10 | `clicks_per_day` | `all_clicks / (active_days + 1)` |
| 11 | `time_per_click` | `total_time_spent / (all_clicks + 1)` |
| 12 | `time_per_active_day` | `total_time_spent / (active_days + 1)` |
| 13 | `engagement_consistency` | `active_days / (total_time_spent/60 + 1)` |
| 14 | `behavioral_risk_score` | `procrastination × 0.6 + late_count × 10 × 0.4` |
| 15 | `procrastination_x_late` | `procrastination × late_count` |
| 16 | `submission_rate` | `assignment_submissions / (active_days/14 + 1)` |
| 17 | `all_clicks_vs_median` | `all_clicks / (train_median + 1)` |
| 18 | `total_time_spent_vs_median` | `total_time_spent / (train_median + 1)` |
| 19 | `active_days_vs_median` | `active_days / (train_median + 1)` |

**Top SHAP drivers (mean |SHAP| on test set):**

```
assignment_submissions    0.801
quiz_attempts             0.571
active_days               0.385
submission_rate           0.231
procrastination_x_late    0.186
```

---

## MongoDB Collections

All collections live in the database specified by `MONGODB_DB_NAME` (default: `todo_db`; override with env var).

| Collection | Purpose |
|---|---|
| `users` | AcademIQ accounts — students and admins |
| `sessions` | Hashed session tokens + expiry (httpOnly cookie auth) |
| `feature_vectors` | Engineered 19-feature snapshot per student per sync |
| `student_metrics` | Per-(user, course) engagement metrics, updated on each sync |
| `student_events` | Per-user event stream from Moodle (deduped by event id) |
| `course_materials` | Scraped Moodle materials, deduped by `(course_id, material_id)` |
| `raw_moodle_payload_collection` | Original extension payload (audit trail, slimmed) |
| `ml_results` | Latest ML prediction per student — classification, probability, drivers |
| `assignments_collection` | Assignment records |
| `quizzes_collection` | Generated quiz instances |
| `courses_collection` | Course metadata |
| `password_reset_tokens` | Single-use hashed reset tokens |
| `magic_link_tokens` | Single-use hashed magic-link tokens |
| `system_events` | Backend event log for system status |

**Key indexes:**

```python
users:                  email (unique), student_id, moodle_user_id
sessions:               token_hash, expires_at
feature_vectors:        academiq_user_id, updated_at
student_metrics:        (academiq_user_id, course_id), updated_at
student_events:         (academiq_user_id, event_id unique), created_at
course_materials:       (course_id, material_id unique)
ml_results:             academiq_user_id, updated_at
password_reset_tokens:  token_hash, expires_at
magic_link_tokens:      token_hash, expires_at
```

---

## API Reference

### Extension endpoints (no auth — same trust model as the Moodle session)

| Method | Path | Description |
|---|---|---|
| `POST` | `/raw-moodle-payloads` | Main ingest: receives extension JSON, runs full pipeline (normalize → feature engineer → ML → store) |
| `GET` | `/raw-moodle-payloads` | List stored raw payloads (audit) |
| `POST` | `/materials/content` | Upload a course material PDF as base64; extracts text for quiz generation |
| `GET` | `/api/ml/result?academiq_user_id=` | Latest ML prediction for a student (used by extension popup) |

### Auth endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Email + password → sets `academiq_session` httpOnly cookie |
| `POST` | `/api/auth/logout` | Clears session cookie |
| `GET` | `/api/auth/me` | Returns current authenticated user profile |
| `POST` | `/api/auth/forgot-password` | Sends password-reset email |
| `POST` | `/api/auth/reset-password` | Consumes reset token, sets new password |
| `POST` | `/api/auth/magic-link` | Generates one-click login link (used by extension popup) |
| `GET` | `/api/auth/magic-link/verify` | Consumes magic token → sets session cookie, redirects to dashboard |

### Student data endpoints (requires valid session cookie)

| Method | Path | Description |
|---|---|---|
| `GET` | `/courses` | Enrolled courses for the authenticated student |
| `GET` | `/dashboard` | Overview: risk score, performance probability, top drivers |
| `GET` | `/courses/{course_id}/performance` | Grade trajectory and predicted final grade for one course |
| `GET` | `/courses/{course_id}/insights` | SHAP-driven risk factors and personalized recommendations |
| `GET` | `/courses/{course_id}/materials` | Course materials list |
| `GET` | `/courses/{course_id}/evidence` | Evidence timeline (activity audit trail) |
| `GET` | `/courses/{course_id}/quiz` | Generate a quiz from course materials |

### Admin endpoints (requires `admin` role)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/users` | List / search all users |
| `POST` | `/api/admin/users` | Create a new user (student or admin) |
| `PATCH` | `/api/admin/users/{id}` | Update user details or role |
| `DELETE` | `/api/admin/users/{id}` | Delete a user |
| `POST` | `/api/admin/users/{id}/reset-password` | Admin-initiated password reset |

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/system/status` | Health of all components: MongoDB, ML models, SMTP |

**Interactive docs:** `http://localhost:8000/docs` (Swagger UI) · `http://localhost:8000/redoc`

---

## Prerequisites

| Dependency | Version | Purpose |
|---|---|---|
| Python | 3.11 or 3.12 | Backend + ML models (TensorFlow requires ≤ 3.12) |
| Node.js | 18+ | Next.js frontend |
| npm | 9+ | Package management |
| MongoDB | 6+ local or Atlas | Data persistence |
| Chrome | Latest | Extension runtime |

> **Python 3.13:** LightGBM and core features work fine. `tensorflow-cpu` has no 3.13 wheel yet — the grade/risk TF model falls back to heuristics automatically.

---

## Setup

### 1. Clone

```bash
git clone https://github.com/MoeApps/AcademIQ.git
cd AcademIQ
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Start the server:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Swagger UI: `http://127.0.0.1:8000/docs`

### 3. ML Artifacts

The performance model artifacts must be present under `models/performance_model/`. If they are missing, retrain from the notebook:

```bash
# Open ai/ directory in Jupyter and run the v6 notebook end-to-end.
# Artifacts are saved to models/performance_model/ automatically.
```

### 4. Frontend

```bash
cd front-end
npm install
```

Create `front-end/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=false
```

Start the dev server:

```bash
npm run dev
# Runs on http://localhost:3000
```

> Leave `NEXT_PUBLIC_USE_MOCK=true` (or `NEXT_PUBLIC_API_BASE_URL` empty) to run the frontend against the built-in mock data layer without a backend.

### 5. Chrome Extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** → select `moodle-ai-extension/`.
4. Browse to your Moodle instance.
5. Open the extension popup.
6. Set API URL to `http://localhost:8000`.
7. Click **Sync to AcademIQ**.

> After reloading the extension in `chrome://extensions`, refresh any open `localhost:3000` tab once to prevent `signin-bridge.js` from logging `Extension context invalidated`.

---

## Environment Variables

Copy `.env.example` to `backend/.env` and configure:

```env
# ── Database ──────────────────────────────────────────────────────────────
MONGODB_URI=mongodb://127.0.0.1:27017
# Atlas example:
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/
MONGODB_DB_NAME=academiq_db

# ── CORS ──────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# ── Auth / Sessions ───────────────────────────────────────────────────────
SESSION_COOKIE_NAME=academiq_session
SESSION_TTL_HOURS=24
SESSION_COOKIE_SECURE=false          # set true behind HTTPS in production
SESSION_COOKIE_SAMESITE=lax

# ── Frontend URL (used in emails) ─────────────────────────────────────────
APP_LOGIN_URL=http://localhost:3000/signin

# ── SMTP (optional — logs to stdout if unconfigured) ─────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=AcademIQ <no-reply@academiq.local>
SMTP_USE_TLS=true
```

Frontend (`front-end/.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=false
```

> **Never commit `.env` or `.env.local` files.** The default `settings.py` fallback contains a real Atlas URI — rotate those credentials immediately.

---

## End-to-End Demo

```
1. Start MongoDB
   Local:  mongod --dbpath /data/db
   Atlas:  ensure your IP is in the allowlist

2. Start the backend
   cd backend
   python -m uvicorn main:app --reload --port 8000

3. Start the frontend
   cd front-end
   npm run dev
   # → http://localhost:3000

4. Create an admin account (first run)
   POST /api/auth/login with seeded credentials, or use
   the admin panel to create the first student account.

5. Install the Chrome extension
   chrome://extensions → Load unpacked → moodle-ai-extension/
   Set API URL to http://localhost:8000

6. Browse Moodle with the extension active
   Click "Sync to AcademIQ" in the popup.
   The popup immediately shows the ML prediction.

7. Open the dashboard
   http://localhost:3000/dashboard
   Risk cluster, performance probability, SHAP drivers,
   recommendations, and evidence timeline appear.

8. Optional: inspect MongoDB
   Database: academiq_db  (or todo_db if MONGODB_DB_NAME not set)
   Key collections: raw_moodle_payload_collection, ml_results,
                    student_metrics, feature_vectors
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML | LightGBM, scikit-learn, SHAP, pandas, NumPy, imbalanced-learn |
| Backend API | FastAPI, Uvicorn, Pydantic v2, PyMongo, bcrypt, python-jose |
| Database | MongoDB (Atlas or local), PyMongo |
| Frontend | Next.js 14, React 19, TypeScript, Tailwind CSS v4, recharts |
| Extension | Chrome Extension MV3, Vanilla JS |
| Quiz generation | NLTK, PyPDF2, python-pptx |
| Email | SMTP via smtplib (magic-link, password reset, account creation) |
| Notebooks | Jupyter, OULAD dataset (UCI ML Repository) |

---

## Security Notes

This project is built for **academic demonstration**. Before any production deployment:

- Rotate all credentials that appear in `settings.py` defaults — a real Atlas URI with credentials was committed to the repository.
- Never commit `.env` files. Add them to `.gitignore` immediately.
- Enable `SESSION_COOKIE_SECURE=true` and serve behind HTTPS.
- The `ALLOWED_ORIGINS` setting currently permits localhost; lock it down to your production domain.
- The `/raw-moodle-payloads` endpoint and `/api/ml/result` are intentionally open (same trust model as the Moodle session). Add rate limiting before any public deployment.
- The admin panel is role-gated at the route level (`require_role("admin")`), but there is no IP allowlisting or additional MFA.

---

## Disclaimer

AcademIQ is a graduation research project. The dataset, models, and predictions are for academic research and demonstration only. No real student data is collected or stored outside a controlled local or university environment. Predictions are decision-support signals, not authoritative assessments of student ability.
