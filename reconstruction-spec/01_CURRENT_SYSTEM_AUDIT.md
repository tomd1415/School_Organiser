# Current system audit

## 1. Audit basis

The current workspace was inspected across application source, migrations, public assets, tests, deployment scripts, operational scripts, phase plans, audits, UX handoffs, and the active Git diff. Existing files were not modified. The documentation in this directory is the only new content.

Validation performed against the current workspace:

- `npm run typecheck`: passed.
- `npm test`: **86 files, 617 tests passed**.
- `npm run test:integration -- --reporter=dot`: **79 files, 356 tests passed**.
- Total validated automated checks: **973**.

Repository scale at audit time:

- 252 TypeScript source files under `app/src`.
- 40 route modules plus authentication routes.
- 325 explicit route-registration statements and approximately 335 runtime endpoints after loop-generated actions are expanded.
- 68 PostgreSQL tables created across 60 migration files (migration number 0045 is intentionally absent).
- About 56,000 lines across source, assets, tests, and migrations.
- 86 unit-test files and 79 integration-test files.

The working tree was already dirty before this documentation work. Active changes include live slide synchronisation, pupil offline answer buffering/keep-alive, level-correct marking-modal rendering, and associated tests/migration. Those changes passed the complete test suite and are treated as current behaviour.

## 2. What the application is

School Organiser is a single-teacher command centre for a UK computing/SEND school context. It joins five previously separate records:

1. the repeating timetable and dated exceptions;
2. curriculum plans, lesson plans, class adaptations, and teaching resources;
3. immediate operational work: notes, tasks, events, free-period plans, timers, and captured information;
4. pupil lesson work, feedback, ATL, marking, and results;
5. privacy-controlled AI assistance for planning, resource generation, categorisation, and marking.

It is optimised for short, repeated use around bells. The core question is: **what is happening now, what is next, and what must not be forgotten before then?**

## 3. Current technical shape

| Layer | Current implementation |
|---|---|
| Runtime | Node.js + TypeScript |
| Web | Fastify 5, server-rendered HTML, form posts, HTMX fragments |
| Client | Vendored HTMX plus hand-written `app.js` and `pupil.js` |
| Validation | Zod at many, but not all, route boundaries |
| Database | PostgreSQL through `pg`; SQL repositories and migrations |
| Files | Local resource volume with version rows and SHA-256 checksums |
| AI | Anthropic SDK through one wrapper; text and structured calls |
| Documents | PDF/Office/plain-text extraction; Office conversion through Gotenberg |
| Real time | HTMX polling and in-process Server-Sent Events for slide sync |
| Auth | Encrypted secure-session cookie; teacher password; named/shared TA passwords; class-code/name/PIN pupil flow |
| Deployment | Docker Compose, Caddy TLS, PostgreSQL, app, optional Gotenberg |
| Operations | Migrations on boot, encrypted backup/restore scripts, year export, import/reconcile tools |

The application is a modular monolith in intent, but route modules often contain rendering, orchestration, raw SQL, and business rules together. The largest lesson, scheme, setup, resource, and worksheet modules carry disproportionate complexity.

## 4. Shipped capability summary

The current code implements:

- academic years, terms, holidays/INSET, year-specific day shapes, rooms, staff, courses, groups, enrolments, and timetables;
- date-aware Now, timetable, lesson, free-period, club, cover/room/free/cancelled exception, and daily-print surfaces;
- multi-course lessons and multi-slot-per-week class delivery;
- reusable schemes, units, lesson plans, versions, one-active-scheme invariants, planner/map placement, carry-over, and cross-class adaptations;
- versioned resources, bulk folder/ZIP import, duplicate checking, extraction, block/Markdown editing, preview, presentation, Word export, attribution, and image placeholders;
- quick notes, routed notes, follow-ups, stopping points, tasks, recurrence, events/deadlines, focus mode, work blocks, timers, captured information, interests, and full-text search;
- class context, ability midpoint, guided-access prompts, teaching concepts, pedagogy guidance, kit inventory, spec-point coverage, exam dates, and course documents;
- TA read/feedback access and oversee view;
- pupil access, differentiated worksheets, multiple worksheets, autosave, offline text buffer, screenshot answers, Done state, feedback, accessibility toolbar, test-pupil preview, and remembered devices;
- deterministic and AI-suggested marking, editable mark schemes, teacher confirmation/override, release/hold modes, comments, class summaries, CSV/answer-pack export, pupil profiles, and ATL scores;
- teacher-to-pupil live slide position and lock state using SSE;
- AI scheme/lesson/resource creation, adaptations, review, email/note/capture routing, coverage suggestions, retrieval, summaries, task breakdown, marking, and profiles;
- safeguarding register, AI audit log/export, subject-access export, anonymisation/erasure, durable file-deletion queue, session revocation, rate limiting, and DPIA-controlled feature switches;
- scheduled recurring-task generation, IMAP polling, durable marking jobs, deletion retries, morning brief, and optional reviewer sweep.

## 5. Important behavioural boundaries

- Teacher access is privileged and broad. TA and pupil roles are deny-by-default.
- Pupil access and pupil marking are independent DPIA-gated switches; marking requires pupil access.
- A pupil can write only to their own current, non-cancelled lesson and only to real fields in the worksheet they were served.
- Pupil level names are not shown to the pupil; the worksheet is silently sliced to shared plus Support/Core/Challenge content.
- Objective marking is deterministic. Open-answer AI marks are suggestions until a teacher confirms them.
- Pupil results show only confirmed marks and only after the configured release rule allows them.
- Safeguarding-marked content is withheld from AI, not merely redacted.
- Roster names are tokenised before AI egress and re-expanded only after a response returns.
- Teacher notes embedded in slides must never reach the pupil or projector render.
- Polls return 204 when unchanged so background updates do not destroy focus or typed work.
- Opening a normal teacher lesson may materialise its occurrence; previews and print/read paths must avoid ghost occurrences where specified.

## 6. Current strengths worth preserving

- Safety rules are implemented at the server boundary and covered by regression tests.
- Core operation remains useful when AI is disabled.
- Resource and pupil-file lifecycle includes atomic writes or durable cleanup paths.
- Database uniqueness and advisory locks protect several important concurrency invariants.
- The app has realistic seeded test data and unusually broad integration coverage.
- Accessibility is treated as a functional feature, not a later theme.
- AI spend is pre-reserved atomically against a monthly cap and every request is audited in redacted form.

## 7. Current debt that should not be copied

### 7.1 Presentation architecture

- HTML is assembled through long string templates with no typed component boundary.
- Behaviour depends on IDs, CSS classes, `data-*` attributes, HTMX targets, and out-of-band fragments that TypeScript cannot check.
- The dark UI still imports a large recovered light-widget stylesheet and then repairs it with a broad compatibility layer and many `!important` declarations.
- The resulting theme can leak light widget rules into dark pages. A rebuild should have one token system and no compatibility CSS.
- Navigation has both a model and a hand-built ribbon grouping; the two can drift.

### 7.2 Layering and complexity

- Some route modules contain SQL, business transactions, rendering, AI orchestration, and file operations.
- Repositories sometimes import domain constants from services, reversing the intended dependency direction.
- Repeated date formatting, page widgets, and resource-generation pipelines increase drift.
- The current schema includes both older and newer concepts for schedule exceptions, plus many narrow tables that can be rationalised in a clean rebuild.

### 7.3 Performance

- The asynchronous global header adds another request and multiple database reads to every full page.
- The lesson screen repeats pupil/resource queries between initial rendering and lazy panels.
- Some pupil rollups use correlated subqueries.
- Static assets are not fingerprinted for immutable caching.
- The planner applies placement changes through repeated occurrence lookups rather than a set-based write.

### 7.4 Background work

- Recurring, email, marking, deletion, brief, and review jobs run through in-process timers.
- This is adequate for one process, but restarts, clock drift, and accidental multi-process deployment require bespoke claims.
- The morning-brief scheduled job currently computes a limited subset; the richer brief is assembled on demand.
- Review-sweep recovery still has a hard-crash gap between claiming a day and completing the sweep.

### 7.5 Test gaps

- There is no true end-to-end browser suite for drag/drop, keyboard, touch, focus management, SSE, offline/reconnect, or accessibility.
- Phase 14 planner hardening remains planned: no silent cascade overflow, click/keyboard placement, pure drop-resolution tests, set-based writes, and preview/edit edge cases.
- Query-count and response-time budgets are not enforced.
- Backup scripts exist, but the operator must still perform and record a real isolated restore drill.

## 8. Confirmed inconsistencies and latent issues

- The per-feature AI registry does not list every actual call label. `lesson_slides`, `adapt_slides`, `estimate_calibration`, and `review_scheme` are examples of call-site features not represented in the settings picker.
- Several old documents still label already-built pupil/marking features as planned or refer to removed dual-shell assets. Do not use phase status text as runtime truth.
- Current client/test comments still mention prior asset names after consolidation.
- The application hardcodes `Europe/London` in several domain paths even though some UI concepts imply configurability. The target must choose one explicit school timezone setting and use it everywhere.
- Plain IMAP secrets can be stored in the settings table. The UI avoids re-rendering them, but a target design should encrypt application-managed secrets at rest or require environment/secret-file management.

## 9. Source-of-truth precedence for the rebuild

When evidence conflicts, use this order:

1. current server-side permission and persistence code;
2. current passing integration tests;
3. current passing unit/client tests;
4. migrations and database constraints;
5. current UI rendering;
6. this reconstruction pack;
7. older project/phase documents.

During the actual rebuild, this pack becomes canonical only after the owner reviews its open decisions and approves any deliberate behavioural changes.

