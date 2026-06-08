# AcademIQ — Admin System, Roles & Student Provisioning

Implementation notes for the role-based admin system, Moodle→AcademIQ identity
mapping, and automatic student account provisioning. Covers the database schema,
auth/role model, admin dashboard, identity mapping, account-creation + email
flow, and the route-protection strategy across **backend**, **frontend**, and
**Chrome extension**.

---

## 1. Database schema

A single MongoDB collection, **`users`**, holds every account (admins +
students). Documents are stored snake_case and serialised to camelCase for the
API. The password hash is **never** serialised to clients.

| Field            | Mongo key        | Notes                                            |
| ---------------- | ---------------- | ------------------------------------------------ |
| id               | `_id`            | Mongo ObjectId                                   |
| moodleUserId     | `moodle_user_id` | **Primary** Moodle linkage key (unique, sparse)  |
| studentId        | `student_id`     | **Secondary** linkage key (unique, sparse)       |
| fullName         | `full_name`      |                                                  |
| email            | `email`          | Login identifier (unique, lowercased)            |
| passwordHash     | `password_hash`  | bcrypt; never returned by the API                |
| role             | `role`           | `"admin"` \| `"student"`                         |
| createdAt        | `created_at`     | UTC datetime                                     |
| updatedAt        | `updated_at`     | UTC datetime                                     |

Indexes (created on startup via `ensure_indexes()` in
[`backend/app/config/database.py`](../backend/app/config/database.py)):

- unique `email`
- unique **sparse** `moodle_user_id`, `student_id` (multiple nulls allowed; real
  identifiers can't collide → no duplicate accounts)
- `sessions`: unique `token_hash`, plus `expires_at` for cleanup

Sessions live in the **`sessions`** collection: `{ token_hash, user_id, role,
created_at, expires_at }`. Only the SHA-256 **hash** of a token is stored.

Model + (de)serialisation: [`backend/app/models/user.py`](../backend/app/models/user.py).
All DB access goes through the repositories
([`user_repository.py`](../backend/app/repositories/user_repository.py),
[`session_repository.py`](../backend/app/repositories/session_repository.py)) so
the rest of the code never touches Mongo directly — this is also the seam for a
future schema/datastore change.

---

## 2. Role system

Two roles: **`admin`** and **`student`** (constants in `models/user.py`).

- The role is stored on the user document and embedded in the session.
- Login returns `{ user, role, token }`.
- Frontend `UserContext` exposes `role`, `isAdmin`, `isAuthenticated`.
- Redirect on login: **admin → `/admin`**, **student → `/dashboard`**
  ([`front-end/src/app/signin/page.tsx`](../front-end/src/app/signin/page.tsx)).

---

## 3. Authentication (session cookie + Bearer)

Sessions are opaque tokens (CSPRNG) stored hashed in `sessions`. On login the raw
token is returned **both**:

- as an `httpOnly` cookie (`academiq_session`) — used by the Next.js app, and
- in the JSON body — so the Chrome extension / API clients can send it as
  `Authorization: Bearer <token>`.

`get_current_user` ([`backend/app/auth.py`](../backend/app/auth.py)) accepts
either form, looks up the (unexpired) session, and loads the user. Routes:
[`backend/app/routes/auth.py`](../backend/app/routes/auth.py) — `POST
/api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

Passwords are hashed/verified with bcrypt; token hashing and generation live in
[`backend/app/services/security.py`](../backend/app/services/security.py).

---

## 4. Route protection strategy

**Backend (authoritative).** `require_role("admin")` is a FastAPI dependency
that 401s unauthenticated requests and 403s wrong-role requests. The entire
admin router is gated:

```python
router = APIRouter(prefix="/api/admin",
                   dependencies=[Depends(require_role("admin"))])
```

Students therefore **cannot** reach any `/api/admin/*` endpoint even by calling
the API directly.

**Frontend (UX).** `AuthGuard` ([`front-end/src/components/layout/AuthGuard.tsx`](../front-end/src/components/layout/AuthGuard.tsx))
takes an optional `requiredRole`:

- unauthenticated → `/signin`
- wrong role (e.g. a student opening `/admin`) → their own home

The admin route group [`front-end/src/app/(admin)/layout.tsx`](../front-end/src/app/(admin)/layout.tsx)
wraps `/admin` and `/admin/users` in `<AuthGuard requiredRole="admin">`. This is
UX only — the backend remains the security boundary.

---

## 5. Admin dashboard

Minimal, consistent with the existing design system (same `ui/` primitives,
tokens, card layout).

| Route          | Page                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| `/admin`       | Overview: user counts + quick links                                          |
| `/admin/users` | Manage users: **search**, **create**, **edit**, **delete**, **reset password** |

Components: [`UsersTable`](../front-end/src/components/admin/UsersTable.tsx),
[`UserFormPanel`](../front-end/src/components/admin/UserFormPanel.tsx),
[`AdminHeader`](../front-end/src/components/layout/AdminHeader.tsx).
API surface in [`front-end/src/lib/api.ts`](../front-end/src/lib/api.ts):
`getUsers(search?)`, `createUser`, `updateUser`, `deleteUser`, `resetPassword`.
All work against mock data offline and against the live backend when
`NEXT_PUBLIC_API_BASE_URL` is set.

Backend: [`backend/app/routes/admin.py`](../backend/app/routes/admin.py). Create
/ reset-password return a `generatedPassword` when the admin didn't supply one.

---

## 6. Moodle → AcademIQ identity mapping

Implemented in
[`backend/app/services/user_provisioning.py`](../backend/app/services/user_provisioning.py).
**Never** uses name matching. Match priority:

1. **Moodle User ID** (`moodle_user_id`)
2. **Student ID** (`student_id`)
3. Email (last-resort tie-breaker)

`resolve_or_create_user(identity)`:

- finds the existing account by the priority above and **backfills** any missing
  identifiers onto it (so an account created from a partial payload gets
  completed later), **or**
- creates a new `student` account if none matches.

Because the linkage keys are unique+sparse, the same student is never duplicated.

---

## 7. Automatic account creation + email flow

On `POST /raw-moodle-payloads`
([`backend/app/routes/moodle.py`](../backend/app/routes/moodle.py)), **before**
storing anything, the payload is mapped to an account. When no match exists, a
new account is provisioned:

1. generate a secure random password
   ([`backend/app/utils/password.py`](../backend/app/utils/password.py) — ≥12
   chars, upper/lower/digit/special, CSPRNG),
2. **hash** it (bcrypt) and store only the hash,
3. save the user with `role = "student"`,
4. email the student their name, the login URL, and the temporary password
   ([`backend/app/services/email_service.py`](../backend/app/services/email_service.py)).

The raw payload and computed feature vector are then stamped with
`academiq_user_id`, so all downstream ML data is tied to a real account.

**Email service** is reusable and SMTP-credential-driven via env vars
(`SMTP_HOST/PORT/USER/PASSWORD/FROM/USE_TLS`). If SMTP isn't configured it logs
the message to the console instead of sending — local dev never blocks. Plain
passwords exist only in that one email; they are never stored.

---

## 8. Chrome extension changes (where scraping was modified)

[`moodle-ai-extension/content.js`](../moodle-ai-extension/content.js) — the
identity extractor was rewritten. New best-effort, null-safe helpers:

- `parseMoodleUserId()` — reads the **user-menu** profile link
  (`/user/profile.php?id=NN`) so it never captures another user's id; falls back
  to `body[data-userid]`.
- `parseFullName()` — user-menu text / profile heading.
- `parseEmail()` — `mailto:` link or an email pattern on profile pages.
- `parseStudentIdNumber()` — Moodle's "ID number" (idnumber) field.
- `getStudentIdentity()` now returns `{ moodle_user_id, student_id, full_name,
  email, program, enrollment_year }`, persisting discovered values in
  `localStorage` so identifiers found on one page aren't lost on the next. A
  per-browser anonymous id is kept only as a last-resort `student_id` fallback.

[`moodle-ai-extension/background.js`](../moodle-ai-extension/background.js) —
`defaultData().student` extended with the new fields; the `identity` message
handler now **merges** (rather than overwrites) so identifiers accumulate across
pages. Also removed a fatal top-level `await` block that crashed the service
worker.

[`moodle-ai-extension/popup.js`](../moodle-ai-extension/popup.js) — removed a
broken `authToken` line (undefined variable). The synced payload already
includes `student`, so the new identity fields reach the backend unchanged.

---

## 9. Setup / run

**Backend**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # edit as needed (Mongo URI, SMTP, admin creds)
python -m app.scripts.seed_admin     # creates the initial admin
uvicorn main:app --reload
```

Default seeded admin (override via env): `admin@academiq.local` / `Admin@12345`
— **change after first login.**

**Frontend**

```bash
cd front-end
# .env.local
#   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000   # live backend
#   NEXT_PUBLIC_USE_MOCK=false
npm run dev
```

Leave `NEXT_PUBLIC_API_BASE_URL` empty to run fully on mock data (admin
dashboard included). In mock mode, signing in with `admin@academiq.local` lands
on `/admin`; any other email lands on `/dashboard`.

---

## 10. MongoDB readiness

MongoDB is already configured and connected. The new code is layered
(models → repositories → services → routes), so if the database connection
changes later, only `config/database.py` and the repositories are affected. The
seed script doubles as the migration/bootstrap step; no other migration is
required because MongoDB is schemaless and indexes are created on startup.
