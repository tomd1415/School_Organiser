# School Organiser

A single-teacher "command centre" web app: timetable, current-lesson resources, fast
lesson notes, task/time planning, and AI-assisted lesson & curriculum planning. Runs on
the school's internal Debian server, accessed from the teacher's desktop and laptop.

> **Status:** Phase 1 in progress — the schema, the real-timetable seed, the ClockService, the
> **week timetable grid** and **lesson detail** are built (run `./start.sh`). Next: fast notes,
> then the live *Now* screen. See [docs/PHASE_1_PLAN.md](docs/PHASE_1_PLAN.md) for the build order
> and [docs/ROADMAP.md](docs/ROADMAP.md) for what each phase adds.

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

## Run it

One command brings everything up — it stops anything already running, starts Postgres + the app,
waits for health, and seeds the real timetable if the database is empty:

```bash
./start.sh            # dev (hot-reload via Docker) — http://localhost:44360
./start.sh prod       # production stack (built image; for the Debian / Proxmox server)
./stop.sh             # gracefully stop everything (database volume preserved)
```

First-time setup: `cp app/.env.example app/.env`, then set `SESSION_KEY` (`openssl rand -hex 32`)
and `APP_PASSWORD_HASH` (`cd app && npm run hash-password -- 'your-password'`) in `app/.env`.
Prefer host hot-reload without Docker? `cd app && npm install && npm run dev`.

Full steps (production deploy, backups) are in [docs/RUNBOOK.md](docs/RUNBOOK.md).

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
