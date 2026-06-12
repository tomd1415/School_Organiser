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
  attached** (anonymous slots), evidence-quoted, confidence-scored, safety-gated — and nothing
  reaches a pupil until the teacher reviews and **releases**.
- **Pupils get results back** — friendly ticks + a "what went well / try this" line + an
  optional teacher comment, on their own screen, the next time they look.
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
| **9.3** | **AI marking of open answers** — auto-runs as pupils tap **Done ✓** (debounced into **per-question** batches of anonymous slots; a review-page "✨ Mark anything unmarked" button sweeps stragglers/re-marks); evidence quotes, confidence, short pupil feedback; the **safety gate** + guard-pattern screen | the hard 20% marked as suggestions | L |
| **9.4** | **Review & release** — marks land in the Pupil-work grid as amber suggestions; confirm-all-confident in one click; tap-to-override (audited); per-pupil **teacher comment back** (AI-prefilled, editable); a deliberate **Release marks** action per lesson | teacher stays the marker of record | M |
| **9.5** | **Results on `/me`** — after release: big ✓/✗/partial per answer, the feedback line, the teacher's comment; scores optionally hidden (ticks only) | pupils see how they did, kindly | S |
| **9.6** | **Stay signed in on this computer** — remembered-device cookie bound to the pupil (hashed at rest, term-long, revocable, "Not me?" escape); teacher device list + revoke; account-disable kills devices | login friction → zero on own Windows profiles | M |
| **9.7** | **Marks → the loop + the answer pack** — per-question success rates in the class-work summary (8.7 becomes mark-aware); misconception notes accumulate per course; **printable class answer pack** (questions + answers + class stats, for going through on the board); CSV marks export | the loop closes on hard data | M |
| **9.8** | **"What works for me" profiles** — per pupil, from feedback + marks history (tokens only): a two-line digest on the review grid & Pupils page; suggests level changes ("full marks on core 3 lessons running → try challenge") | the system learns each pupil | S |
| **9.9** | *(stretch)* **retrieval-practice starters** — "open with 3 questions this class got wrong recently" offered in draft/adapt lessons; misconception-aware re-asks; marks sparklines per pupil | spaced retrieval for free | M |

Strict order: 9.0 gates 9.2 onwards (it covers stored attainment, not just AI marking). 9.1
touches only resource generation — it can land **during Phase 8's tail**, before any pupil has
logged in. 9.6 is independent of marking and can ship any time after 9.0.

---

## 2. Data model — migration `0019` (sketch; numbering follows wherever Phase 8's 0018 lands)

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

-- plus: occurrence_courses.marks_released_at TIMESTAMPTZ  (release is per lesson per class)
```

The scheme is keyed by the **same `field_key`s as `pupil_answers`** and by resource version, so
marking always compares like with like: a regenerated worksheet gets a fresh scheme; old answers
keep matching the scheme for the version the pupil actually saw. Adapted class copies get their
own schemes at generation time, exactly as masters do. One scheme covers all three
differentiation levels (keys derive from the full document — Phase 8's slicing already
guarantees this).

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
- **Trigger (decided 2026-06-12, Q34)**: marking runs **automatically when a pupil taps
  Done ✓** — deterministic marks land instantly; the pupil's open answers join a queue, and a
  short debounce (~2 min) groups finishers so the AI still marks **per-question batches across
  whoever is done** (consistency + fewer calls survive the auto trigger). The review page keeps
  a "✨ Mark anything unmarked" button as the sweep for pupils who never tap Done and for
  re-marks. Auto-marking respects the monthly spend cap and the AI kill-switch — with AI off,
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

- **Nothing is pupil-visible until the teacher releases** — marking produces *suggestions*;
  `Release marks` (per lesson, per class) is the deliberate act that publishes confirmed marks,
  feedback lines and comments. Unconfirmed suggestions are simply held back.
- On `/me`, a released lesson shows the pupil's own sheet with **big ✓ / ✗ / ◐ per answer**, the
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
   profiles and borrowed seats).
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
- **Marks are suggestions until a teacher confirms; invisible until a teacher releases.**
  Overrides are audited in-row (`history`). The AI never communicates with a pupil directly —
  feedback lines ship only inside a teacher-released, teacher-editable surface.
- **Device cookies** are secondary credentials: scrypt-hashed like every other credential,
  bound to one pupil, name-confirmed on use, killed by disable/PIN-reset/expiry/revoke.

---

## 9. Decisions & open questions

- **Decided (teacher, 2026-06-12 — Q33–Q37):** released results are **ticks-only by default**
  (per-class toggle for scores — same sensitivity-first instinct as the unlabelled levels);
  **AI marking auto-runs on Done ✓** (the one choice against the manual-first recommendation —
  see the §3 trigger: debounced per-question batches + the sweep button); **remembered devices
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
- **Release gating**: pupils see nothing pre-release (direct-URL probes included); release
  exposes only confirmed marks; un-release is possible until end of day.
- **Override audit**: prior value + actor recorded; grid math (n/m, success rates) correct.
- **Devices**: hash-at-rest, expiry honoured, revoke/disable/PIN-reset all kill the cookie,
  "Not me" path clean, rate-limited.
- **Integration suites stay AI-free** as ever (empty key forced); one live smoke per AI slice
  via a throwaway `app/scripts/X-smoke.ts`, then deleted.

---

## 11. Out of scope for Phase 9

- Formal gradebooks, MIS write-back, parent-facing reports (CSV export only).
- Marking handwriting, photos or uploaded files (typed answers only).
- Cross-class or cross-year league tables — never.
- Internet exposure / homework from home (unchanged from Phase 8).
- Auto-generated question *banks* (pgvector similarity et al.) — revisit only if worksheet
  generation stops being sufficient; `exam_questions` remains the reference design.

---

## 12. Recommended first slice

**9.1 (mark schemes as data)** — it touches only resource generation, needs no pupil to exist,
and immediately improves the teacher-facing answers doc (structured, editable). Start the
**9.0 DPIA addendum** in parallel (it is the schedule risk, exactly as 8.0 was). Then 9.2 the
moment Phase 8's answers exist, 9.3/9.4/9.5 as one arc, and 9.6 whenever convenient after 9.0
— it is the slice pupils will feel first.
