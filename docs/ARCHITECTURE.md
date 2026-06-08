# Architecture

How the School Organiser is built and deployed. Cross-references [DATA_MODEL.md](DATA_MODEL.md)
for the schema and [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) for data handling.

## Architectural goals

1. **Glanceable and instant on the LAN.** Server-rendered HTML, minimal JS, sub-150 ms perceived.
2. **Useful without the LLM.** Timetable, notes, tasks and time logging all work with the AI
   provider offline. AI is additive.
3. **One language, one database.** TypeScript on the server; PostgreSQL for relational *and*
   vector data (pgvector), exactly as `exam_questions` does — so code and patterns are shared.
4. **The clock is a first-class service.** "What am I teaching now?" is computed from weekday +
   time + term dates + one-off exceptions, in one place, testable in isolation.
5. **Replaceable LLM.** All AI calls go through one wrapper (redaction + audit + provider swap).
6. **Boring on purpose.** Standard HTTP, standard SQL, Docker Compose, nightly backups. One
   server, one user.

## Recommended stack

| Layer | Choice | Why |
| --- | --- | --- |
| Language/runtime | **TypeScript on Node 24** (`.nvmrc` → 22 for Debian parity) | Matches `exam_questions`; share code. |
| Web framework | **Fastify 5** | Same as `exam_questions`; fast, schema-first. |
| Rendering | **Server-rendered templates + HTMX** | Quick partial updates (note autosave, "log actual", inline edits) without a SPA. |
| Styling | Tailwind (or plain CSS) | Optional; keep it light. |
| Database | **PostgreSQL 16 + pgvector** | Relational core + semantic note search later. |
| Migrations | SQL files run in order (same tooling as `exam_questions`) | Auditable schema history. |
| Validation | **Zod** per route | Same convention. |
| AI | **OpenAI Responses API** (structured outputs) via a single client, Gemini-swappable | Project-wide convention; keys in `.env`. |
| Container | **Docker Compose** | App + Postgres; deploy to Debian unchanged. |
| Reverse proxy | **Caddy** (as in `post16_lessons`) or nginx | TLS on the LAN, single entry point. |

### Stack decision: TypeScript (confirmed)

**Decided: TypeScript / Fastify**, to reuse `exam_questions` (your richest project) — its LLM
client, auth, HTMX patterns and backup scripts — and keep code shareable between the two.
A Python / FastAPI build was the considered alternative (it matches `post16_lessons` /
`computing_check`); both deploy identically via Docker to Debian, so this could be revisited
before Phase 0 if you change your mind. The rest of this document assumes TypeScript.

## High-level shape

```text
            ┌─────────────────────────────┐         ┌─────────────────────────────┐
            │ Teacher desktop  │  laptop   │         │ (optional) phone for capture│
            │ Browser: HTML + HTMX         │         └──────────────┬──────────────┘
            └───────────────┬──────────────┘                        │ school LAN
                            │ HTTPS (LAN)                            │
                            ▼                                        ▼
                ┌───────────────────────────── Caddy (TLS, reverse proxy) ─────────────────┐
                │                                                                            │
                │   ┌──────────────────────────── Fastify app ───────────────────────────┐ │
                │   │ Routes ─▶ Services ─▶ Repos (SQL)                                    │ │
                │   │   │          │                                                       │ │
                │   │   │          ├─▶ ClockService  (what period is it now?)             │ │
                │   │   │          ├─▶ TimetableService / NotesService / TaskService …     │ │
                │   │   │          └─▶ LLM client ──redact pupil names──▶ OpenAI/Gemini    │ │
                │   │ Templates (server-rendered HTML + HTMX partials)                     │ │
                │   └──────────────────────────────────┬───────────────────────────────────┘ │
                └────────────────────────────────────── │ ─────────────────────────────────────┘
                                                         ▼
                                          ┌──────────────────────────┐      ┌──────────────────┐
                                          │ PostgreSQL 16 + pgvector │      │ Outbound HTTPS    │
                                          └────────────┬─────────────┘      │ to AI provider    │
                                                       │                    │ (redacted only)   │
                                          ┌────────────▼─────────────┐      └──────────────────┘
                                          │ Nightly backup → school  │
                                          │ off-site regime          │
                                          └──────────────────────────┘
```

No queue/Redis initially. If background work appears (email polling, embedding batches,
nightly note summaries) add a single worker process or a cron-driven script — not a broker.

## Components

### Web layer (Fastify)

- One route per teacher action; HTMX for partial swaps (autosave a note, toggle a follow-up,
  log "actual" on a work block). No client-side router.
- All POSTs CSRF-protected; session cookie HttpOnly/Secure/SameSite=Strict.
- Per-route Zod schemas; validation failures render a templated message.

### Application services (where all logic lives)

- **ClockService** — given a `Date`, resolve weekday, current & next period, term/holiday
  status, and any `schedule_exceptions`. Single repeating week (no A/B cycle). Pure and
  unit-tested; the Now screen and "by next lesson" task rules both depend on it.
- **TimetableService** — render the week/day grid; resolve a date to its real occurrences.
- **OccurrenceService** — find-or-create the dated occurrence for a slot; attach plan/notes.
- **NotesService** — fast create/autosave; promote follow-ups to tasks; tag; search.
- **TaskService** — inbox/triage/schedule/complete; resolve `due_rule` against the timetable.
- **WorkBlockService** — plan time, record actual vs. planned (the "diverted" path).
- **ResourceService** — upload, version, preview/download and AI-edit resources for a
  plan/occurrence (the single source of truth).
- **AvailabilityService** — compute the real **work windows** for a day (free periods +
  before/after school) by subtracting teaching, clubs, break/lunch, meetings and `events`.
- **EventService** — parents' evenings, EHCP reviews, report deadlines; lead-time reminders and
  prep-task generation.
- **FocusService** — pick the **single next action** for "now" from urgency, `due_rule`,
  available window and `cognitive_load`; serve the end-of-day wind-down.
- **EmailIntakeService** — turn an ingested email into a task (method TBD — see below).
- **PlanningAssistant (AI)** — next-lesson draft, term summary, curriculum redesign.

### Repositories (SQL)

- Thin functions over `pg`. No ORM required (matches `exam_questions`); SQLAlchemy if Python.

### LLM client (one wrapper)

- Single entry point for every AI call. Responsibilities: **redact pupil names → tokens**
  (from `pupils.ai_token`), select provider/model from `settings`, call with structured-output
  schema, and write an `ai_calls` audit row containing only the **redacted** request.
- Swapping OpenAI ↔ Gemini touches only this file.

### Scheduler / clock source

- The app trusts the server clock (the Debian box keeps NTP). The Now screen polls or uses a
  small HTMX `hx-trigger="every 30s"` to advance the current period; no websockets needed.

### Resource storage (the app is the single source of truth)

Resources are **uploaded to and served by the app**, replacing today's scattered copies. Files
live on a dedicated **disk volume** (path in `settings`); metadata and version history live in
the DB (`resources` / `resource_versions`).

- **Upload / view / download.** PDFs and images preview in the browser directly; Office formats
  (docx/pptx/xlsx) download to open, with optional in-browser preview via a **server-side render
  to PDF** (e.g. headless LibreOffice in a sidecar container).
- **Versioned.** Every change (teacher or AI) writes a new `resource_versions` row and advances
  `current_version_id`, so edits are reviewable and reversible.
- **AI edits.** The LLM wrapper can produce a new version of a resource. Text-based formats
  (Markdown/HTML worksheets, lesson-plan text, quiz content) are straightforward to edit and
  diff; binary Office files are harder — likely "AI drafts a replacement you accept" rather than
  in-place editing. **How far AI editing goes is [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) Q14.**
- **Import.** A script ingests existing scattered copies from a share/folder, hashing each
  (`checksum`) to flag duplicates so you consolidate to one canonical copy.
- **Backups now include the file store**, not just the database — see Deployment.

## Proposed application layout

To be scaffolded once the stack is confirmed (TypeScript shown):

```text
app/
├── package.json
├── docker-compose.yml          # app + postgres(+pgvector)
├── .env.example                # OPENAI_API_KEY, SESSION_SECRET, DB url, AI_PROVIDER …
├── migrations/                 # 0001_init.sql, 0002_tasks.sql …
├── seeds/                      # period_definitions (day shapes), term dates
├── src/
│   ├── server.ts               # Fastify bootstrap
│   ├── routes/                 # now, timetable, lessons, notes, tasks, blocks, ai, settings
│   ├── services/               # ClockService, NotesService, …
│   ├── repos/                  # SQL access
│   ├── llm/                    # client.ts (redaction + audit), prompts/, schemas/
│   ├── templates/              # server-rendered views + HTMX partials
│   └── lib/                    # auth, csrf, validation, time helpers
├── public/                     # css, minimal js, htmx
└── tests/                      # ClockService etc. (Vitest)
scripts/                        # backup.sh, restore.sh, import-eml.ts, deploy notes
```

## Deployment (school Debian server)

1. `docker compose up -d --build` brings up Fastify + Postgres (+ an optional headless-LibreOffice
   sidecar for Office previews). A named **volume holds the resource file-store**. `restart: unless-stopped`.
2. Caddy terminates TLS and proxies to the app on the LAN hostname (e.g. `organiser.school.internal`).
3. Migrations run on boot (or via `docker compose exec app npm run migrate`).
4. **Backups (non-negotiable — notes *and now resource files* are irreplaceable):** nightly
   `pg_dump` **plus a snapshot of the resource file-store volume**, from `scripts/backup.sh` to a
   local path the school's existing off-site backup already sweeps; keep N daily + M weekly;
   **test the restore** at least once. Document in a RUNBOOK.
5. Survives power loss: Compose restart policy + Postgres durability; no in-memory state that
   matters.

## Resilience & "useful offline"

- If the AI provider is unreachable, AI panels show a clear "unavailable" state and every
  manual feature keeps working.
- If the browser briefly loses the LAN, in-progress note text is preserved client-side and
  re-submitted (HTMX retry / local draft) so a half-written observation is never lost.

## Email intake — three candidate mechanisms (decide later)

1. **Forward-to-mailbox + IMAP poll.** A dedicated address; a scheduled script pulls new mail
   into `email_intake`. Most automatic; needs mailbox credentials in `.env`.
2. **Paste box.** A textarea where you paste an email; it's parsed into a task. Zero infra.
3. **`.eml` drop.** Save/forward emails into `data/imports/`; `scripts/import-eml.ts` ingests.

Recommendation: ship **(2) paste box** in the first task phase (no infrastructure), add **(1)**
later if the volume justifies it. See OPEN_QUESTIONS.

## Why not a SPA / heavier stack

One user on a LAN doing many short interactions: server-rendered HTML + HTMX is faster to
build, faster to load, trivially backed up, and matches the proven `exam_questions` approach.
A React/Vue SPA would add a build pipeline and API surface for no user-visible benefit here.
