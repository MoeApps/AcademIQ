# AcademIQ

> **AI-powered learning analytics platform for Moodle** — predicts student performance, clusters behavioral risk, and delivers personalized, explainable recommendations in real time.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Machine Learning Pipeline](#machine-learning-pipeline)
4. [Repository Structure](#repository-structure)
5. [Prerequisites](#prerequisites)
6. [Getting Started](#getting-started)
   - [1. Clone & Configure](#1-clone--configure)
   - [2. Backend (FastAPI)](#2-backend-fastapi)
   - [3. React Web App](#3-react-web-app)
   - [4. Chrome Extension](#4-chrome-extension)
7. [API Reference](#api-reference)
8. [Dataset](#dataset)
9. [Model Artifacts](#model-artifacts)
10. [Environment Variables](#environment-variables)
11. [End-to-End Demo](#end-to-end-demo)
12. [Tech Stack](#tech-stack)
13. [Security](#security)
14. [Disclaimer](#disclaimer)

---

## Overview

AcademIQ is a graduation-project-grade, full-stack educational analytics system built on top of Moodle LMS. It addresses a critical gap in e-learning platforms: the lack of early, actionable intelligence about student performance risk.

The system works in three stages:

1. **Capture** — A Chrome extension (Manifest V3) monitors and extracts behavioral engagement signals from a student's active Moodle session.
2. **Predict** — A FastAPI backend receives the raw activity payload, engineers 19 behavioral features, runs three complementary ML models, and stores results in MongoDB.
3. **Explain** — A React dashboard surfaces risk classification, performance probability, SHAP-driven negative drivers, counterfactual interventions, and a progress tracker — all personalized per student.

The platform is designed to be interpretable, not just accurate. Every prediction comes with an explanation a student or instructor can act on.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Moodle LMS (Browser)                  │
│                                                              │
│   ┌───────────────────────────────────────────────────────┐  │
│   │           Chrome Extension  (MV3)                     │  │
│   │  content.js captures clicks, time, quiz/assignment    │  │
│   │  activity → popup.js exports structured JSON payload  │  │
│   └────────────────────┬──────────────────────────────────┘  │
└────────────────────────│─────────────────────────────────────┘
                         │  POST /analyze
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                          │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ Route Layer  │──▶│ Service Layer│──▶│  ML Inference   │  │
│  │  /analyze    │   │FeatureEngineer│  │  risk_model.pkl │  │
│  │  /student_   │   │  19 features  │  │  (LightGBM,     │  │
│  │  results     │   │              │   │   calibrated)   │  │
│  │  /courses    │   └──────────────┘   └─────────────────┘  │
│  └──────────────┘                              │             │
│                                                ▼             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                  MongoDB                             │    │
│  │  raw_moodle_payload_collection                       │    │
│  │  student_results_collection                          │    │
│  │  courses_collection                                  │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                         │
                         │  GET /student_results
                         │  GET /courses
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   React Web App (Vite)                       │
│                                                              │
│  Dashboard · Grades · My Courses · Recommendations          │
│  (shadcn UI + TypeScript)                                    │
└──────────────────────────────────────────────────────────────┘
```

**Data flow summary:**

```
Extension → POST /analyze → Feature Engineering → ML Models
         → MongoDB store  → GET /student_results → React Dashboard
```

---

## Machine Learning Pipeline

AcademIQ contains three complementary ML models, each targeting a different analytical question:

### Model 1 — Risk Clustering (Unsupervised)

Segments students into behavioral risk groups using clustering on engagement features. Output is a `risk_cluster` label used for cohort comparison and dashboard color-coding.

### Model 2 — Grade Regression

Predicts a continuous `final_grade` score from behavioral features. Used for trajectory forecasting and "what-if" grade projections.

### Model 3 — Performance Classification (Primary Model, v6)

Binary classifier: predicts whether a student will be a **High Performer** (final grade ≥ 65) based purely on behavioral engagement signals — no grade inputs.

**Key design decisions:**

| Decision | Implementation |
|---|---|
| Dataset | OULAD (UCI archive) — 29,472 student records |
| Feature set | 19 engineered behavioral features (no grade leakage) |
| Class imbalance | SMOTE on training split only |
| Data leakage prevention | `GroupShuffleSplit` on `student_id` — zero student overlap between train and test |
| Model selection | 5-fold cross-validation across Random Forest, XGBoost, LightGBM |
| Winning model | LightGBM (CV ROC-AUC: 0.8966) |
| Hyperparameter tuning | `RandomizedSearchCV` (20 iterations, 3-fold) |
| Calibration | `CalibratedClassifierCV` (isotonic, 5-fold) on the tuned model |
| Missing value handling | `SimpleImputer` (median strategy), fitted on training data only |
| Explainability | SHAP `TreeExplainer` for per-student feature attribution |

**Evaluation on held-out test set:**

| Metric | Score |
|---|---|
| Accuracy | 74.5% |
| ROC-AUC | 82.9% |
| Brier Score | 0.162 |
| HP Precision | 69% |
| HP Recall | 54% |
| HP F1 | 0.61 |

**Engineered features (19 total):**

| # | Feature | Description |
|---|---|---|
| 1 | `all_clicks` | Total platform interaction count |
| 2 | `active_days` | Number of days with recorded activity |
| 3 | `access_frequency` | Average sessions per week |
| 4 | `material_clicks` | Engagement with course content |
| 5 | `quiz_attempts` | Number of quiz attempts made |
| 6 | `assignment_submissions` | Submissions completed |
| 7 | `total_time_spent` | Cumulative time on platform (minutes) |
| 8 | `procrastination_index` | Temporal distance from assignment start to deadline |
| 9 | `late_submission_count` | Number of submissions past due date |
| 10 | `clicks_per_day` | Interaction intensity per active day |
| 11 | `time_per_click` | Depth of engagement per interaction |
| 12 | `time_per_active_day` | Focus quality per study session |
| 13 | `engagement_consistency` | Regularity of platform access relative to time spent |
| 14 | `behavioral_risk_score` | Composite: `procrastination_index × 0.6 + late_count × 10 × 0.4` |
| 15 | `procrastination_x_late` | Interaction term: compounding penalty |
| 16 | `submission_rate` | Submissions normalized by study period |
| 17 | `all_clicks_vs_median` | Click count relative to cohort median |
| 18 | `total_time_spent_vs_median` | Time relative to cohort median |
| 19 | `active_days_vs_median` | Active days relative to cohort median |

**Inference API input (9 raw base features):**

```json
{
  "all_clicks": 4500,
  "active_days": 140,
  "access_frequency": 25.0,
  "material_clicks": 320.0,
  "quiz_attempts": 14.0,
  "assignment_submissions": 9.0,
  "total_time_spent": 14000,
  "procrastination_index": 1.5,
  "late_submission_count": 0.0
}
```

The backend engineers all 19 features from these 9 inputs before running inference.

---

## Repository Structure

```
AcademIQ/
│
├── ai/                              # ML notebooks and experiments
│   └── *.ipynb                      # v6 performance classification notebook
│
├── backend/
│   ├── app/
│   │   ├── backend.py               # FastAPI application entry point
│   │   └── extension_ingest.py      # Extension JSON → feature vector
│   ├── models/
│   │   └── risk_model.pkl           # Trained classifier (LightGBM, calibrated)
│   └── scripts/
│       └── train_risk_model.py      # Model training script
│
├── config/
│   └── database.py                  # MongoDB connection manager
│
├── Datasets/                        # OULAD-derived training data
│   └── academiq_v7_final_v2.csv     # 29,472 records × 14 columns
│
├── Documents/                       # Project documentation and reports
│
├── grad's front-end/                # React web application
│   ├── src/
│   │   ├── components/              # shadcn/ui component library
│   │   ├── pages/                   # Dashboard, Grades, Courses, Auth
│   │   └── lib/                     # API client, utilities
│   ├── vite.config.ts
│   └── package.json
│
├── models/                          # Serialized model artifacts
│   └── model_artifacts_v6/
│       ├── model_calibrated.pkl     # Production-grade calibrated model
│       ├── model_raw.pkl            # Base LightGBM model (for SHAP)
│       ├── shap_explainer.pkl       # TreeExplainer for feature attribution
│       ├── features_behavioral.pkl  # Ordered feature name list
│       ├── hp_train_medians.pkl     # High-performer cohort medians
│       ├── train_medians.pkl        # Full training set medians
│       ├── feature_bounds.pkl       # Input validation bounds
│       └── imputer.pkl              # Median imputer for missing values
│
├── moodle-ai-extension/             # Chrome Extension (Manifest V3)
│   ├── content.js                   # Page activity monitor
│   ├── popup.js                     # Extension UI and sync logic
│   ├── signin-bridge.js             # Auth bridge with web app
│   └── manifest.json
│
├── schema/                          # MongoDB collection schemas
│
├── main.py                          # Top-level entry point
├── .env.example                     # Environment variable template
└── README.md
```

---

## Prerequisites

| Dependency | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Backend and ML training |
| Node.js | 18+ | React web app |
| npm | 9+ | Package management |
| MongoDB | 6+ (local or Atlas) | Data persistence |
| Chrome | Latest | Extension runtime |

Python packages (key):

```
fastapi
uvicorn
pymongo
scikit-learn
lightgbm
xgboost
shap
imbalanced-learn
pandas
numpy
joblib
```

---

## Getting Started

### 1. Clone & Configure

```bash
git clone https://github.com/MoeApps/AcademIQ.git
cd AcademIQ

# Copy and edit the environment file
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](#environment-variables)).

### 2. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
```

**Train the model** (only required if `backend/models/risk_model.pkl` is missing):

```bash
python scripts/train_risk_model.py
```

**Start the API server:**

```bash
python -m uvicorn app.backend:app --reload --host 127.0.0.1 --port 8000
```

Verify the server is running:

- Health check: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- Interactive API docs (Swagger UI): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### 3. React Web App

```bash
cd "grad's front-end"
cp .env.example .env
# Set VITE_API_URL=http://127.0.0.1:8000 in .env

npm install
npm run dev
```

The app starts at **[http://localhost:8080](http://localhost:8080)** (configured in `vite.config.ts`).

**Sign in:** Any password 6+ characters. The form validates that the API is reachable via `GET /` before allowing access.

**Student ID:** Use the same ID configured in the Chrome extension (format: `stu_…`). After syncing from the extension, the Dashboard and Grades pages will display live ML results.

### 4. Chrome Extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `moodle-ai-extension/` folder.
4. Navigate to your Moodle instance in the browser.
5. Open the extension popup.
6. Set the **API base URL** to `http://127.0.0.1:8000`.
7. Click **Sync to AcademIQ**.

> **Note:** Ensure your `.env` includes `CORS_ORIGIN_REGEX=chrome-extension://.*` to allow the extension to reach the backend.

> **After reloading the extension** in `chrome://extensions`, refresh any open `localhost` tab once. This prevents `signin-bridge.js` from logging `Extension context invalidated`.

The **Risk** line in the extension popup reflects the result of the most recent **Sync to AcademIQ** call. It is independent of the web app sign-in state — both surfaces talk to the same backend.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check — confirms API is reachable |
| `POST` | `/analyze` | Main inference endpoint. Accepts extension JSON payload, engineers features, runs ML inference, stores result |
| `POST` | `/ingest/extension` | Alias for `/analyze` — raw Moodle payload ingestion |
| `GET` | `/student_results` | Retrieve stored predictions and recommendations for a student |
| `GET` | `/courses` | Return enrolled courses from MongoDB (falls back to demo data if empty) |

**`POST /analyze` — Example Request:**

```json
{
  "student_id": "stu_12345",
  "all_clicks": 1200,
  "active_days": 45,
  "access_frequency": 8.5,
  "material_clicks": 180,
  "quiz_attempts": 6,
  "assignment_submissions": 5,
  "total_time_spent": 3200,
  "procrastination_index": 12.0,
  "late_submission_count": 1
}
```

**`POST /analyze` — Example Response:**

```json
{
  "student_id": "stu_12345",
  "probability": 0.412,
  "classification": "Not High Performer",
  "confidence": "low",
  "risk_cluster": 2,
  "top_negative_drivers": [
    "assignment_submissions",
    "quiz_attempts",
    "active_days"
  ],
  "recommendations": [
    {
      "icon": "📤",
      "short": "Submit every assignment",
      "action": "Prioritise completing all assignments — imperfect > missing.",
      "why": "Missing assignments compound into significant grade gaps.",
      "your_value": 5.0,
      "median_value": 8.0,
      "percentile": 24
    }
  ]
}
```

---

## Dataset

AcademIQ is trained on a real, OULAD-derived dataset (Open University Learning Analytics Dataset, UCI Machine Learning Repository).

| Property | Value |
|---|---|
| Source | OULAD — UCI Archive |
| Records | 29,472 student observations |
| Columns | 14 (schema below) |
| Label | `final_grade` → binarized at threshold ≥ 65 |
| Positive class | 35.8% (High Performer) |

**Dataset Schema:**

| Column | Type | Description |
|---|---|---|
| `student_id` | Integer | Unique student identifier |
| `all_clicks` | Float | Total VLE click interactions |
| `active_days` | Float | Days with recorded platform activity |
| `access_frequency` | Float | Average weekly login sessions |
| `material_clicks` | Float | Interactions with course materials |
| `avg_quiz_score` | Float | Mean score across all quiz attempts |
| `quiz_attempts` | Float | Total number of quiz attempts |
| `avg_assignment_score` | Float | Mean assignment score |
| `assignment_submissions` | Float | Total assignments submitted |
| `final_grade` | Float | Final course grade (0–100) |
| `risk_cluster` | Integer | Behavioral cluster label (0–3) |
| `total_time_spent` | Float | Total minutes on platform |
| `procrastination_index` | Float | Measure of submission timing relative to deadlines |
| `late_submission_count` | Float | Number of late submissions |

The classification model uses only the 9 behavioral base features (no score columns) to avoid leakage between behavioral signals and grade outcomes.

---

## Model Artifacts

All artifacts are serialized with `joblib` and stored under `models/model_artifacts_v6/`:

| Artifact | Description |
|---|---|
| `model_calibrated.pkl` | Production model — LightGBM + isotonic calibration (~5.9 MB) |
| `model_raw.pkl` | Base LightGBM — used as SHAP explainer target (~1.0 MB) |
| `shap_explainer.pkl` | `TreeExplainer` instance for per-prediction attribution (~2.7 MB) |
| `features_behavioral.pkl` | Ordered list of 19 feature names |
| `hp_train_medians.pkl` | Median values for high-performer cohort (used in counterfactual engine) |
| `train_medians.pkl` | Full training set medians (used for vs_median features) |
| `feature_bounds.pkl` | Validation bounds per feature (used to clamp out-of-range inference inputs) |
| `imputer.pkl` | `SimpleImputer` (median, fitted on training data only) |

**Regenerate all artifacts:**

```bash
python backend/scripts/train_risk_model.py
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=academiq_db

# CORS
CORS_ORIGIN_REGEX=chrome-extension://.*
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080

# API
API_HOST=127.0.0.1
API_PORT=8000
```

For the React app (`grad's front-end/.env`):

```env
VITE_API_URL=http://127.0.0.1:8000
```

> **Never commit `.env` files.** Use MongoDB Atlas IP allowlists and rotate any credentials exposed in version history.

---

## End-to-End Demo

Follow these steps to run a complete demonstration suitable for a thesis or project presentation:

```
1. Start MongoDB
   Local: mongod --dbpath /data/db
   Atlas:  ensure your IP is in the allowlist

2. Start the FastAPI backend
   cd backend && python -m uvicorn app.backend:app --reload --port 8000

3. Start the React web app
   cd "grad's front-end" && npm run dev
   Open http://localhost:8080

4. Sign in
   Use any student ID (e.g. stu_001) and a password of 6+ characters.
   A green indicator confirms the API is reachable.

5. Open Moodle in Chrome with the extension installed
   Set API URL → http://127.0.0.1:8000
   Click "Sync to AcademIQ"
   The extension popup shows the risk classification immediately.

6. Refresh the Dashboard in the React app
   Risk cluster, performance probability, SHAP drivers,
   and personalized recommendations appear.

7. Optional: inspect MongoDB via Compass
   Database: academiq_db (or todo_db depending on config)
   Collections: raw_moodle_payload_collection, student_results_collection
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML & Data Science | Python, LightGBM, XGBoost, scikit-learn, SHAP, pandas, NumPy, imbalanced-learn |
| Backend API | FastAPI, Uvicorn, Pydantic, joblib |
| Database | MongoDB (local or Atlas), PyMongo |
| Frontend | React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS |
| Browser Extension | Chrome Extension Manifest V3, Vanilla JS |
| Notebooks | Jupyter Notebook |
| Dataset | OULAD (UCI Machine Learning Repository) |

---

## Security

This project is designed for **academic demonstration purposes**. Before any production deployment:

- Never commit `.env` files or secrets to version control.
- Use MongoDB Atlas IP allowlists; do not expose `0.0.0.0` in production.
- Rotate any credentials that have ever appeared in commit history.
- Add authentication middleware (JWT or session-based) to all API routes before deploying publicly.
- Review CORS settings — `CORS_ORIGIN_REGEX=chrome-extension://.*` is intentionally permissive for local demo use only.
- The current sign-in flow is an API reachability check only — it is not a real authentication system.

---

## Disclaimer

AcademIQ is developed as a graduation research project. The dataset, models, and predictions are intended for academic research and demonstration only. No real student data is collected or stored outside of a controlled local or university environment. The system's predictions should be treated as decision-support tools, not authoritative assessments of student ability.
