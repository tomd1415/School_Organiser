# Future waves — beyond Phase 11 (Wave 6+)

> **Status (2026-06-19): proposals — Wave 7.1 (morning brief) shipped, the rest proposed.** Phase 11's Waves 0–5 are complete ([MORE_IDEAS.md](MORE_IDEAS.md));
> the numbered Phase plans (12 worksheets, 13 planner, 14 hardening) run on a parallel track. This is
> the next idea backlog — strategic feature directions grounded in what the app now holds and two fresh
> unlocks. Near-term operational follow-ups live in [NEXT_STEPS.md](NEXT_STEPS.md).

Two unlocks make these cheap now:

1. **The exception engine** (shipped this session) — dated free/cover are first-class and now feed
   availability. An absence/cover workflow is a short hop from here.
2. **An in-process scheduler already exists** — `server.ts` runs idempotent daily recurring-task
   generation (`scheduleRecurring`) and a periodic email poll (`scheduleEmailPoll`). The 2026-06-14
   *"no in-app scheduler exists"* block (MORE_IDEAS §5) is gone; scheduled sweeps/digests just register
   another idempotent job on that proven pattern.

Format follows [MORE_IDEAS.md](MORE_IDEAS.md): effort **S/M/L**; priority **🔴 high / 🟠 medium / 🟡 nice**.
Everything here is **proposed** (nothing built). Every AI touch goes through the one wrapper
(`app/src/llm/client.ts`) — redaction, safeguarding-withholding and audit for free — and degrades to a
no-op when AI is off.

## Wave 6 — Absence & cover *(extends this session's exception engine)*

| # | What | Why | Effort | Pri |
|---|---|---|---|---|
| 6.1 | **Cover-pack generator** — when you mark a date off-timetable / yourself absent, generate self-contained cover work per affected class from its planned lesson (objectives + a standalone task + answers for the cover teacher) into the resource store; printable. New `cover_pack` AI feature, cohort-only (no pupil names) | Setting cover when you're out is high-friction, and the app already holds the planned lesson + the cover concept; reuses `draft_lesson`/`generate_resource` + the resource store | M | 🟠 |
| 6.2 | **Recurring exceptions** — a standing weekly duty / fortnightly meeting as a recurring lesson exception (reuse `recurrence` + the daily `scheduleRecurring` job to materialise dated rows), folding into availability automatically | Standing commitments are re-entered by hand each week; the recurrence engine and the scheduler already exist | S | 🟠 |
| 6.3 | **Cover ledger + Now actions** — a cover owed/given tally from `cover` exceptions (AI-free), plus one-tap "you're on cover — open the cover note / start a work block" on the Now strip you already annotate | Closes the loop on the cover data you now capture; a pure query + a Now affordance | S | 🟡 |

*Reuses:* the exception store, `recurrence`, `scheduleRecurring`, the resource store + propose-then-apply, the Now strip.

## Wave 7 — Quiet automation *(the scheduler is already there — register jobs on it)*

| # | What | Why | Effort | Pri |
|---|---|---|---|---|
| 7.1 ✅ | **Morning brief** *(v1 built 2026-06-19)* — a scheduled, deterministic digest on Now: coverage at risk before an exam date, next school day's teaching load, marking waiting. *(Deferred: tomorrow's lessons lacking a bound plan, the optional AI summary.)* | Pulls the scattered "needs me" signals into one glance *ahead*; every input already exists (`schemeCoverage`, marking backlog, tasks) | M | 🟠 |
| 7.2 | **Scheduled reviewer sweep** — the parked nightly review: off-by-default behind `ai_review_enabled`, cost-capped, writing advisory `lesson_reviews` findings on next-to-teach lessons, surfaced as a morning heads-up | Was parked *only* for "no scheduler" — now solved. The manual reviewer already ships; this just schedules it | M | 🟡 |
| 7.3 | **Spaced-retrieval scheduler** — auto-build a "do now" from coverage on a spacing curve (recall ~2-week-old + ~6-week-old points) via `retrieval_starter`, ready on the lesson each morning | Retrieval starters exist but are manual/one-off; spacing is where the learning gain is, and coverage supplies the source points | M | 🟡 |

*Reuses:* `scheduleRecurring`'s idempotent daily-job pattern, `lesson_reviews`, `retrieval_starter`, `schemeCoverage`, the monthly £-cap.

## Wave 8 — Insight from the record *(turn held data into judgement)*

| # | What | Why | Effort | Pri |
|---|---|---|---|---|
| 8.1 | **Class risk board** — one page: per class, coverage % vs weeks-to-exam, pace band, marking backlog, last-taught; sorted so classes behind near an exam float up. AI-free | The data (coverage, pace, `exam_date`, marks) exists but never composes into "where's the risk"; deterministic and high-trust | M | 🟠 |
| 8.2 | **Where-my-time-goes** — a weekly rollup over `work_blocks` (planned vs actual) + time entries: marking vs planning vs admin, which evenings | The work-log is captured but never summarised back; a pure query, no AI | S | 🟡 |
| 8.3 | **Parents'-evening / term-review prep** — a per-pupil talking-points draft from held data (marks trend, work done, retrieval, your notes), editable, never auto-sent. **Needs a privacy design pass**: per-pupil data redacted to tokens through the one wrapper (as the report-gen sibling does), off-by-default, DPIA-gated | Parents' evening + reports are a huge time sink and the app holds the raw material — but per-pupil AI is the strictest privacy case, so design before build | L | 🟡 |

*Reuses:* `schemeCoverage`, `pacing`, marking backlog, `work_blocks`, and (8.3) the wrapper's redaction.

## Wave 9 — Pupil-facing depth *(extend Phases 8–9)*

| # | What | Why | Effort | Pri |
|---|---|---|---|---|
| 9.1 | **Homework as data** — assign a worksheet as homework with a due date (reuse pupilWork + tasks + the `before_next_lesson` due rule); auto-marks on submit via the existing marker | Closes the loop from in-class work to "set + chase + mark homework" with the pieces already built | M | 🟠 |
| 9.2 | **Pupil progress view** — a pupil-facing "what I've done / what's next / retrieval streak" over marks + work | Motivation + agency for pupils; read-only over data already held | S | 🟡 |
| 9.3 | **More worksheet block types** — code-trace, label-the-diagram (hotspot), order-the-steps blocks for the OCR computing content | Richer interactive work on the existing worksheet-block schema (Phase 12's thread) | M | 🟡 |

*Reuses:* pupilWork, the worksheet-block schema, tasks + due rules, the deterministic/AI marker.

## Recommended first slice

Continue the **cover thread** while it's warm: **6.2 (recurring exceptions, S)** then **6.1 (cover-pack,
M)** — both ride the exception engine just built and deliver concrete "I'm out next Tuesday" value. In
parallel, **7.1 (morning brief)** is the strategic enabler: it proves the "register a job on
`scheduleRecurring`" pattern that 7.2/7.3 reuse, and pays off daily from data already held. Defer **8.3**
until its privacy design is signed off, and keep the reviewer family (7.2 + the parked idea-4
re-injection) cost-gated and last.

## Still parked (unchanged from [MORE_IDEAS.md](MORE_IDEAS.md) §5)

- Anything **multi-teacher** (per-staff RBAC / preferences) → [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md).
- **pgvector embeddings** over course docs — lexical retrieval first; revisit only if it surfaces junk.
- **Reviewer-finding re-injection** into the cheap models — until the base reviewer is proven.
- **Outbound email** (e.g. for a mailed morning brief) — the app *ingests* email; sending is a new egress
  surface to design deliberately, so 7.1 is **in-app only** for now.

---

## Sub-plan — 7.1 Morning brief *(built 2026-06-19)*

The beachhead: prove the "register a daily job" pattern (the three existing `schedule*` jobs in
`server.ts`) and surface a forward-looking digest. Deterministic, AI-free, degrades to nothing when
there's no data.

1. **Pure core** — `services/brief.ts` (no DB, unit-tested): `coverageRisk(coveredPct, weeksToExam)`
   (banded: ≤6 wk & <90% → high; ≤16 wk & <60% → medium; else none — won't over-flag) and
   `buildBrief(input)` → ranked `BriefItem[]` (coverage risks first, then a "tomorrow you teach N"
   line, then "marking waiting for N classes").
2. **Repo** — `repos/brief.ts` `coverageAtRisk()`: one query → per exam scheme `{courseName, examDate,
   covered, total}` (mirrors `schemeCoverage`'s EXISTS; only courses with an `exam_date`). Empty until
   `/coverage` has spec points — so the feature is dormant infrastructure that lights up with data.
3. **Surface** — a compact **Morning brief** card on Now (right column), rendered on demand (always
   fresh), shown only when it has something to say.
4. **Schedule** — `scheduleMorningBrief(server.ts)` daily (+ boot), computing the brief and logging a
   one-line summary — the heartbeat + the seam 7.2/7.3 hook scheduled AI work onto.
5. **Tests** — unit (`coverageRisk` bands + `buildBrief` assembly); integration (Now renders the card).

Deferred to fast-follows: "tomorrow's lessons lacking a bound plan" (needs the delivery plan-for-date
map), the optional AI one-line summary, and a persisted `daily_brief` store (the 7.2 attach-point).
