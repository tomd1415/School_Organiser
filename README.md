# School Organiser

A single-teacher "command centre" web app: timetable, current-lesson resources, fast
lesson notes, task/time planning, and AI-assisted lesson & curriculum planning. Runs on
the school's internal Debian server, accessed from the teacher's desktop and laptop.

> **Status:** **Phases 0–6 are built** — the daily core (timetable, Now, lessons, notes, tasks,
> time, focus, events, captured), schemes of work + the hosted resource store, the full **AI
> layer** behind one redaction/withholding/audit wrapper ([docs/PHASE_4_PLAN.md](docs/PHASE_4_PLAN.md)),
> **curriculum delivery** (master schemes with per-class adaptations + change logs, convert-a-
> downloaded-unit, calendar lay-down, the two-way feedback loop, curriculum map with carry-over,
> kit inventory — [docs/PHASE_5_PLAN.md](docs/PHASE_5_PLAN.md)), and **setup & September**
> (in-app editors incl. the timetable editor, the rollover wizard with the class predecessor
> chain, onboarding for per-teacher instances — [docs/PHASE_6_PLAN.md](docs/PHASE_6_PLAN.md)).
> From the old polish list, **email intake + AI triage** (a forwarded email becomes a task /
> event / captured item / note, with fact chips) and the **TA read/feedback login** are also
> live; lessons default to **3-level differentiation** (Support/Core/Challenge around each
> class's recorded ability midpoint), generated resources preview/present in-browser and export
> to Word, and an in-lesson tracker doubles as the stopping point. Log in over the LAN
> (`./start.sh`). **Phases 8 and 9 are now built.** **Phase 8 — pupil logins** ([docs/PHASE_8_PLAN.md](docs/PHASE_8_PLAN.md)):
> pupils log in (class code → tap your name → PIN) and fill in their worksheet **sliced to their
> level**, with a Done ✓ and a tap-the-faces feedback widget. **Phase 9 — auto-marking & the
> results loop** ([docs/PHASE_9_PLAN.md](docs/PHASE_9_PLAN.md)): objective answers mark themselves,
> written answers are AI-suggested (anonymous per-question batches, safety-gated) for the teacher to
> confirm; released results show on the pupil's screen (ticks-only by default); marks feed the adapt
> loop, a printable answer pack, CSV export and per-pupil "what works for me" profiles; pupils can
> "stay signed in on this computer". Both sit behind **DPIA-gated master switches that are off until
> DPO/SLT sign-off is confirmed**. **Phase 10 — trustworthy in daily use**
> ([docs/PHASE_10_PLAN.md](docs/PHASE_10_PLAN.md)) is built: encrypted nightly backups with a
> restore-drill, pupil erasure/anonymisation with a disposal audit, a teacher **idle-logout**, the
> in-app **AI-call audit viewer**, a **safeguarding disclosure register**, a reboot-durable marking
> queue, SEND accessibility options and global search. **Phase 11 — the teacher's idea backlog**
> ([docs/MORE_IDEAS.md](docs/MORE_IDEAS.md)) is largely built: a standing teaching-concepts library,
> an optional per-class guided-access questionnaire, a **spec-point coverage backbone** with uploaded
> official course documents, per-feature model choice, and an opt-in **advisory AI lesson reviewer**
> (off by default). The whole app now wears a **Rail & Stage** UI — a persistent grouped left rail
> beside one content stage, an everyday/power experience toggle, a command palette and an
> accessibility toolbar (see [docs/UX_FLOWS.md](docs/UX_FLOWS.md)). **Phase 12 — zero-friction pupils
> & content-rich worksheets** ([docs/PHASE_12_PLAN.md](docs/PHASE_12_PLAN.md)) and **Phase 13 — multi-
> lesson weeks, one unified lesson card, tri-state inline editing & the drag-drop planner**
> ([docs/PHASE_13_PLAN.md](docs/PHASE_13_PLAN.md)) are both built: a unit now sequences across **all**
> a class's weekly slots, the same lesson card is reused on the timetable and the Schemes spine, a
> 👁/✏-this-class/✏-master toggle inline-edits the lesson or its per-class adaptation, the pupil view
> previews in a new tab, and [/planner](app/src/routes/planner.ts) drags lessons/whole-units into a
> holiday-aware class timeline (insert/cascade, move, pull-forward, lock, undo). Most recently, a
> **per-unit summative assessment subsystem** ([docs/PHASE_15_PLAN.md](docs/PHASE_15_PLAN.md) tracks
> what remains): AI **generates** a paper covering what *this class* was taught (GCSE groups →
> OCR-J277 exam style), the teacher reviews/marks-it-ready and **assigns** it with an availability
> window, pupils **take** it behind the pupil gate (the answer key never reaches them), objective
> parts **auto-mark** and open answers are **AI-marked** in anonymous, redacted, slot-lettered batches
> for the teacher to confirm, and **results** release per-pupil + per-spec-point — all behind the same
> redaction/withholding/audit wrapper and the `is_test` Test-Lab partition. Beyond: the parked
> **multi-teacher** v2 ([docs/PHASE_MULTI_TEACHER_PLAN.md](docs/PHASE_MULTI_TEACHER_PLAN.md)).

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
| [DEPLOYMENT.md](DEPLOYMENT.md) | **Deploy on Proxmox** — step-by-step (LXC one-command or Debian VM), TLS, backups/restore, upgrades. |
| [docs/SPECIFICATION.md](docs/SPECIFICATION.md) | Vision, glossary, every feature as a user story, non-functional requirements. **Start here.** |
| [docs/TEACHING_PATTERN.md](docs/TEACHING_PATTERN.md) | The real groups, courses, splits and TA lessons — seeds the data model. |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Entities, relationships, draft PostgreSQL schema. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Recommended stack, system shape, deployment, AI integration, resilience. |
| [docs/UX_FLOWS.md](docs/UX_FLOWS.md) | Wireframes and interaction flows for the key screens. |
| [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Auth, pupil-data handling, AI redaction, GDPR/DPIA pointers. |
| [docs/DPIA.md](docs/DPIA.md) | Data Protection Impact Assessment (draft) — the named-pupil-data control, sub-processor, retention, sign-off. |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased delivery plan and MVP definition. |
| [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) | Living checklist of near-term follow-ups (deploy polish, setup/cover feature follow-ons). |
| [docs/FUTURE_WAVES.md](docs/FUTURE_WAVES.md) | Strategic idea backlog beyond Phase 11 (Wave 6+): absence/cover, quiet automation, insight from the record, pupil-facing depth. |
| [BUGREPORT.md](BUGREPORT.md) | The 19 June 2026 project-wide audit — 50 findings (privacy/security, correctness, recovery, transactional invariants) with reproduction + fix sketch per item. |
| [docs/REMEDIATION_PLAN.md](docs/REMEDIATION_PLAN.md) | The fix-and-finish programme: the BUGREPORT findings organised into Waves 0 + A1–A8 (foundations first), **plus** the consolidated outstanding-features track (Wave 6+/Phase 14/Phase 7 tail). |
| [docs/UI_SEPARATION_PLAN.md](docs/UI_SEPARATION_PLAN.md) | Plan to get the UI to ~95% isolation from the back-end (view-models, one `paths.ts` URL module, CSS ownership, a component gallery, guardrails) **+ the live board slide-sync feature**. Grounded in a coupling audit. |
| [docs/TEST_LAB_PLAN.md](docs/TEST_LAB_PLAN.md) | The isolated "Test Lab" (run any lesson sandboxed: teacher + test pupil, write answers, mark — no effect on real classes). Phases 1–2 built; isolation by an `is_test` occurrence partition. |
| [docs/PHASE_1_PLAN.md](docs/PHASE_1_PLAN.md) | Detailed build plan for Phase 1 (the MVP): schema, real-timetable seed, ClockService, screens. |
| [docs/PHASE_2_PLAN.md](docs/PHASE_2_PLAN.md) | Detailed build plan for Phase 2: tasks, time, events, focus mode, captured info, pupils. |
| [docs/PHASE_3_PLAN.md](docs/PHASE_3_PLAN.md) | Detailed build plan for Phase 3: schemes of work, lesson plans, the hosted resource store. |
| [docs/PHASE_4_PLAN.md](docs/PHASE_4_PLAN.md) | Detailed build plan for Phase 4: the one LLM wrapper (redaction + safeguarding withholding + audit) and AI planning features. |
| [docs/PHASE_5_PLAN.md](docs/PHASE_5_PLAN.md) | Detailed build plan for Phase 5: curriculum delivery — master schemes, per-group adaptation + change log, converting downloaded units, and the term calendar. |
| [docs/PHASE_6_PLAN.md](docs/PHASE_6_PLAN.md) | Build plan for Phase 6: in-app setup editors, the September rollover (new timetable every year; class-group knowledge follows the group), the onboarding wizard, and per-teacher instances. |
| [docs/PHASE_8_PLAN.md](docs/PHASE_8_PLAN.md) | Build plan for Phase 8: pupil logins and in-app work — interactive worksheets, answers as data, teacher review, per-TA accounts. |
| [docs/PHASE_9_PLAN.md](docs/PHASE_9_PLAN.md) | Build plan for Phase 9: auto-marking (deterministic + AI-suggested, teacher-released), results back to pupils, marks feeding the loop, "what works for me" profiles, stay-signed-in devices. |
| [docs/PHASE_10_PLAN.md](docs/PHASE_10_PLAN.md) | **Built.** Phase 10 — trustworthy in daily use: make the privacy/safeguarding promises real (encrypted backups, pupil erasure/SAR, teacher idle-logout, disclosure register, AI audit viewer), stop silently losing work (resilient autosave, durable marking queue), SEND accessibility (read-aloud, display options, progress), close the feedback loop (retrieval starters, standing digest), and daily-driver polish (global search, capture-anywhere, MIS import). Single-teacher only. |
| [docs/MORE_IDEAS.md](docs/MORE_IDEAS.md) | **Largely built.** Phase 11 — the teacher's idea backlog, sequenced: standing style/feature prefs, a teaching-concepts library and guided cohort-access prompts (all on the existing `context[]` seam), a spec-point coverage backbone + uploaded official course docs, per-feature model choice + an opt-in Opus reviewer, and a calmer nav (daily-vs-setup split, one typed nav model, swappable themes). Single-teacher only. |
| [docs/PHASE_MULTI_TEACHER_PLAN.md](docs/PHASE_MULTI_TEACHER_PLAN.md) | **Unnumbered / parked** future v2: one shared school server, multiple teacher accounts, one account per pupil, opt-in cross-subject planning signal. Not started — gated on the single-teacher tool being proven and a fresh whole-school DPIA. |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Decisions still needed from the teacher (you). |
| [docs/LESSON_BUNDLE_TRANSFER.md](docs/LESSON_BUNDLE_TRANSFER.md) | Agent runbook for copying **master lessons** between instances (export → bundle → `seed:lessons`), incl. over the internet via git. Bundles not a DB copy; `--new-only` on a populated instance. |

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
