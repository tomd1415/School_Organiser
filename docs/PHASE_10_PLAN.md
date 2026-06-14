# Phase 10 — Trustworthy in daily use: safety, reliability & access

> **Status (2026-06-14): BUILDING — Tracks A (10.1–10.6), B (10.8–10.10), C (10.11–10.14), D
> (10.15–10.17) and E (10.19–10.25) all done and tested (243 unit / 165 integration green; typecheck
> clean; migrations `0024`–`0027`). Remaining: only Track F (setup/scale — MIS import, onboarding /
> rollover extras, health depth + tech-debt) and the 10.25 planning-coverage strip (split out — needs
> forward timetable projection).** The original plan follows.
>
> **Status (2026-06-13): PLANNED, plan-first — for review before any code.**
> Phases 8–9 put **real children's PII and pupil-authored answers** into the system (logins, PINs,
> worksheet answers, marks, profiles). Phase 10 pays the bill that created: it **makes the
> privacy/safeguarding promises real** (several controls the DPIA *describes* don't yet exist in
> code), **stops silently losing work** (the new autosave/marking paths have data-loss windows),
> and **makes the pupil surface actually usable by SEND learners** (read-aloud, display options,
> progress, calmer states). With the loop's data then trustworthy, it **closes the feedback loop**
> (retrieval starters, standing digest) and pays down **daily-driver friction** (search, capture,
> print) and **September setup friction** (MIS import).
>
> **This is a menu with a recommended order, not an all-or-nothing gate.** Track A (and 10.8/10.9
> in Track B) are the *ship-blockers before real pupil data accumulates at scale*; the rest is
> sequenced by daily pain. **No multi-teacher work** — cross-subject profiles and per-teacher RBAC
> stay parked in [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md) until single-teacher
> mode has had real classroom testing.

This plan is grounded in a nine-lens survey of the built system (deferred-item comb of every prior
plan + CHANGELOG, roadmap-vs-spec, a code-surface scan, an ops/security audit, the teacher daily
workflow, and the SEND pupil/accessibility surface), plus a three-persona critique (a daily-driver
teacher, the safeguarding/DP lead, a completeness critic). Where a slice closes a **gap between the
docs and the code**, that is called out — those are correctness fixes to our own compliance story,
not just features.

---

## 0. What Phase 10 changes

- **The DPIA stops overstating the code.** Today the docs claim encrypted backups, a session
  timeout, and a pupil-erasure path — none of which exist as described. Phase 10 builds them, so
  the stated mitigations are true.
- **Disclosures get their own lane.** A safeguarding disclosure typed into a worksheet answer is
  currently stored as a mark wearing the *same* amber "⚠ needs your eyes" badge as a benign
  low-confidence AI mark. Phase 10 separates disclosures, gathers every flagged item (answers,
  captured notes, TA feedback, email) into one **register**, and records what was done about each.
- **Typed work survives.** Pupil autosave and teacher-note autosave both fail *silently* today
  (idle-logout returns a redirect HTMX can't follow; a failed POST shows nothing). The debounced
  open-marking pass is an in-memory timer a reboot drops — contradicting the "survives a reboot"
  NFR. Phase 10 surfaces every failed save and makes the marking queue durable.
- **The pupil surface fits SEND learners.** Read-aloud (no network, no AI), text-size /
  dyslexia-friendly / high-contrast options, `prefers-reduced-motion`, an encouraging "3 of 6 done"
  progress indicator, and bigger tap targets — none of which exist on a surface built *for* SEND
  pupils.
- **The loop finally closes.** The marking data exists but never flows back: retrieval-practice
  starters ("open with 3 questions this class got wrong"), a *standing* per-class feedback digest
  (only the per-lesson half shipped), and AI auto-filing of captured items.
- **The command centre gets a front door.** Global search, one-tap capture-from-anywhere, keyboard
  shortcuts, and print packs — the Spec-Must / Phase-7 polish that was deferred.

What deliberately does **not** change: the AI boundary (one wrapper; names never leave;
safeguarding content withheld), AI as suggestion-maker with the teacher as decision-maker,
LAN-only, single-teacher, graceful degradation when AI is off.

---

## 1. Build order

Each slice is an independently shippable, reviewable commit. **Size**: S ≈ ½ day, M ≈ 1–2 days,
L ≈ 3+ days. **Priority**: 🔴 ship-blocker (do before pupil data scales), 🟠 high daily value,
🟡 worthwhile, ⚪ stretch. All ⬜ not started.

### Track A — Make the privacy/safeguarding promises real *(the DPIA currently overstates the code)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **10.1** | **Encrypt backups + verify restores** — `age`/`gpg` over the `pg_dump` *and* the resources tar in `backup.sh`/`restore.sh`; a `verify-backup.sh` that restores into a throwaway DB and asserts row counts; a "Disaster recovery" RUNBOOK section; "last backup / last verified" on the Data-health panel | `backup.sh` is plain `gzip`+`tar` but `DPIA.md`/`SECURITY_AND_PRIVACY.md` claim "encrypted nightly pg_dump" — the dumps hold every name, answer, mark **and** the IMAP/AI secrets in plaintext | M | 🔴 | ✅ |
| **10.2** | **Pupil erasure / leaver anonymisation (audited) + per-pupil SAR export** — a guarded, transactional "erase pupil" that nulls/reassigns the **RESTRICT** refs then lets the **CASCADE** tables clear, anonymises the roster row (keep `ai_token` so redaction history holds), writes a disposal audit row; plus `/pupils/:id/export` gathering one child's full record | `DATA_MODEL.md`/`DPIA §7` promise "a deliberate, audited retention action" — but only archive exists, and a naive `DELETE` *throws* on the `0003` RESTRICT FKs (enrolments/notes/tasks/events). The SAR claim is aspirational for pupil-authored data | L | 🔴 | ✅ |
| **10.3** | **Teacher idle-logout** — extend the `onRequest` idle plumbing (currently `role==='pupil'` only) to the teacher role; configurable minutes in Settings | `SECURITY` threat model + `DPIA R3` claim session-timeout mitigates the unattended-laptop risk; in code the teacher session is 12h absolute with **no** idle timeout — the account that sees the most PII | S | 🔴 | ✅ |
| **10.4** | **Safeguarding disclosure lane + register** — tag guard-matched answers distinctly (not the generic `needsReview`); one teacher-only **register** UNIONing flagged answers + captured items + TA feedback + email, each with verbatim text, source, timestamp and an audited "recorded / actioned / referred to DSL on `<date>`" state | A disclosure ("not safe", "hurt myself") wears the *same* ⚠ badge as a benign clipped mark and can be lost in the noise; there is no record-of-handling anywhere | M | 🔴 | ✅ |
| **10.5** | **Email-triage pre-egress screen** — run `guardMatch` over subject+body *before* the AI call; a trip files a safeguarding-flagged captured item with **no** AI call (reuse the "AI unavailable → plain task" path); optional settings list of non-roster names to redact | Triage currently sends the **full email body** to the AI to *decide* if it's safeguarding — disclosure reaches the model before withholding can fire; and the redactor is roster-only, so a sibling/other-class child named in an email is never tokenised | M | 🔴 | ✅ |
| **10.6** | **In-app AI audit-log viewer + live spend** — `/settings/ai-log`: paginated `ai_calls` (date/feature/model/status/tokens/cost), expandable redacted request/response, filters, per-feature + per-day spend roll-up, CSV/JSON for the DPO; show "£X of £Y this month (Z%)" with an amber near-cap state | `ai_calls` is the DPIA's central evidence control, yet surfaces only as a monthly *count* — a teacher can't show a DPO the control or see spend before the cap silently blocks them mid-lesson | M | 🟠 | ✅ |
| **10.7** | **Retention sweep + editable guard patterns + lost-device kill** — a configurable, audited sweep (off until the DPO sets a period) that purges old answers/marks/feedback and **nulls the content tail** of old `ai_calls` (keeping the proof columns); move `GUARD_PATTERNS` to a teacher-editable settings list (never below the safe defaults); a one-click "a device was lost → revoke all remembered devices" (+ per-class) | minimisation is process-only today (nothing enforces retention); the safeguarding lead can't tune detection to local/EAL phrasing; a lost class laptop must be revoked pupil-by-pupil | M | 🟡 | ⬜ |

### Track B — Stop losing work *(Phase 8/9 opened silent data-loss windows)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **10.8** | **Resilient autosave (pupil + teacher)** — pupil: idle/kill branch returns an **HX-Redirect** (HTMX can't follow a bare 302 on a background POST), a failed `/me/answer` surfaces a calm "not saved — your work is still on screen, tell your teacher" near the field, and a `beforeunload` guard while a field is dirty; teacher: actually populate the `note-status` span ("saving…/saved ✓/NOT saved — copy your text") and add global `htmx:responseError`/`sendError` handlers that keep the typed text | both autosaves fail invisibly today; the NFR calls notes "irreplaceable", and anxious SEND pupils silently losing typed work is the worst failure mode | M | 🔴 | ✅ |
| **10.9** | **Durable open-marking queue** — persist pending open-mark jobs (`occurrence_course` + `due_at`) to a small table; a boot-time sweep runs any that came due while the process was down; the debounce becomes a DB-backed claim (idempotent — `markOpen` only marks unmarked answers) | the "mark as pupils finish" pass is an in-memory `setTimeout` Map with `unref()` — a reboot/`./start.sh`/crash during a live lesson silently drops every pending mark, contradicting "survives a server reboot" | M | 🟠 | ✅ |
| **10.10** | **Optimistic-concurrency guard on irreplaceable text** — send the loaded `updated_at` with the autosave; `UPDATE … WHERE id=$1 AND updated_at=$expected`; 0 rows → 409 surfaced as "edited elsewhere — your text is kept, reload to merge" | every note/task/scheme autosave is a blind last-write-wins UPDATE; single-teacher ≠ single-session (phone capture + desktop + tabs-open-all-day), so a stale tab clobbers newer edits | S | 🟡 | ✅ |

### Track C — SEND accessibility on the pupil surface *(core to the app's purpose, currently absent)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **10.11** | **Read-aloud (text-to-speech)** — a small script loaded *only* in `pupilLayout` using the browser Web Speech API; a speaker button beside each question/prompt/checklist item and on the released feedback line; per-pupil on/off + rate in `localStorage` | the surface has no read-aloud at all; SEND/low-literacy pupils must decode every question and their feedback unaided. **No network, no AI, nothing leaves the page** | M | 🟠 | ✅ |
| **10.12** | **Pupil display preferences** — an accessibility toolbar on `/me` and the login: A/A+/A++ text scale, a dyslexia-friendly toggle (line-height + letter-spacing + a self-hosted OpenDyslexic/Atkinson face), a high-contrast theme, and a reduced-motion switch; persisted in `localStorage`, applied as a `data-*` attribute + CSS-var overrides (no markup churn) | a single fixed `:root` theme, one `system-ui` font, fixed `1.05rem` inputs — a pupil who needs bigger text or a dyslexia face has no way to get it | M | 🟠 | ✅ |
| **10.13** | **Progress, motion & touch** — an encouraging "You've answered 3 of 6 — keep going!" chip/bar (OOB-updated on each autosave, computed from the slice's `fields`); a `@media (prefers-reduced-motion)` block over the four current animations; bigger checkbox hit-areas (≥44px, whole-row tappable) and a clear `:focus-visible` ring; calmer scaffolded empty/no-lesson/error states | progress lives only on the teacher grid; animations have no reduced-motion guard; worksheet checkboxes are 1.3rem with no focus ring — all harder for imprecise motor control and attention/vestibular needs | M | 🟠 | ✅ |
| **10.14** | *(stretch)* **Input alternatives** — word banks / tap-to-answer multiple-choice as a per-field worksheet option; a **picture/avatar PIN** option for pre-literacy and EAL pupils | reduces the typing/literacy barrier for the pupils least able to type answers; larger change to the worksheet renderer + login | L | ⚪ | ✅ |

### Track D — Close the feedback loop *(the data exists; the loop doesn't close)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **10.15** | **Retrieval-practice starters (the Phase 9.9 stretch)** — query a class's recently low-success questions (already computed for the adapt summary, anonymous) and (a) pass them into the draft/adapt prompt context, and (b) a lesson-page "open with 3 questions this class got wrong" generator | Phase 9 stores per-question marks + misconceptions but `draftLesson`/`adaptLesson` prompts have no "got wrong recently" input; the loop never closes into spaced retrieval | M | 🟠 | ✅ |
| **10.16** | **Standing per-class feedback digest** — aggregate a class's feedback *across all its lessons* (ratings spread, enjoyed/disliked chips, by level) into a standing digest, offered as a one-click append/update to the per-class teaching-context every planning call already reads | Phase 8 promised feedback shapes lessons *two* ways; only the per-lesson half shipped — the over-time "consistently loves practical, rates long typing lowest" digest is missing | M | 🟠 | ✅ |
| **10.17** | **Captured-item AI auto-categorise** — a cheap structured call on capture suggesting category + resurface date + the safeguarding flag (teacher confirms; once flagged, withheld forever); mirror the existing `email_triage` classifier | `captured.ts` still has zero AI; Spec 5.17 (M) promised auto-filing. The `email_triage` pattern proves the shape works | S | 🟡 | ✅ |
| **10.18** | *(stretch)* **Estimate calibration + time report** — a `/time` weekly roll-up of work-block actuals + per-task-type estimate-vs-actual (pure SQL); optional AI duration suggestion (durations+tags only, no names) | `estimate_min`/`actual_seconds` are captured but never fed back; Spec 5.16/5.6 promised the report and calibration | M | ⚪ | ⬜ |

### Track E — Daily-driver friction *(Phase 7 polish + Spec Musts)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **10.19** | **Global search / jump-to** — a `/search` route + top-bar box (focus with `/`) running ILIKE/FTS across notes, tasks, captured, events, lesson plans, resources and group/course names, returning grouped deep links | Spec 5.11 is a **Must** ("one search box that finds lessons, notes, tasks, resources, pupils"); there is no search anywhere — you must know which of 17 pages a thing lives on. Pupil results are local-only, never sent to AI | M | 🟠 | ✅ |
| **10.20** | **Capture-from-anywhere + in-the-moment prep** — a persistent "+ capture" control in the topbar (writes straight to the captured store via the 10.17 path) on every authed page; `POST` routes to **add** a one-off "before the bell" prep item / day-checklist item inline from the lesson and Now screens | Spec 5.17 (M) "frictionless capture" / 5.4 (C) "single keystroke from anywhere" — today capture needs a trip to `/captured`, and prep items are toggle-only (can't add "print 8 worksheets for Y10" against a lesson) | M | 🟠 | ✅ |
| **10.21** | **Keyboard shortcuts + command palette** — extend `app.js` (only `n`=new-note today) with `g n/t/f/k` jumps, `?` cheat-sheet, `/` to focus search, and a `Ctrl/⌘-K` palette listing classes-today + nav targets | the stated principle is "keyboard-fast, nothing requires the mouse"; for a tool opened in short bursts all day this is a daily multiplier | S | 🟡 | ✅ |
| **10.22** | **Live class monitor + marking backlog** — an opt-in signature-guarded poll on the `#pw-{oc}` grid (the pattern Now/Focus already use) so completion/saved/done/marks refresh during the lesson; a "Marks waiting" card on Now/Focus (suggested / needs-review / confirmed-but-unreleased counts, deep-linked), gated off when auto-marking is off | the grid loads once and goes stale the moment the teacher walks away; unconfirmed AI marks pile up across classes with no daily surfacing | M | 🟡 | ✅ |
| **10.23** | **Print packs** — `/lesson/:id/print` (effective plan + resources + last stopping-point), `/today/print` (all of today's own + overseen lessons as a cover/briefing sheet), and a "Cover for `<date>`" pack reusing the TA effective-plan view + print CSS | the teacher can print pupil cards and answer packs but **not their own lesson** or a cover sheet to hand a cover teacher; cover-setting is an unbuilt same-morning need | M | 🟡 | ✅ |
| **10.24** | **Per-pupil page (progress + notes)** — one pupil's running notes (reuse the **existing** `notes.pupil_id` FK), their marks history (from `pupilLessonResults`), and a one-tap per-unit traffic-light signal (on-track/behind/exceeding); teacher-only, never AI-fed as an individual | Spec 5.7 (S/C) is unbuilt — the Pupils page is login-only, marking is per-lesson, and there is nowhere to see one pupil's trajectory or jot a standing note | M | 🟡 | ✅ |
| **10.25** | **Activity countdown + planning-coverage** — a set-N-minutes starter/activity countdown on the lesson page (castable big on the deck view); a coverage strip listing the next N school-day occurrences (own + overseen) with **no plan bound**, one click to bind | Spec 5.16 marks the activity timer a **Must**; unbound lessons (esp. TA-overseen) are only discovered when opened, often too late | S | 🟡 | ✅ |

### Track F — Setup, scale & tech-debt

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **10.26** | **MIS CSV import** — a dependency-free CSV importer for pupils + group membership matching SIMS/Arbor export shapes, mapping to `pupils`/`enrolments`, auto-generating `ai_tokens`, idempotent by an external id or name match | hand-entry is the single biggest setup friction, acutely at September rollover; named a stretch in Phase 6 + ROADMAP, never built | M | 🟠 | ⬜ |
| **10.27** | **Onboarding & rollover extras + scheme share** — day-shape templates ("5 lessons + form"), a starter-kit list, an optional sample-data mode; the deferred rollover options (carry-adaptations tick, recurring-pattern copy, one-click next-year chain); file-based **export-one-scheme / import-a-scheme** JSON (no cross-instance traffic) | reduce first-run and year-turn friction; let a colleague share a scheme by file without any network path | M | 🟡 | ⬜ |
| **10.28** | **Tech-debt paydown** — move the remaining raw SQL out of route handlers into repos (the layering rule); cache worksheet meta across a pupil's autosaves; a confirm step on un-release; a daily cap on roster-name enumeration; extend `/health` + the Data-health panel with backup-age / disk / email-poll status (and fix the hardcoded `phase:0`) | the noted lower-severity items from the 2026-06-13 review, plus the operator has no glanceable "is everything fine" signal | M | 🟡 | ⬜ |

**Recommended order.** Land **Track A** and **10.8 / 10.9** first — they close live compliance gaps
and data-loss windows that get worse the more real pupil data accumulates. Then **Track C**
(accessibility) since the pupil surface is in daily SEND use, then **Track D/E** by whatever bites
most in the term, with **10.26** timed for the August/September run-up.

---

## 2. Data model — migration `0024`+ (next free number; `0023` was the Phase-9 `mark_scheme_fk` fix)

Most of Phase 10 needs **no schema** (display prefs → `localStorage`; guard patterns, retention
period and idle minutes → `settings` rows; per-pupil notes reuse the existing `notes.pupil_id`;
optimistic locking reuses existing `updated_at`; the audit viewer/SAR/erasure read existing tables).
The genuinely new tables:

```
marking_queue                 -- 10.9: durable "mark as pupils finish" jobs
  occurrence_course_id BIGINT PRIMARY KEY REFERENCES occurrence_courses(id) ON DELETE CASCADE
  due_at               TIMESTAMPTZ NOT NULL        -- when the debounce fires
  claimed_at           TIMESTAMPTZ                 -- a worker/boot-sweep claim (null = pending)
  -- boot sweep: run rows with due_at <= now() and claimed_at IS NULL; markOpen is idempotent

safeguarding_review           -- 10.4: record-of-handling over flagged items (no new capture path)
  id          BIGSERIAL PK
  source_type TEXT NOT NULL CHECK (source_type IN ('answer','note','ta_feedback','email','captured'))
  source_id   BIGINT NOT NULL                      -- the flagged row's id in its own table
  noted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  status      TEXT NOT NULL CHECK (status IN ('new','recorded','actioned','referred')) DEFAULT 'new'
  action_note TEXT                                 -- "referred to DSL", free text (teacher-only, never AI)
  actioned_at TIMESTAMPTZ
  UNIQUE (source_type, source_id)
  -- the register UNIONs the live flagged rows with this table for status; rows are never AI-bound

pupil_unit_signal             -- 10.24: one-tap per-unit progress traffic-light
  pupil_id BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE
  unit_id  BIGINT NOT NULL REFERENCES units(id)  ON DELETE CASCADE
  signal   TEXT NOT NULL CHECK (signal IN ('behind','on_track','exceeding'))
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  PRIMARY KEY (pupil_id, unit_id)
```

Plus a small **distinguishing flag** for 10.4 so a disclosure isn't the same as a mark-review flag —
add `pupil_marks.disclosure BOOLEAN NOT NULL DEFAULT false` (set when the content guard withholds an
answer), and render it red/distinct from the yellow `needs_review` flags.

**Erasure (10.2) is the migration-sensitive one.** The Phase-2 tables reference `pupils(id)` with the
default (RESTRICT): `enrolments`, `notes`, `tasks`, `events`, `note_pupil_mentions`
([0003_phase2.sql:18,40,66,150,183](../app/migrations/0003_phase2.sql)). The Phase 8/9 tables
([0018](../app/migrations/0018_pupils.sql)/[0022](../app/migrations/0022_marking.sql)) are
`ON DELETE CASCADE`. The erase action must therefore, in **one transaction**: detach or delete the
RESTRICT dependents (e.g. `note_pupil_mentions`/`enrolments` deleted; `notes`/`tasks`/`events`
`pupil_id` set NULL to keep cohort history), *then* `DELETE FROM pupils` to clear the CASCADE
tables, *then* write the disposal audit row. Anonymise-in-place (replace `display_name` with the
stable `ai_token`) is the gentler default for a leaver where answers are kept per the retention
period; full delete is the SAR-erasure path. **Either way the name leaves the redaction roster**, so
the egress-assert list shrinks correctly.

---

## 3. The AI boundary holds — every new AI touch goes through the one wrapper

The survey's AI-boundary lens found the existing boundary clean. Phase 10 adds AI in only three
places, all through `llm/client.ts` with the same redaction/withholding/audit:

- **10.15 retrieval starters** — the "got wrong recently" input is the *already-anonymous*
  per-question success data the adapt summary uses (no pupil identity); fed via `context[]`.
- **10.16 standing digest** — cohort-level feedback aggregates only (ratings, activity chips); the
  same `class_work` aggregation + redaction path that 8.7 already uses.
- **10.17 captured auto-categorise** — names redacted, safeguarding-flagged text withheld, exactly
  like `email_triage`.

**10.5 is the boundary *improvement*:** email triage currently sends the full body to *decide*
safeguarding — Phase 10 screens with `guardMatch` first so a tripped email is filed locally and
never sent. Nothing in Phase 10 sends a pupil name, an individual profile, or a disclosure to the AI.

---

## 4. Testing

Per house convention — pure logic unit-tested (DB-free), data/route behaviour in the integration
suite (real dev DB on 5434, AI forced off). Safety-critical additions:

- **10.1** unit-test the backup encrypt/decrypt round-trip in a script test; CI/cron-able
  `verify-backup.sh` asserts a non-empty, loadable restore.
- **10.2** integration: erase a pupil with notes/marks/answers/mentions present → all dependent
  rows gone or detached per policy, an audit row written, and the name no longer in the redaction
  roster; a SAR export gathers exactly that pupil's rows and nothing of another pupil's.
- **10.3** integration: a teacher request after the idle window redirects to login; within the
  window it does not.
- **10.4** integration: a guard-matched answer lands in the register as `disclosure`, distinct from
  a `needs_review` mark; status transitions are audited.
- **10.5** unit/integration: an email tripping `guardMatch` files a flagged captured item with
  **zero** AI calls (assert no `ai_calls` row for it).
- **10.8** integration: a pupil POST after idle returns an `HX-Redirect` (not a bare 302); a failed
  save surfaces the "not saved" state.
- **10.9** integration: enqueue a job, simulate a restart (no in-memory timer), run the boot sweep →
  the open pass runs once and is idempotent on re-run.
- **10.10** integration: a stale-`updated_at` write returns 409 and does **not** overwrite.
- **10.15/10.16/10.17** the redaction/withholding asserts already enforced by the wrapper's tests
  cover the new features by construction; add a context-screen test like the 9.x ones.

---

## 5. Deliberately out of scope (parked, with reasons)

- **Anything multi-teacher** — multiple teacher accounts, RBAC, cross-subject pupil profiles,
  per-teacher spend: all stay in [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md) until
  single-teacher mode is well-tested. *Phase 10 must not pre-empt that design.*
- **pgvector semantic search** over notes/resources (Roadmap 4.8, optional) — global ILIKE/FTS
  (10.19) is the cheaper first step; revisit only if keyword search proves insufficient.
- **High-fidelity DOCX/PPTX rendering** from structured content — large, low daily payoff; the
  current export path is adequate.
- **Week A/B (fortnight) timetable** — no current need recorded; revisit if a timetable demands it.
- **Deeper MS Teams integration** — out of the LAN-only, low-dependency posture.
- **Multi-provider LLM selection (OpenAI/Gemini)** — already captured for the future in the
  user-key work; not needed while Anthropic is the single provider. Keep the wrapper provider-shaped.
- **Homework-from-home** — crosses the in-school/at-home data boundary; only in-school homework
  tracking would be considered, and not in Phase 10.

---

## 6. Open questions for the teacher (before building Track A)

1. **Retention period** — how long are pupil answers/marks kept before the 10.7 sweep aggregates or
   deletes them? (DPIA says "academic year + one term, then aggregate — DPO to confirm.") The sweep
   ships **off** until this is set.
2. **Erasure default** — for a leaver, is the default **anonymise-in-place** (keep answers/marks for
   cohort history, drop the name) or **full delete**? (Full delete is always available for a SAR
   erasure request.)
3. **Teacher idle-logout minutes** — what value matches the school's policy for a classroom laptop
   (suggested 30–60 min)?
4. **Backup encryption key handling** — where does the school hold the `age`/`gpg` key, and who can
   decrypt a restore? (Determines the 10.1 key-management note in the RUNBOOK.)
