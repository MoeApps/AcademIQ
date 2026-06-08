# Data-Model Refactor — Eliminating Moodle Material Duplication

## The problem

Each student sync stored the **same materials three+ times** in one document:
`learning_materials` (flat), `materialsByCourse` (per course), and
`knowledge_base` (per semantic tag). Measured on real data: **34 stored copies
for 11 unique materials (~3.1×)** in a single small course; across all stored
payloads, **103.4 KB** of mostly-redundant data.

### Where the duplication was generated

| Location | What it did |
| --- | --- |
| [`background.js` `mergeMaterials`](../moodle-ai-extension/background.js) | wrote each material into **both** `learning_materials` and `materialsByCourse` |
| [`background.js` `buildKnowledgeBase`](../moodle-ai-extension/background.js) | pushed the **full material object once per `semantic_tag`** (the multiplier) |
| [`popup.js` `sanitizePayload`](../moodle-ai-extension/popup.js) | shipped all three structures in the POST body |
| [`routes/moodle.py`](../backend/app/routes/moodle.py) | `insert_one(payload)` stored the duplicated blob **verbatim** |
| [`services/preprocessing.py`](../backend/app/services/preprocessing.py) | *read* `knowledge_base["assignment"]` — so it was load-bearing |

## Old schema → New schema

**Old — one bloated `raw_moodle_payload` per sync:**
```jsonc
{
  "student": {...}, "courses": [...], "behavior": {...}, "grades": [...],
  "learning_materials":  [ …11 material objects… ],          // copy 1
  "materialsByCourse":   { "668": [ …11 objects… ] },         // copy 2
  "knowledge_base":      { "Net Sec": { "lecture":[…], "quiz":[…], … } }, // copy 3 (per tag)
  "metricsByCourse": {...}, "events": [...]
}
```

**New — normalized collections, each material stored once:**

| Collection | Unique key | Holds |
| --- | --- | --- |
| `users` *(existing)* | `_id`, `moodle_user_id`, `student_id` | the student / account |
| **`course_materials`** | **`(course_id, material_id)`** | one canonical material; category derived from `semantic_tags`/`material_type` |
| **`student_metrics`** | **`(academiq_user_id, course_id)`** | per-course metrics + `_overall` behaviour |
| **`student_events`** | **`(academiq_user_id, event_id)`** | event stream |
| `raw_moodle_payload_collection` | — | **slim** audit record (student/courses/behavior/grades only) |
| `feature_vectors`, `ml_results` *(existing)* | — | unchanged |

```jsonc
// course_materials — stored ONCE, categories are metadata (queried, not copied)
{ "course_id":"668", "material_id":"9421", "title":"Lecture 1",
  "material_type":"lecture", "category":"lecture",
  "semantic_tags":["lecture"], "due_date":null,
  "first_seen": ISODate, "last_seen": ISODate }
```

## Deduplication mechanism

- **Unique indexes** on each key above ([`database.py` `ensure_indexes`](../backend/app/config/database.py)).
- Ingestion **upserts** by `(course_id, material_id)` ([`material_repository.upsert`](../backend/app/repositories/material_repository.py)) — re-syncing a material updates the existing doc; it can never insert a second copy. Events dedupe on the extension's stable composite `event_id`.
- The backend normalizes **regardless of payload shape**, so dedup holds even for old/duplicated payloads.

## Categorization without duplication

`lecture / quiz / assignment / practice / …` is now a **query**, not a stored
copy: `course_materials.find({course_id, $or:[{category}, {semantic_tags}]})`
([`material_repository.list_by_category`](../backend/app/repositories/material_repository.py)).
`compute_features` derives assignment due-dates from the canonical materials
instead of `knowledge_base`.

## Migration

[`app/scripts/migrate_materials.py`](../backend/app/scripts/migrate_materials.py) — dry-run by default; `--apply` backs up first.
```
python -m app.scripts.migrate_materials          # dry run, no writes
python -m app.scripts.migrate_materials --apply   # JSON backup -> normalize -> slim
```
**Result on the live data:** backup written to `backend/backups/`, then
`course_materials: 51`, `student_metrics: 7`, `student_events: 31`, and raw
payloads **103.4 KB → 4.8 KB (95% smaller)**. Verified: 51 docs / 51 unique keys
(no duplicates); slim payloads contain no `learning_materials` /
`materialsByCourse` / `knowledge_base`.

## Why this is more scalable & maintainable

- **One write per material** instead of ~3 — and materials are shared across all
  students in a course, so storage no longer scales with (students × copies).
- **No drift:** a single source of truth can't disagree with itself; categories
  can't go stale because they're derived.
- **Bounded document size:** student docs stay tiny — no path toward the 16 MB
  BSON limit no matter how many materials a course has.
- **Cleaner queries & maintenance:** materials, metrics, and events are
  independently queryable/indexable instead of buried in nested arrays.

## Modified / new files

**Backend (new):** `models/material.py`, `repositories/material_repository.py`,
`repositories/metrics_repository.py`, `repositories/event_repository.py`,
`services/moodle_ingest.py`, `scripts/migrate_materials.py`.
**Backend (changed):** `config/database.py` (collections + indexes),
`services/preprocessing.py` (derive assignments from materials),
`routes/moodle.py` (normalize + store slim payload).
**Extension (changed):** `background.js` (single `materials` array; removed
`buildKnowledgeBase`/`materialsByCourse`/`learning_materials`/`knowledge_base`),
`popup.js` (`sanitizePayload` + `getCourseMaterials` use the single array).

## API compatibility

`GET /raw-moodle-payloads`, the auth/admin APIs, and `/api/student/*` all keep
working (verified: 200s). The ingest response gains a `normalized` summary
(`materials_seen/new`, `events_new`).
