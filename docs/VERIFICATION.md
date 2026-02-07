# AcademIQ – Verification (DB, APIs, ML, Frontend)

Use these steps to verify the full pipeline **without mock data**: DB → ML → Backend → Frontend.

---

## 1. Prerequisites

- Python 3 with dependencies: `pip install -r requirements.txt`
- Node/npm for frontend (in `grad's front-end/`)
- **No mock data**: Student dashboard, course page, and header use API/DB only.

---

## 2. Load the database

From the **project root** (`AcademIQ-main`):

```bash
python -m backend.scripts.load_datasets_to_db
```

- Expect: "Done. Loaded ..." and no errors.
- DB file: `backend/app/data/pais.db` (SQLite).

If you see PowerShell/script errors, run the same command in a normal terminal (e.g. cmd or PowerShell without sandbox).

---

## 3. Start the backend

From the **project root**:

```bash
python -m uvicorn backend.app.backend:app --reload --host 0.0.0.0 --port 8000
```

- Health: open [http://localhost:8000](http://localhost:8000) → JSON with `"message": "AcademIQ PAIS API"` (or similar).
- Docs: [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 4. Run the API verification script

With the backend **already running**, from the **project root**:

```bash
pip install requests
python -m backend.scripts.verify_all
```

- Checks: `GET /`, login (student + instructor), `/api/v1/students`, `/api/v1/courses`, `/api/v1/grades/S001`, `/api/v1/students/S001/profile`, `/api/v1/students/S001/predictions`, `/api/v1/students/S001/explain`, `/api/v1/students/S001/courses/<course_id>/stats`, `/api/v1/instructor/at-risk`, `/api/v1/instructor/analytics`.
- Expect: "OK" for each and "All checks passed." at the end.

---

## 5. Manual API checks (optional)

From a terminal (or Postman):

```bash
# Health
curl -s http://localhost:8000/

# Login (student)
curl -s -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d "{\"username\":\"student\",\"password\":\"password123\"}"

# Use the returned access_token in next requests:
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/v1/students/S001/profile
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/v1/students/S001/predictions
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/v1/students/S001/explain
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/v1/grades/S001
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/v1/courses
```

- **Predictions** should include `risk_level`, `recommendation`, `risk_cluster` (from ML).
- **Explain** should include `reasons` and `summary` (explainability).
- **Grades / courses** come from DB.

---

## 6. Start the frontend

From `grad's front-end/`:

```bash
npm install
npm run dev
```

- If npm is blocked (e.g. PowerShell): use `npm.cmd` or fix execution policy.
- Frontend: [http://localhost:8080](http://localhost:8080) (or the port Vite prints).

---

## 7. Frontend flow (no mock)

1. **Login**: student / password123 (or instructor / password123).
2. **Student dashboard**:
   - "Performance by course (from API)" chart → from `GET /api/v1/grades/S001` and courses.
   - Overall status → from risk level or average grade from API.
   - Risk, recommendations, explainability → from `/predictions` and `/explain`.
   - Strong/weak topics → from `/profile`.
3. **My Courses** (header): from `GET /api/v1/courses`; clicking a course goes to `/course/:courseId`.
4. **Course page**:
   - Course name and final grade from API/DB.
   - Course statistics (assignments/quizzes/time) from `GET /api/v1/students/S001/courses/:courseId/stats`.

---

## 8. Data flow summary

| Layer        | Source / artifact |
|-------------|-------------------|
| DB          | `backend/app/data/pais.db` (loaded from `Datasets/*.csv`) |
| ML          | Risk model from `Datasets/phase2_risk_clusters.csv`; used by `/predict`, profile, predictions, explain |
| Backend     | FastAPI; CRUD + auth + profile/predictions/explain/recommendations + instructor + course stats |
| Frontend    | All student/course data from API; no mock for dashboard, header, or course page |

---

## 9. Troubleshooting

- **CORS**: Backend allows `http://localhost:8080`; if frontend uses another port, add it in `backend/app/backend.py` `allow_origins`.
- **Login 400**: Use exactly `student` / `password123` or `instructor` / `password123`.
- **Empty grades/courses**: Run the DB load script and ensure `pais.db` exists and has data.
- **No risk/recommendations**: Ensure risk model is trained (backend loads/trains from `phase2_risk_clusters.csv` on startup if needed) and profile service can read cluster data.
