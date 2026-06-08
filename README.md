# School Organiser

A single-teacher "command centre" web app: timetable, current-lesson resources, fast
lesson notes, task/time planning, and AI-assisted lesson & curriculum planning. Runs on
the school's internal Debian server, accessed from the teacher's desktop and laptop.

> **Status:** Phase 0 (skeleton) complete — a running, authenticated, backed-up empty app. Phase 1
> (Timetable · Now · Notes — the MVP) is **planned and awaiting build**: see
> [docs/PHASE_1_PLAN.md](docs/PHASE_1_PLAN.md). [docs/ROADMAP.md](docs/ROADMAP.md) shows what each
> phase adds; [docs/RUNBOOK.md](docs/RUNBOOK.md) to run it.

## The one-sentence pitch

> *"At any moment of the school day, open one page and see exactly what I'm teaching now,
> everything I need for it, what I must not forget before the next bell, and a box to dump
> what just happened — and let all of that feed lesson and curriculum planning later."*

## Who it's for

One computing teacher. Internal use only, on the school LAN. It holds pupil data, so it is
treated as a safeguarding-sensitive system: authenticated, backed up, and **pupil names are
never sent to any AI service** (see [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md)).

## Documents

Read in this order:

| Document | What it covers |
| --- | --- |
| [docs/SPECIFICATION.md](docs/SPECIFICATION.md) | Vision, glossary, every feature as a user story, non-functional requirements. **Start here.** |
| [docs/TEACHING_PATTERN.md](docs/TEACHING_PATTERN.md) | The real groups, courses, splits and TA lessons — seeds the data model. |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Entities, relationships, draft PostgreSQL schema. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Recommended stack, system shape, deployment, AI integration, resilience. |
| [docs/UX_FLOWS.md](docs/UX_FLOWS.md) | Wireframes and interaction flows for the key screens. |
| [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Auth, pupil-data handling, AI redaction, GDPR/DPIA pointers. |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased delivery plan and MVP definition. |
| [docs/PHASE_1_PLAN.md](docs/PHASE_1_PLAN.md) | Detailed build plan for Phase 1 (the MVP): schema, real-timetable seed, ClockService, screens. |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Decisions still needed from the teacher (you). |

## Run it (Phase 0)

```bash
cd app
cp .env.example .env                  # then set SESSION_KEY + APP_PASSWORD_HASH
npm install
docker compose up -d db               # Postgres (pgvector) on :5434
npm run migrate
npm run dev                           # http://localhost:44360
```

Full steps (password hashing, production deploy, backups) are in [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Repository layout

```text
School_Organiser/
├── README.md            ← you are here
├── docs/                ← specification & design (the current deliverable)
├── data/
│   └── imports/         ← drop existing planning, exports, forwarded emails here for import
├── scripts/             ← backup.sh / restore.sh (+ more as phases land)
└── app/                 ← the application (Phase 0: Fastify + Postgres + single-user auth)
```

## Conventions

This project deliberately follows the same conventions as the sibling `exam_questions`
project so patterns (and code) can be shared: TypeScript on the server, Fastify, PostgreSQL
with pgvector, server-rendered HTML with HTMX, a single LLM-client wrapper, and "boring on
purpose" infrastructure. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the rationale
(stack decided: TypeScript / Fastify).
