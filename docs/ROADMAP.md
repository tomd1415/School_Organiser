# Roadmap

Phased delivery. Each phase is independently useful and shippable to the school server, so the
tool earns its keep early and we learn before building more. Priorities reference the user
stories in [SPECIFICATION.md](SPECIFICATION.md).

> **Status (2026-06-15):** Phases **0–6 and 8–10 built** and in daily use (Phase 4's optional 4.6/4.8
> extras aside); **Phase 7** (polish) is an ongoing pick-by-pain list, much of it absorbed into Phase
> 10. **Phase 11** — the teacher's idea backlog — is **largely built** (Waves 0–5; see
> [MORE_IDEAS.md](MORE_IDEAS.md)). The app now wears the **Rail & Stage** UI
> ([UX_FLOWS.md](UX_FLOWS.md)) and has had a project-wide review + remediation
> ([CHANGELOG.md](../CHANGELOG.md)). Pupil logins (Phase 8) and auto-marking (Phase 9) ship **off by
> default** behind DPIA gates. Beyond: the deferred idea-4 reviewer tail and the parked multi-teacher
> v2 — both gated on real-use proof.

## Sequencing principle

Build the **glanceable core that captures the record first** (timetable → Now → notes),
because that is the highest-value, most-used part and everything else (tasks, time, AI) builds
on the record it produces. AI comes *after* there is real data for it to use.

## Phase 0 — Skeleton (foundation)

**Goal:** a running, authenticated, backed-up empty app on the Debian server.

- Confirm stack (OPEN_QUESTIONS Q1) and scaffold `app/` per ARCHITECTURE.
- Docker Compose: Fastify + Postgres(+pgvector). Caddy in front. `.env` + session secret.
- Single-user auth, CSRF, base layout, Now route returning "nothing scheduled".
- `scripts/backup.sh` + tested restore + RUNBOOK stub.

**Done when:** you can log in over the LAN from desktop and laptop, and a nightly backup runs.

## Phase 1 — Timetable, Now & notes (the MVP)

**Goal:** the everyday core. This is the Minimum Viable Product.

- `period_definitions` seeded with the real day shapes (briefing Mon/Wed/Thu, after-school
  per day, fortnightly Wed). `term_dates`. ClockService + tests (single repeating week).
- `academic_years`; courses, groups, group_courses, staff, rooms; `timetabled_lessons` +
  multi-course slots; free periods, **clubs / open-room (break & lunch occupied)** and TA
  lessons all visible.
- Week/day timetable grid (UX_FLOWS §2) and **Lesson detail** (§3).
- `lesson_occurrences` (lazy) and **the notes system** (§5.4): fast capture, stopping point,
  follow-ups, autosave, "where we got to last time".
- **Now screen** (§1) wired to the clock: current/next lesson, resources placeholder, quick note.

**Done when:** on any school day you open the app and see/teach-from the right lesson and can
capture a note in seconds. *Most of the daily value lands here.*

## Phase 2 — Tasks, email intake & time

**Goal:** plan the day's work and capture what actually happened.

- Tasks: capture, inbox/triage, urgency, `due_rule` ("by next lesson with X") resolved by the
  clock; urgent/by-next-lesson on the Now screen.
- Email intake v1: **paste-an-email** box → draft task (ARCHITECTURE email option 2).
- Work blocks in real **work windows** (free periods + before/after school; **not** break/lunch);
  **planned vs. actual / "diverted"** path; AvailabilityService.
- Tasks gain **cognitive-load**, **context**, **sub-tasks** and **recurrence** (incl. per-lesson
  "assign to MS Teams").
- **Focus mode** — the single next action, broken into steps; **end-of-day wind-down**.
- **Events & deadlines** — parents' evenings, EHCP reviews, report deadlines with lead-time
  reminders and prep tasks.
- **Prep checklists** ("before the bell"), incl. recurring templates, on the Now screen.
- **Timers**: a lesson timer + auto-starting **task timers** that record actual time
  (interruptible); an estimate-vs-actual time report.
- **Captured info inbox** ("things I've been told"): fast capture, manual category to start,
  resurfaced via entity links.
- **Current-interest** marking; **exam dates** + a **parental-contact log** (events); a
  **start/end-of-day checklist**.
- Pupils + enrolments + `note_pupil_mentions` ("outstanding pupils"); tags. *(2.11 — **deferred**:
  picked up with the **pupil-facing resources project**, when individual names are first needed.)*
- **Write `docs/DPIA.md`** before real pupil names are entered. *(Deferred with 2.11.)*

**Done when:** emails/tasks land in one place, get planned into time, and reality is logged.

## Phase 3 — Schemes of work, lesson plans & resources

**Goal:** the planning content the daily view links to.

- Schemes of work → units → lesson plans (objectives/outline/duration), with versioning.
- **Hosted resource store** (`resources` + `resource_versions` + links): upload, view/download,
  version history, and **bulk-import** to consolidate scattered copies. One click from the lesson.
- Occurrence ↔ plan binding; per-course plans for split classes (`occurrence_courses`).
- "Lessons I oversee" prep view for TA lessons (§7): set plan + resources + oversight notes.

**Done when:** the Now screen's "Resources" and "Plan" are real and one click away, and TA
lessons are fully prepared in-app.

## Phase 4 — AI assistance

**Goal:** turn the accumulated record into planning leverage. Only now is there data worth it.

- The single LLM client wrapper: **Anthropic Claude** by default, pupil-name redaction,
  **safeguarding withholding**, `ai_calls` audit, provider swap.
- "Draft next lesson" from SoW position + recent notes; "Summarise this term".
- **"Redesign this unit"** / **author a new scheme from scratch** — especially the unfinished
  KS3 *"Effective use of computers in school"* scheme → new scheme version.
- **AI resource editing** (new versions) and **AI task breakdown** behind the focus mode.
- **AI estimate calibration** from timed history, and **AI auto-categorisation** of captured info.
- A learned, time-decaying **"current interest"** profile that biases what surfaces.
- (Optional) pgvector semantic search over notes/resources.

**Done when:** you can produce a usable next-lesson draft and a unit redesign from real notes,
with zero pupil names leaving the building.

*Status: ✅ built (4.1–4.5, 4.7, teaching-context, task-breakdown). Remaining: captured
auto-categorisation, estimate calibration, current-interest profile (4.6) and the optional
pgvector search (4.8).*

## Phase 5 — Curriculum delivery *(added 2026-06-10 — see [PHASE_5_PLAN.md](PHASE_5_PLAN.md))*

**Goal:** the app runs the curriculum, not just the day. A downloaded unit becomes a
SEND-adapted **master scheme**; each class adapts it as it is taught, with a per-class change
log; the record feeds back into next week's lesson and the master.

- Master + **per-group adaptations** with an append-only change log (5.1/5.2). ✅
- **Convert a downloaded unit** into adapted master lessons (AI), source files linked (5.3). ✅
- **Lay a unit into a class's weekly slot**, holiday-aware (5.4) — and both in one action with
  review on the map (5.7). ✅
- The **feedback loop**: adapt the next delivery from the class's notes; fold improvements back
  into the master on approval (5.5). ✅
- **Curriculum map** (`/map`) per class-slot with carry-over ("continue next week") (5.6, 5.9). ✅
- **Equipment inventory** (`/kit`) the teacher and every AI planning feature plan within (5.8). ✅
- Remaining (5.9): content-based conversion (read the actual files), cross-group compare,
  kit-per-lesson, CSV import / convert de-dup.

**Done when:** a whole unit can be filled and assigned for a class in one request, and each
class's delivery record visibly improves the next lesson. *(Reached for the headline flow.)*

## Phase 6 — Setup, September & new instances *(BUILT — see [PHASE_6_PLAN.md](PHASE_6_PLAN.md))*

*Status: ✅ built (migrations 0013–0017) — in-app setup editors incl. the timetable grid editor, the
September rollover wizard with the class predecessor chain, the new-instance onboarding wizard, and
calendar exceptions.*

**Goal:** the app becomes self-sufficient across time and teachers — no more seed scripts.

- **In-app setup editors**: terms, day shapes, rooms, staff, courses, groups & pupils, and a
  **timetable grid editor** (lesson times and details finally editable in the app).
- **The September rollover wizard**: a completely new timetable every year, with **class-group
  knowledge following the group** across its annual rename (predecessor chain; teaching contexts
  carried; history browsable; adaptations stay with their year — masters already absorbed them).
- **Onboarding wizard** for a brand-new instance (password → year → day shape → courses → groups →
  timetable), so **each teacher runs their own instance** (`new-instance.sh`, no data shared).
- Settings page (password change, AI cap/models), **calendar exceptions** (cover / room change /
  off-timetable), group-history and year-archive views, year export, MIS CSV import (stretch).

## Phase 7 — Polish & the "forgotten" extras *(was Phase 5, then 6 — renumbered as real phases landed)*

**Goal:** quality-of-life and the parked ideas worth keeping.

*Status 2026-06-12: email intake v2 ✅ (+ AI triage) and the TA login ✅ are built (below);
remaining items stay a pick-by-pain list alongside Phase 8.*

- Global search across everything; saved filters; keyboard shortcuts everywhere.
- **Deeper MS Teams integration** (beyond the per-class link / checklist) if worth it.
- ~~Email intake v2 (IMAP poll)~~ ✅ **built 2026-06-12** — in-app IMAP poller (Settings → Email intake), dedicated/forwarded-mailbox pattern, dependency-free client; the paste box remains as fallback.
- ~~A TA read/feedback login~~ ✅ **built 2026-06-12** — separate TA password (Settings), locked-down read-only current/next-lesson view with structured feedback that feeds the teacher's lesson page and the adapt-next-lesson AI; per-TA logins follow with the pupil-login project.
- Selected items from SPECIFICATION §8 (homework tracking, key dates, duty rota, print queue) —
  picked by what actually hurts in daily use.
- ~~User-supplied AI key~~ ✅ **built 2026-06-13** — the teacher can paste their own Anthropic key
  in **Settings → AI** (stored in the instance DB, like the mailbox password; `ANTHROPIC_API_KEY`
  in `.env` still wins where set). Test mode never reads the stored key, so the suites stay
  call-free.
- **Multi-provider LLM selection (future, if wanted): Anthropic / OpenAI / Gemini.** Scoped, not
  built. Recommended shape so it stays cheap and safe:
  - Keep `callLLM` / `callLLMStructured` ([app/src/llm/client.ts](../app/src/llm/client.ts)) as the
    single public wrapper — **the redaction / safeguarding-withholding / egress-assert / audit
    boundary is provider-agnostic and must stay above the provider call**, so adding providers
    never weakens "no pupil name reaches an AI service".
  - Add a thin **provider-adapter** layer behind it: `complete(req)` + `completeStructured(req,
    schema)` returning `{text|data, inputTokens, outputTokens}`, with an adapter per provider.
    Anthropic already exists; OpenAI uses `response_format: json_schema`, Gemini uses
    `responseSchema` — feed all three a JSON Schema produced once from the Zod schema (`z.toJSONSchema`).
  - Prefer **plain `fetch` over each provider's HTTPS JSON API** rather than adding the `openai` /
    `@google/generative-ai` packages — npm is unreachable on the school line, and this codebase
    already hand-rolls libraries for that reason.
  - Settings gain a **provider selector + per-provider key + per-provider model names** (the
    `modelFor(role)` mapping and the cost table become per-provider).
  - **Compliance, not just code:** each provider is a separate **data sub-processor**. Anthropic is
    the only one named in [DPIA.md](DPIA.md) §6; enabling OpenAI/Gemini means adding them there and
    confirming each one's no-training / data-processing terms. Decide *which* providers to enable
    before building the selector.
  - Rough size: **M** (≈1–2 days; build one provider at a time with a throwaway live smoke each).

## Phase 8 — Pupils: logins & in-app work *(BUILT 2026-06-13 — see [PHASE_8_PLAN.md](PHASE_8_PLAN.md))*

**Goal:** pupils log in and DO the work in the app — the long-deferred pupil-facing project
(2.11). Interactive worksheets **sliced to each pupil's assigned level** (🟢🟡🔴, set per course
from the review grid), answers stored per pupil, live completion for the teacher, a tap-the-faces
**pupil feedback widget** (rating + enjoyed/disliked activity chips), per-TA accounts — and both
the answers and the feedback feeding the adapt-next-lesson loop and, over time, the class
teaching-context — behind a deny-by-default pupil role.

*Status 2026-06-13: 8.1–8.7 built and tested (migration 0018; 198 unit / 113 integration green).
**Pupil access is OFF by default** — the Settings master switch that enables it requires the
teacher to confirm DPO/SLT DPIA sign-off, so 8.0 (the external gate) still governs real use. 8.8
became [Phase 9](PHASE_9_PLAN.md).*

## Phase 9 — Auto-marking & the results loop *(BUILT 2026-06-13 — see [PHASE_9_PLAN.md](PHASE_9_PLAN.md))*

*Status 2026-06-13: 9.1–9.8 built and tested (migration 0022; 232 unit / 141 integration green).
**Auto-marking is OFF by default** — the `pupil_marks_enabled` master switch requires confirming
the DPIA-addendum sign-off (and pupil access already on), so 9.0 still governs real use. 9.9
(retrieval-practice starters) remains a stretch.*

**Goal:** the answers Phase 8 collects mark themselves, and the results flow back out — to
pupils, kindly, and into planning, precisely. **Mark schemes as data** beside every generated
worksheet; **deterministic marking** for objective fields; **AI-suggested marks** for open
answers (batched per question with *no pupil identity attached*, evidence-quoted,
safety-gated) that the teacher confirms, comments on and **releases** before a pupil sees
big-friendly ✓/✗ and a "try this" line. Marks make the adapt loop question-precise
(success rates, misconceptions), print as a class answer pack, build per-pupil
**"what works for me" profiles**, and (stretch) seed retrieval-practice starters. Plus
**stay-signed-in on classroom computers** (revocable device cookie — Windows login becomes app
login). Absorbs the old 8.8 stretch list; design mines the sibling `exam_questions` project's
marking architecture. Gated on a **DPIA addendum** (attainment storage, anonymous answer text
to the AI, the device credential).

## Phase 10 — Trustworthy in daily use *(BUILT — see [PHASE_10_PLAN.md](PHASE_10_PLAN.md))*

*Status 2026-06-15: ✅ built (migrations 0024–0027). Encrypted nightly backups + a monthly
restore-drill, pupil erasure/anonymisation with a disposal audit, a teacher idle-logout, the in-app
AI-call audit viewer, a safeguarding disclosure register, a reboot-durable open-marking queue, SEND
accessibility options and global search. Single-teacher only — no multi-teacher work.*

**Goal:** Phases 8–9 put real children's PII and pupil-authored answers into the system; Phase 10
pays the bill that created. **Make the privacy/safeguarding promises real** — the DPIA currently
describes controls the code doesn't have: encrypted backups (today's `backup.sh` is plain
gzip/tar), a pupil **erasure / SAR** path (a naive delete throws on the Phase-2 RESTRICT FKs), a
**teacher idle-logout** (only pupils idle-out today), a **disclosure register** (a safeguarding
disclosure in an answer currently wears the same ⚠ badge as a benign mark flag), and an in-app
**AI audit-log viewer** (the DPIA's central evidence control surfaces only as a count). **Stop
losing work** — pupil and teacher autosave both fail silently, and the open-marking queue is an
in-memory timer a reboot drops. **SEND accessibility** the pupil surface lacks — read-aloud,
text-size / dyslexia / high-contrast options, progress, calmer states. **Close the loop** the
marking data enables — retrieval-practice starters (the 9.9 stretch) and the *standing* per-class
feedback digest (only the per-lesson half shipped). Then **daily-driver polish** — global search,
capture-from-anywhere, keyboard shortcuts, print packs — and **September setup** — MIS CSV import.
A menu sequenced by pain, not an all-or-nothing gate; Track A ships first.

## Phase 11 — The teacher's idea backlog *(LARGELY BUILT — see [MORE_IDEAS.md](MORE_IDEAS.md))*

*Status 2026-06-15: Waves 0–5 built and tested (migrations 0028–0036).* Standing style/feature prefs,
a **teaching-concepts** library and **guided cohort-access** prompts (all on the `context[]` seam), a
**spec-point coverage** backbone + uploaded **official course documents**, **per-feature model
choice**, and an opt-in **advisory AI lesson reviewer** (off by default) — plus the **Rail & Stage**
navigation redesign (see [UX_FLOWS.md](UX_FLOWS.md)). The richer **idea-4 reviewer tail** (random
spot-check + scheme-level review + finding re-injection) is **deferred** until adoption data shows the
idea-8 findings actually get applied (`lesson_reviews.status`), since its Opus spend is the project's
named #1 cost risk.

## Phase 12 — Zero-friction pupils + content-rich, exam-ready worksheets *(IN PROGRESS — see [PHASE_12_PLAN.md](PHASE_12_PLAN.md))*

*Status 2026-06-17: building.* Completes the post-Phase-11 "What's next" backlog with **pupil
presentation/usability as the overriding priority**, plus two teacher requirements: worksheets must
**build on all of a lesson's prepared materials**, and **OCR GCSE (J277) exam question types** appear
**more frequently the closer a cohort is to its exams**. **Migration-free**; the AI boundary is unchanged.

- **Pupil usability (A):** ✅ consistent + live save confirmation on every field type, a narrow-screen
  Slides/Worksheet toggle, per-question 🔊 read-aloud; remaining: first-run micro-tour + calmer loading,
  a presentation pass, and a usability-tuned generation prompt.
- **Content-rich worksheets (B, complete):** the `docText` extractor now feeds generation, so the
  worksheet and slides build on the lesson's own uploaded materials (with a default-on consent toggle),
  unit conversion is content-based, OCR exam-style questions are weighted by proximity to GCSE, and the
  marker handles numeric/hex/levels-of-response with trace/truth tables as a compact grid.
- **Remaining:** the Phase-5.9 curriculum stretch (kit-per-lesson, cross-group compare), the Phase-4 tail
  (estimate calibration, current-interest profile, optional pgvector search) and the deferred,
  cost-gated Phase-11 Opus reviewer tail.

## Future (unnumbered) — Multi-teacher school server *(parked — see [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md))*

**Deliberately unnumbered and not scheduled.** A v2 architecture: one shared school server, many
teacher accounts, each pupil with a single school-wide account, and (opt-in) cross-subject signal
to inform planning. It is a rearchitecture of auth + ownership + per-route authorization (roughly
half the codebase), so it **will not be touched until the single-teacher tool is proven in real
use** and a **fresh whole-school DPIA** (whole-school pupil data + cross-subject profiling) is
signed. Recorded now only so single-teacher work doesn't foreclose it. The AI boundary is
preserved and extended to a school-wide redaction roster — names still never reach an AI service.

## What MVP deliberately excludes

Phase 1 has **no** tasks, AI, pupils-as-data, or full lesson-plan authoring. That is on
purpose: prove the daily timetable-and-notes loop first; everything else is additive and
sequenced by real need.

## Rough order-of-magnitude

These are relative sizes, not promises (one developer, evenings):

| Phase | Relative size | Unlocks |
| --- | --- | --- |
| 0 Skeleton | S | A deployable, safe base |
| 1 Timetable + Now + Notes | L | **The daily MVP** |
| 2 Tasks + Time + Focus + Events | L | Plan the day, one-thing-now, never miss a deadline |
| 3 SoW + Hosted resources | M | Single source of truth on the Now screen |
| 4 AI | M | Planning leverage from the record |
| 5 Curriculum delivery | L | The app runs the curriculum (master → class → calendar → feedback) |
| 6 Setup + September + instances | L | Self-sufficient across years and teachers |
| 7 Polish + extras | ongoing | Long-tail quality of life |
| 8 Pupil logins + in-app work | L | Answers become data; less marking; the loop closes |
| 9 Auto-marking + results loop | L | Marks without transcribing; results back to pupils; question-precise planning |
| 10 Trustworthy in daily use | L | Privacy/safeguarding promises enforced; durable work; SEND a11y |
| 11 Idea backlog (Waves 0–5) | L | Coverage, course docs, per-feature models, the AI reviewer, Rail & Stage |
