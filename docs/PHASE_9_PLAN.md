# Phase 9 — Auto-marking & the results loop

> **Status (2026-06-12): planned, plan-first — for review before any code.**
> Phase 8 turns pupil answers into data; Phase 9 turns that data into **marks, feedback and
> better next lessons** — with the teacher moderating, not transcribing. It also absorbs the
> Phase 8 stretch list (8.8) and adds **"stay signed in on this computer"** for pupils.
> **Gates:** Phase 8 built through 8.6 (answers + review grid exist); a **DPIA addendum**
> (9.0) before any pupil answer text reaches the AI, before per-pupil attainment is stored,
> and before the remembered-device credential ships.

The design leans heavily on the sibling **`exam_questions`** project (same house conventions),
which already built deterministic marking for objective question types and fully designed —
partially built — LLM marking with a safety gate and a moderation queue. §4 lists exactly what
is reused, what is adapted, and what is deliberately skipped.

---

## 0. What Phase 9 changes

- **The answers doc becomes a mark scheme** — worksheet generation already emits an answers
  document for the teacher; it now *also* emits the same content as data: per answer field, the
  expected answer(s), accepted alternatives, and marks. Machine-readable, teacher-editable.
- **Objective answers mark themselves** — ticks, choices, exact/numeric answers are marked
  instantly, deterministically, with no AI call at all.
- **Open answers are AI-marked as suggestions** — batched per question with **no pupil identity
  attached** (anonymous slots), evidence-quoted, confidence-scored, safety-gated — and no AI
  mark reaches a pupil until the teacher confirms it.
- **Pupils get results back, fast** — friendly ticks + a "what went well / try this" line + an
  optional teacher comment, on their own screen: objective answers within seconds of Done ✓,
  so feedback lands **inside the lesson** (or everything held until Release — per class).
- **Marks close the loop properly** — per-question class success rates and misconception notes
  join the class-work summary the adapt-next-lesson AI already reads; over time each pupil gets
  a **"what works for me" profile** and the class gets retrieval-practice starters built from
  what it actually got wrong.
- **Logging in disappears as a friction** — a pupil who signed in once on their own school
  account stays signed in on that computer (revocable device cookie), so Windows login
  effectively becomes app login. *(Replaces 8.8's kiosk-per-room idea — one teaching room, so
  the per-pupil version is the useful one.)*

What deliberately does *not* change: the AI boundary (one wrapper; names never leave —
marking batches carry no identity at all; safeguarding content withheld), AI as suggestion-maker
with the teacher as decision-maker, LAN-only, graceful degradation when AI is off.

---

## 1. Build order (each slice a reviewable commit)

| # | Slice | Delivers | Size |
|---|---|---|---|
| **9.0** | **DPIA addendum** (external) — anonymous answer text to the AI sub-processor for marking; per-pupil marks (attainment) stored; the remembered-device credential; marks retention | the legal gate for 9.2+ | S (blocking) |
| **9.1** | **Mark schemes as data** — generation emits a structured scheme alongside the answers doc (`lesson_resources@5`); a "derive scheme" action backfills existing worksheets (one AI call, teacher reviews); inline scheme editor on the resource page | every worksheet knows its right answers | M |
| **9.2** | **Deterministic marking** — tick / choice / exact / numeric / keyword fields marked server-side the moment work is reviewed (or on Done ✓); zero AI | most marks, instantly, free | M |
| **9.3** | **AI marking of open answers** — per-class trigger: **as pupils finish** (default; Done ✓ enqueues, debounced into **per-question** batches of anonymous slots) or **batch-on-button** ("✨ Mark the written answers", always present as the sweep); evidence quotes, confidence, short pupil feedback; the **safety gate** + guard-pattern screen | the hard 20% marked as suggestions | L |
| **9.4** | **Review, confirm & visibility** — marks land in the Pupil-work grid as amber suggestions; confirm-all-confident in one click (usable mid-lesson while circulating); tap-to-override (audited); per-pupil **teacher comment back** (AI-prefilled, editable); per-class visibility: **instant on confirm** (default) or **hold until Release** | teacher stays the marker of record | M |
| **9.5** | **Results on `/me`** — big ✓/✗/◐ per answer as marks become visible (objective ones within seconds of Done ✓ in instant mode), the feedback line, the teacher's comment; scores optionally hidden (ticks only) | quick feedback, inside the lesson | S |
| **9.6** | **Stay signed in on this computer** — remembered-device cookie bound to the pupil (hashed at rest, term-long, revocable, "Not me?" escape); teacher device list + revoke; account-disable kills devices | login friction → zero on own Windows profiles | M |
| **9.7** | **Marks → the loop + the answer pack** — per-question success rates in the class-work summary (8.7 becomes mark-aware); misconception notes accumulate per course; **printable class answer pack** (questions + answers + class stats, for going through on the board); CSV marks export | the loop closes on hard data | M |
| **9.8** | **"What works for me" profiles** — per pupil, from feedback + marks history (tokens only): a two-line digest on the review grid & Pupils page; suggests level changes ("full marks on core 3 lessons running → try challenge") | the system learns each pupil | S |
| **9.9** | *(stretch)* **retrieval-practice starters** — "open with 3 questions this class got wrong recently" offered in draft/adapt lessons; misconception-aware re-asks; marks sparklines per pupil | spaced retrieval for free | M |

Strict order: 9.0 gates 9.2 onwards (it covers stored attainment, not just AI marking). 9.1
touches only resource generation — it can land **during Phase 8's tail**, before any pupil has
logged in. 9.6 is independent of marking and can ship any time after 9.0.

---

## 2. Data model — migration `0022`+ (sketch; 0019–0021 are Phase-8 fixes, so the next free number is 0022)

```
mark_schemes                 -- one per worksheet resource version
  id          BIGSERIAL PK
  resource_id BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE
  version_no  INT NOT NULL
  source      TEXT NOT NULL CHECK (source IN ('generated','derived','teacher'))
  status      TEXT NOT NULL CHECK (status IN ('draft','ready')) DEFAULT 'draft'
  updated_at  TIMESTAMPTZ NOT NULL
  UNIQUE (resource_id, version_no)

mark_scheme_points           -- ≥1 per answerable field; several for multi-mark open answers
  id             BIGSERIAL PK
  mark_scheme_id BIGINT NOT NULL REFERENCES mark_schemes(id) ON DELETE CASCADE
  field_key      TEXT NOT NULL              -- the SAME keys as pupil_answers ("t2.r3.c1", "task.4")
  kind           TEXT NOT NULL CHECK (kind IN ('tick','choice','exact','numeric','keyword','open'))
  expected       TEXT NOT NULL              -- the creditworthy answer / point
  alternatives   TEXT[] NOT NULL DEFAULT '{}'  -- accepted variants ("CPU", "processor", …)
  marks          INT  NOT NULL DEFAULT 1
  required       BOOLEAN NOT NULL DEFAULT false
  display_order  INT NOT NULL DEFAULT 0

pupil_marks                  -- one per marked answer; suggestion until the teacher confirms
  id              BIGSERIAL PK
  pupil_answer_id BIGINT NOT NULL UNIQUE REFERENCES pupil_answers(id) ON DELETE CASCADE
  marks_awarded   INT NOT NULL
  marks_total     INT NOT NULL
  points_hit      BIGINT[] NOT NULL DEFAULT '{}' -- mark_scheme_points.id
  evidence        TEXT[]   NOT NULL DEFAULT '{}' -- quotes; gate-verified substrings of the answer
  marker          TEXT NOT NULL CHECK (marker IN ('auto','ai','teacher'))
  confidence      NUMERIC(3,2)                   -- 1.00 auto; the model's own for ai
  status          TEXT NOT NULL CHECK (status IN ('suggested','confirmed')) DEFAULT 'suggested'
  needs_review    BOOLEAN NOT NULL DEFAULT false -- set by the safety gate; reasons in history
  feedback        TEXT NOT NULL DEFAULT ''       -- pupil-facing line ("You did X. Next: Y.")
  history         JSONB NOT NULL DEFAULT '[]'    -- audit: gate reasons, prior values on override
  updated_at      TIMESTAMPTZ NOT NULL

pupil_lesson_comments        -- the teacher's comment back (mirrors pupil_lesson_feedback)
  pupil_id             BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE
  occurrence_course_id BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE
  comment              TEXT NOT NULL DEFAULT ''
  updated_at           TIMESTAMPTZ NOT NULL
  UNIQUE (pupil_id, occurrence_course_id)

pupil_devices                -- "stay signed in on this computer" (9.6)
  id           BIGSERIAL PK
  pupil_id     BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE
  token_hash   TEXT NOT NULL UNIQUE        -- cookie holds the secret; only the hash is stored
  label        TEXT NOT NULL DEFAULT ''    -- "Edge on ICT1-07" (user-agent hint)
  last_used_at TIMESTAMPTZ
  expires_at   TIMESTAMPTZ NOT NULL        -- default: end of the current term
  created_at   TIMESTAMPTZ NOT NULL

pupil_profiles               -- "what works for me" (9.8)
  pupil_id   BIGINT PK REFERENCES pupils(id) ON DELETE CASCADE
  digest     TEXT NOT NULL DEFAULT ''      -- two lines of prose; AI-written from tokenised history
  updated_at TIMESTAMPTZ NOT NULL

-- plus: occurrence_courses.marks_released_at TIMESTAMPTZ  (the hold-mode release act)
-- plus: group_courses.marking_trigger TEXT CHECK ('on_done','manual')    DEFAULT 'on_done'
--       group_courses.results_mode    TEXT CHECK ('instant','on_release') DEFAULT 'instant'
```

The scheme is keyed by the **same `field_key`s as `pupil_answers`** and by resource version, so
marking always compares like with like: a regenerated worksheet gets a fresh scheme; old answers
keep matching the scheme for the version the pupil actually saw. Adapted class copies get their
own schemes at generation time, exactly as masters do. One scheme covers all three
differentiation levels (keys derive from the full document — Phase 8's slicing already
guarantees this).

> **Resolve the scheme via the lesson instance, NOT via `pupil_answers.resource_id`.** Phase 8's
> migration `0019` re-keyed answers onto `(pupil_id, occurrence_course_id, field_key)` and `0020`
> made `resource_id` nullable provenance (`ON DELETE SET NULL`, and a write after a master↔adapted
> flip can carry a different/`NULL` resource). So marking must find the scheme the *same way the
> pupil's worksheet is resolved* — `occurrence_course → bound lesson_plan → the class's current
> worksheet resource + version` (the `getLessonWorksheet`/`…Meta` path) — and match answers by
> `field_key`. Keying marking off `answer.resource_id` would silently miss flipped/blank-provenance
> answers. This is the one place the Phase-8 fixes change a Phase-9 assumption.

---

## 3. The marking pipeline (9.2/9.3/9.4)

```
pupil answers ──┬─ tick/choice/exact/numeric/keyword ──► deterministic marker (instant, free)
                │                                              │ marker='auto', confidence 1.00
                └─ open ──► guard-pattern screen ──┬─ matched ─► "needs your eyes" strip
                                                   │             (NEVER sent to AI)
                                                   └─ clean ──► per-question anonymous batch
                                                                 ──► AI ──► safety gate
                                                                       │ marker='ai' + confidence
                                                                       ▼
                                  Pupil-work grid: suggestions ► confirm / override (teacher)
                                                                       ▼
                                                    Release marks ► visible on /me
```

- **Deterministic first** (9.2): normalised comparison (trim, case-fold, punctuation-fold;
  numeric kinds parse both sides as numbers; keyword kinds match any alternative on word
  boundaries). Anything ambiguous is classified `open` at scheme-generation time rather than
  guessed at marking time.
- **Per-question batching** (9.3): one AI call marks *all the class's answers to one question*
  — better consistency than answer-at-a-time, fewer calls, and the batch carries **no pupil
  identity whatsoever**: answers are slot-lettered (A, B, C…) and the slot→pupil map never
  leaves the server. The standard wrapper still runs underneath (a pupil may type a classmate's
  name *inside* an answer → roster redaction catches it; audit row stores the redacted batch).
- **The safety gate** (adapted from `exam_questions`): a mark suggestion is flagged
  `needs_review` if its **confidence < 0.6**, its **evidence quote is not a substring of the
  answer** (hallucination check), or its marks had to be **clipped** to the field total. Gate
  reasons are written into `history` so the review grid can say *why* something is amber.
- **Guard patterns before egress**: a small, teacher-editable list of safeguarding/injection
  patterns screens open answers *before* the batch is assembled. A match means that answer is
  **withheld from AI entirely** and surfaced prominently to the teacher ("needs your eyes") —
  in a SEND setting, a worksheet answer is a plausible disclosure channel and is treated as one.
  This is the existing withholding principle applied to a new inbound surface.
- **Trigger (decided 2026-06-12, Q34 — refined same day): a per-class choice.** Default
  **"as pupils finish"**: Done ✓ marks the objective fields instantly and enqueues the open
  ones; a short debounce (~2 min) groups finishers so the AI still marks **per-question batches
  across whoever is done** (consistency + fewer calls survive the auto trigger). Alternative
  **"when I press"**: nothing goes to the AI until the "✨ Mark the written answers" batch
  button — which stays present in *both* modes as the sweep for pupils who never tap Done and
  for re-marks. Marking respects the monthly spend cap and the AI kill-switch — with AI off,
  open answers simply wait, marked "not yet marked", and everything else still works.

---

## 4. What `exam_questions` taught us (and what we take)

The sibling project (`~/projects/exam_questions`) designed this exact problem for GCSE papers.
**Reused as-is (concepts):** mark points with `accepted_alternatives` + `is_required`;
deterministic-before-LLM dispatch; **evidence quotes verified as substrings** of the answer;
confidence-thresholded moderation; safeguarding/injection guard patterns; suggestion → teacher
override with an audit trail. **Adapted:** their per-attempt marking becomes per-question
anonymous batching (stronger privacy, cheaper); their hand-authored question bank becomes
schemes emitted by the same generation call that writes the worksheet; their three-field pupil
feedback (`what_went_well / how_to_gain_more / next_focus`) is compressed to one gentle line —
right for this cohort. **Skipped:** the `prompt_versions` table (our `promptKey@version` in
`ai_calls` already covers it); pgvector similarity (no question bank here — yet); the 9-step
authoring wizard (schemes are generated, then edited inline); separate `teacher_overrides` rows
(one-teacher app — the `history` JSONB carries the chain).

---

## 5. Results back to the pupil (9.4/9.5)

- **Two visibility modes, per class** — **instant** (default): a pupil who taps Done ✓ sees
  ✓/✗/◐ on their objective answers within seconds — **quick feedback inside the lesson** — and
  AI-marked open answers appear as the teacher confirms them, one tap each or
  confirm-all-confident from the live grid while circulating. **Hold until Release**: nothing
  is visible until the deliberate per-lesson `Release marks` action (the right mode for
  assessments or a class that needs results handled carefully).
- **The invariant in both modes: pupils only ever see *confirmed* marks.** Deterministic marks
  confirm themselves (they are objective); AI suggestions never reach a pupil until the teacher
  confirms them, and the feedback line ships teacher-editable.
- On `/me`, visible marks render on the pupil's own sheet as **big ✓ / ✗ / ◐ per answer**, the
  one-line feedback under each open answer, and the teacher's comment at the top. Tone is
  two-stars-and-a-wish; **no class comparison, ever**. Numeric scores are a per-class teacher
  toggle (default: ticks only — same sensitivity instinct as the unlabelled levels).
- The **teacher comment back** (from 8.8) is a quick per-pupil box on the review grid,
  prefilled with the AI's suggested line where one exists, always editable — a comment is the
  teacher's words by the time it ships.

---

## 6. Stay signed in on this computer (9.6)

Pupils log into school Windows machines with **their own accounts**, so the browser profile is
theirs — a persistent cookie makes Windows login double as app login:

1. After a successful PIN login, the pupil (or the teacher, via a setting: always-offer /
   opt-in / off) chooses **"Stay signed in on this computer"** → a `pupil_devices` row is
   created; the cookie carries the secret, the DB stores only its hash (`HttpOnly`,
   `SameSite=Strict`, expiry = end of term).
2. Next visit: valid cookie → a friendly **"Continue as Alex 👋"** screen — one tap in, with a
   clearly-visible **"Not me"** that drops to the normal class-code login (covers shared
   profiles and borrowed seats). The cookie re-establishes **`pupilId` only** — lesson/class
   resolution then runs exactly as a fresh login (`/me` resolves via the pupil's active
   enrolments). The device row stores **no fixed class/group binding**, so it stays correct when
   a pupil is in several classes — and forward-compatible with the multi-teacher one-account model.
3. Idle-logout still ends *sessions* as in Phase 8 — the device cookie's whole point is that
   the next tap-in is instant.
4. **Teacher controls:** a devices list per pupil (label + last used), one-click revoke,
   revoke-all per class, and automatic revocation when a pupil's account is disabled or their
   PIN is reset. Rate-limited like the login itself.

---

## 7. Marks feed the loop (9.7/9.8/9.9)

- The **class-work summary** (8.7) becomes mark-aware: per-question success rates ("Q3: 2/9 —
  most confused input with output"), misconception notes, and who-needs-help as tokens — all
  through the same wrapper, all landing in `recentGroupHistory`, so *adapt-next-lesson now knows
  what the class actually got wrong, not just what it wrote*.
- The **printable class answer pack** (from 8.8): one print-view per lesson — each question,
  the accepted answers, the class's stats — for going through the answers on the board.
  A **CSV export of marks per course** covers school reporting asks.
- **"What works for me"** (9.8): a two-line per-pupil digest from feedback + marks history
  (tokenised before AI, as ever), shown on the review grid and Pupils page, refreshed on demand
  — and it suggests level moves ("three lessons of full marks on core → try challenge"), which
  the teacher applies with the existing 🟢🟡🔴 chips.
- *(stretch, 9.9)* **Retrieval-practice starters**: draft/adapt lesson calls gain a
  "recently-missed questions" context block, and the lesson page offers "open with 3 questions
  this class got wrong" — spaced retrieval generated from real misses.

---

## 8. Security & safeguarding posture

- **DPIA addendum first (9.0)** — three additions to the Phase 8 position: per-pupil
  **attainment records** are stored (new category, server-side only); **anonymous answer text**
  goes to the AI sub-processor for marking (no identity attached — slot letters, plus roster
  redaction inside the text); a **persistent device credential** exists on classroom machines
  (hashed at rest, term-bounded, revocable). Proposed marks retention: same as answers
  (academic year + one term, then reduced to aggregate stats) — DPO to confirm.
- **The boundary holds**: marking batches are the *least*-identified AI traffic in the app —
  no name, no token, no pupil id. The egress tests extend to assert exactly that.
- **Withholding gains a new front door**: guard-patterned answers never reach the AI and are
  surfaced to the teacher as a distinct "needs your eyes" strip — the safeguarding-flag
  workflow then applies as usual.
- **Pupils only ever see confirmed marks.** Deterministic marks self-confirm (objective); AI
  marks are suggestions until the teacher confirms — in instant mode that confirmation is what
  makes them visible, in hold mode visibility additionally waits for `Release marks`. Overrides
  are audited in-row (`history`). The AI never communicates with a pupil directly — its
  feedback ships only after teacher confirmation, teacher-editable.
- **Device cookies** are secondary credentials: scrypt-hashed like every other credential,
  bound to one pupil, name-confirmed on use, killed by disable/PIN-reset/expiry/revoke.

---

## 9. Decisions & open questions

- **Decided (teacher, 2026-06-12 — Q33–Q37):** visible results are **ticks-only by default**
  (per-class toggle for scores — same sensitivity-first instinct as the unlabelled levels);
  **the marking trigger is a per-class choice — "as pupils finish" (default) or
  batch-on-button — paired with per-class results visibility: instant-on-confirm (default;
  quick feedback within the lesson) or hold-until-Release** (§3/§5); **remembered devices
  are per-class, off by default** until the DPO has seen the addendum; **numeric marking is
  strict after parsing** with word forms as listed alternatives (widen only on real friction);
  **misconception notes stay free prose** until 9.9 needs a queryable table.
- **Marks retention** (9.0): year + one term proposed — DPO to confirm alongside answers.

---

## 10. Test strategy

- **Scheme round-trip**: every answerable field key in a generated worksheet gets ≥1 scheme
  point; scheme keys ⊆ document keys; derived schemes flag unmatched keys for review.
- **Deterministic marker**: table-driven cases — case/whitespace/punctuation folds, numeric
  parsing, keyword word-boundaries, alternatives, required-point logic, partial credit.
- **Egress (the ones that matter)**: a marking batch contains no pupil id/token/name mapping;
  roster names typed *inside* answers are tokenised; guard-matched answers never appear in any
  request; profile digests contain no names. All as failing-build tests beside the existing
  redaction suite.
- **Safety gate**: evidence-not-in-answer → flagged; confidence below threshold → flagged;
  clipping recorded; gate reasons land in `history`.
- **Visibility gating**: in hold mode pupils see nothing pre-Release; in instant mode only
  **confirmed** marks ever show — suggestions never (direct-URL probes included); mode changes
  take effect cleanly mid-lesson; un-release/hide is possible until end of day.
- **Override audit**: prior value + actor recorded; grid math (n/m, success rates) correct.
- **Devices**: hash-at-rest, expiry honoured, revoke/disable/PIN-reset all kill the cookie,
  "Not me" path clean, rate-limited.
- **Integration suites stay AI-free** as ever (empty key forced); one live smoke per AI slice
  via a throwaway `app/scripts/X-smoke.ts`, then deleted.

**Forward-compatibility tests (multi-teacher — see §13).** Most need Phase 9 code, so they're
specified here; the egress-at-scale one is buildable now and **already added**:

- ✅ **Egress at school-wide-roster scale (built now)** — `redact.test.ts` and `classWork.test.ts`
  prove that with a ~200-pupil multi-class roster, a name from *another teacher's class* typed in
  an answer is tokenised and the egress assert catches it, and longest-match ordering holds at
  scale. Locks the invariant that "no pupil name to AI" is roster-size/membership-agnostic.
- **Schema shape (when 0022+ lands):** `pupil_profiles` PK is `pupil_id` alone (one row per pupil,
  no course/teacher dimension); `pupil_devices` references only `pupil_id`; `mark_schemes` /
  `pupil_marks` / `pupil_lesson_comments` have **no** owner/teacher/user column — documenting that
  ownership is intentionally deferred to the future RBAC layer.
- **Marking resolves via the lesson instance** (guards the §2 note): an answer whose
  `resource_id` is `NULL` (post master↔adapted flip) still resolves to the right scheme via
  `occurrence_course → lesson_plan → worksheet` and gets marked.
- **Marks-rollup query shape:** review-grid / rollup queries join through
  `group_courses`/`occurrence_courses`, never a global "all marks" SELECT — so a future
  owner-scope `WHERE` is a drop-in.
- **Device resume is class-agnostic:** resuming via cookie sets the pupil session with **no** fixed
  group/class; `/me` resolves identically whether entered via class-code login or device cookie.
  Account-disable and PIN-reset each revoke **all** of a pupil's device rows (cascade by
  `pupil_id`); a revoked/expired `token_hash` no longer authenticates.
- **Profile is pupil-keyed and owner-read:** the digest is queried/rendered only on the owning
  teacher's surfaces and contains no roster name/token for any pupil (the cross-subject read case
  is future-proofed by the same egress assertion).

---

## 11. Out of scope for Phase 9

- Formal gradebooks, MIS write-back, parent-facing reports (CSV export only).
- Marking handwriting, photos or uploaded files (typed answers only).
- Cross-class or cross-year league tables — never.
- Internet exposure / homework from home (unchanged from Phase 8).
- Auto-generated question *banks* (pgvector similarity et al.) — revisit only if worksheet
  generation stops being sufficient; `exam_questions` remains the reference design.
- **Cross-subject aggregation or sharing of the "what works for me" profile (9.8)** — the profile
  is built **single-teacher and pupil-keyed**, read only on the owning teacher's surfaces under
  the 9.0 DPIA addendum. Letting *other* subjects' teachers see or feed it is the
  [multi-teacher future](PHASE_MULTI_TEACHER_PLAN.md) §6, gated by **its** fresh whole-school DPIA
  — **not** the Phase-9 addendum. (See §13.)

---

## 12. Recommended first slice

**9.1 (mark schemes as data)** — it touches only resource generation, needs no pupil to exist,
and immediately improves the teacher-facing answers doc (structured, editable). Start the
**9.0 DPIA addendum** in parallel (it is the schedule risk, exactly as 8.0 was). Then 9.2 the
moment Phase 8's answers exist, 9.3/9.4/9.5 as one arc, and 9.6 whenever convenient after 9.0
— it is the slice pupils will feel first.

## 13. Forward compatibility with the multi-teacher future

Checked against [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md) (an independent
three-lens audit, 2026-06-13): **the multi-teacher v2 forces NO structural change to this plan.**
Phase 9 is already keyed exactly the way that future needs, because — like Phase 8 — every table
hangs off pupils / occurrences / resources, never off "the teacher". The notes below are the
deliberate choices that keep it that way; honour them when building.

- **`pupil_profiles` is pupil-keyed (PK `pupil_id`) — the cross-subject bridge.** Never key it per
  course or per teacher. When multi-teacher arrives, sharing the profile is a pure *read-access*
  (RBAC) decision over an already-correct row, never a re-key or a merge. (The cross-subject
  *sharing itself* is deferred and DPIA-gated to v2 — §11.)
- **`pupil_devices` references only `pupil_id`** — no class/group/teacher binding. Resuming a
  session restores `pupilId` and lets `/me` resolve via enrolments, so one device login works
  school-wide once a pupil has one account. Disable / PIN-reset cascade revokes by **pupil
  identity**, which survives the future fold into a unified `users` table.
- **Marks and comments carry no owning-teacher column.** The owning teacher is derived through the
  existing chain `pupil_marks → pupil_answers → occurrence_course → occurrence →
  timetabled_lesson.staff_id` (comments via `occurrence_course`). v2 adds ownership *scoping* in
  its RBAC layer (and an `owner_id` backfill on the shared tables), **not** a column here — so
  review-grid / rollup queries must always join through `group_courses`/`occurrence_courses` (the
  scopeable chain) and never assume a global "all marks are mine" SELECT.
- **The AI boundary is roster-size-agnostic.** Redaction is purely roster-driven, so "no pupil
  name reaches an AI service" holds unchanged when the roster goes school-wide; a name from
  another teacher's class is just another roster entry. (Locked now by the egress-at-scale tests
  in `redact.test.ts` / `classWork.test.ts`.) v2 will additionally add an *acting-user* column to
  `ai_calls` for per-teacher spend attribution — that is a v2 change, out of scope here.
