# AcademIQ — Frontend

AcademIQ is a supplementary learning platform that works alongside the
university's Moodle LMS. It surfaces machine-learning insights — grade
prediction, burnout detection, performance classification, and risk-factor
explanation — and generates practice quizzes from a student's own lecture
materials. All student data and credentials originate in Moodle and reach the
app through the FastAPI backend; there is no sign-up flow.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- ESLint
- lucide-react (icons), recharts (charts), class-variance-authority

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

By default the app runs against **mock data** (see `src/lib/mock.ts`) so every
page works without a backend. To point at the real FastAPI backend, copy
`.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL`.

## Data flow

The single seam between UI and data is `src/lib/api.ts`. Each method either
returns mock data or performs a real `fetch` against the backend, chosen by env
vars — the UI components never change.

| Source | Provides |
| --- | --- |
| Moodle (scraped/integrated) | credentials, enrolled courses, graded tasks, material titles/content, engagement signals |
| ML models (FastAPI) | grade prediction, performance clustering, burnout detection, risk-factor explanation, quiz generation |
| App database (MongoDB) | derived metrics, aggregates, cached per-student/per-course model outputs |

## Project structure

```
src/
  app/
    layout.tsx            # root layout: fonts + UserProvider
    globals.css           # design system (HSL tokens mapped to Tailwind v4)
    page.tsx              # public landing page (/)
    signin/page.tsx       # sign-in (/signin) — validates Moodle credentials
    not-found.tsx
    (app)/                # authenticated route group (guarded shell + nav)
      layout.tsx
      dashboard/page.tsx        # quick stats, study-time trend, burnout risk
      performance/page.tsx      # course-scoped prediction/status/average/stats
      insights/page.tsx         # classification + ranked risk factors
      quiz/page.tsx             # course -> material checkboxes -> generated quiz
  components/
    ui/                   # primitives (button, card, input, badge, ...)
    layout/               # marketing + app headers, footer, auth guard
    home/ dashboard/ performance/ insights/ quiz/ common/
  context/UserContext.tsx # session state (rehydrated from localStorage)
  lib/
    types.ts              # domain types shared with the backend
    api.ts                # mock/live data client (the swap point)
    mock.ts               # sample data
    status.ts             # burnout/performance -> color & badge mapping
    utils.ts              # cn() helper
```
