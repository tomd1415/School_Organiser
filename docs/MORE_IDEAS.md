# Phase 11 — Sharper planning & a calmer surface: the teacher's idea backlog, sequenced

> **Status (2026-06-14): Waves 0–3 + idea 12 BUILT (ideas 11, 6, 3, 1.1, 7, 5, 2, 12).**
> Shipped and tested — **288 unit / 199 integration green; typecheck clean; migrations `0028`
> (`teaching_concepts`) & `0029` (`group_courses.guided_access`)**. Settings → **Navigation** picks the always-visible links
> (default: the leaner five — Now, Focus, Timetable, Tasks, Captured); the rest fold into a "⚙ Setup &
> admin" menu, with the keyboard map + cheat-sheet now derived from the one
> [nav.ts](../app/src/lib/nav.ts) model so they can never drift. Three new cohort-level inputs ride
> the `context[]` seam into the planning/authoring generators — standing style/feature prefs (Settings
> → AI, all generators), course-scoped/global teaching concepts (the new **/concepts** page, the four
> lesson-content generators), and per-class access constraints (a questionnaire on the class context
> editor → `adapt_lesson`/`adapt_resources`) — each redacted, withheld and audited like every input,
> each a no-op until filled. `/settings/ai` is now registry-validated with per-key caps. **Wave 2
> (idea 5):** every one of the 17 AI features can override its model in Settings → AI (priced models
> only, so the £ cap stays accurate) via `modelForFeature()`; unset = its role default, i.e. today's
> behaviour — this lands the cost lever *before* the expensive Opus reviewer. **Wave 3 (idea 2):** a
> pace nudge in `adapt_lesson` — when a class reliably under-runs (≥2 tracked lessons, soft band, no-op
> otherwise) the prompt is told to plan fewer, smaller activities and keep the duration. **Not** built:
> the swappable-themes stretch (idea 11 tail), the idea-3b per-course override, idea-1.2
> weave-into-existing, and idea 5's provider "refresh model list". **Idea 12 (smart capture) is built:**
> the 📝 Note button + `n` open a pop-up anywhere; on save `note_route` proposes 1–3 destinations
> (task / event / captured / general note) you tick to confirm, a 🔒 toggle keeps a note private (never
> sent), and AI-off falls back to general notes. **Next: the Wave 4 coverage backbone (idea 10 → 9),
> then the Wave 5 reviewer (8 + 4).** The original plan follows.
>
> **Status (2026-06-14): PLANNED, plan-first — for review before any code.**
> Phase 10 made the system *trustworthy* with real pupil data (encrypted backups, erasure/SAR,
> disclosure register, durable marking, SEND accessibility — migrations `0024`–`0027`). Phase 11
> spends that trust on the **quality of what the AI produces and the calm of the surface that drives
> it** — the eleven ideas the teacher wrote into the old `MORE_IDEAS.md`. The spine: it **makes
> standing intent real** (style/feature prefs, a teaching-concepts library, guided cohort access
> needs all ride the existing `context[]` seam), it **stops the AI guessing what must be covered**
> (a spec-point source-of-truth + deterministic coverage map + uploaded official docs), it **lets the
> teacher tune cost and depth** (per-feature model choice, an opt-in Opus reviewer), and it **calms
> the chrome** (one typed nav model, daily-vs-setup split, swappable themes).
>
> **This is a menu with a recommended order, not an all-or-nothing gate.** The quick wins (ideas
> **3, 1, 7, 6**) close real gaps for near-zero risk and ship first; the big rocks (the coverage
> backbone **10→9** and the unified reviewer **8+4**) are deferred until the shared seams and the
> cost-control layer (idea **5**) are settled, because the reviewer's Opus spend is the main project
> risk. Nothing multi-teacher — that stays in
> [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md).

This plan is grounded in a per-idea design pass over the teacher's eleven-item backlog (each idea
restated, mapped to real files/tables, given a first shippable slice and an effort) plus a
six-wave sequencing-and-conflict critique (shared-seam dedup, a migration-number collision check, a
double-defined table, cost realism, and the cohort-prose privacy refrain). Where a slice closes a
**gap between what the docs/spec promise and what the code does**, that is called out — those are
correctness fixes to our own compliance and planning story, not just features. Eight of the eleven
ideas inject into the *same* `context[]` builder seam already proven by `equipmentItem` /
`teachingContextItems`, so the dominant design move is "one convention, reused" rather than eleven
bespoke integrations.

---

## 0. What Phase 11 changes

- **Standing teacher intent finally shapes generation.** Today every planning call re-derives style
  and required features from nothing; the teacher can shape one lesson via `improve_master` but
  cannot say "always write in plain step-by-step language, always include a retrieval starter"
  once and have it stick. Ideas 3/1/7 add three cohort-level standing inputs (style/feature prefs,
  a teaching-concepts library, guided per-class access constraints) that flow through the *existing*
  `context[]` arrays in [schemes.ts](../app/src/routes/schemes.ts) and
  [lesson.ts](../app/src/routes/lesson.ts) — inheriting redaction/withholding/audit with **zero**
  changes to the one wrapper.
- **"What must be covered" stops being implicit.** Coverage exists today only as occurrence bindings
  and `curriculumHistory` taught-counts — there is no list of *required* spec points anywhere, so
  the AI author can silently miss a topic and nothing flags it. Idea 10 adds `course_spec_points` as
  a source-of-truth plus a deterministic, AI-free coverage map; idea 9 lets the teacher upload the
  official GCSE spec/examiners' reports and feed real spec text into authoring.
- **The teacher controls cost and depth.** Idea 5 adds per-feature model choice (any caller can run
  Sonnet instead of Opus, or vice-versa) over the existing `modelFor(role)` pattern; idea 4/8 add an
  opt-in, off-by-default Opus reviewer that critiques not-yet-taught lessons and stores advisory
  findings the teacher applies — never auto-applied.
- **The surface gets calmer.** Ideas 6/11 pull the hardcoded 18-link nav and its duplicated keyboard
  map into one typed `NAV_MODEL`, split daily-driver links from a friendly "Setup & admin" menu, and
  add swappable themes — fixing a real existing drift bug between
  [html.ts](../app/src/lib/html.ts) and [app.js](../app/public/app.js).

What deliberately does **not** change: the AI boundary (one wrapper; names never leave; safeguarding
content withheld), AI as suggestion-maker with the teacher as decision-maker, LAN-only,
single-teacher, graceful degradation when AI is off. Every new standing input is **cohort-level
prose only — never names or describes an individual pupil**, and every AI touch lands in `context[]`,
never the `system` string.

---

## 1. Build order

Each slice is an independently shippable, reviewable commit. **Size**: S ≈ ½ day, M ≈ 1–2 days,
L ≈ 3+ days, XL ≈ a multi-slice track. **Priority**: 🔴 do-first / high, 🟠 high daily value,
🟡 nice-to-have, ⚪ stretch. All ⬜ not started. The ideas keep their original numbers (1–11) so the
teacher recognises the list; they are grouped into the six waves the sequencing critique produced.

### Wave 0 — Shared chrome seam *(ideas 6 + 11 are the same refactor — do it once)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **11** | **Typed `NAV_MODEL` extraction** — pull the inline 18-link nav string in [html.ts](../app/src/lib/html.ts) and the duplicated `g`+letter map in [app.js](../app/public/app.js) into one `app/src/lib/nav.ts` `{href,label,key,group}[]`, emitted as inline JSON so the two lists can never drift | Two hand-maintained nav lists already drift — the keyboard jump and the rendered link set are separate strings; this is the proven single-source-of-truth cure and a behaviour-neutral refactor | M | 🔴 | ✅ |
| **6** | **Calm, configurable daily-vs-setup nav** — render the daily set inline (**default the leaner five**: Now, Focus, Timetable, Tasks, Captured), fold the rest into a `<details>` "⚙ Setup & admin" menu with friendly hints (reuse the `/welcome` checklist copy); add a Settings control to pick which links are always visible (a `nav_daily` setting the `NAV_MODEL` reads) + nav active-state | Teacher feedback: the flat 18-link bar is overwhelming. Decided 2026-06-14: leaner-five default, **teacher-configurable** so the daily set changes without code; built on the Wave-0 model so it is additive | M | 🟠 | ✅ |
| **11** | *(stretch)* **Swappable themes** — `[data-theme]` blocks overriding the 8 `:root` CSS vars + a toggle, reusing the pupil-surface theming precedent (`pupil.js` `data-*` + `localStorage` + pre-paint script) | Lets the look be redesigned/varied without touching routes/services/repos; the deferrable tail of idea 11 | M | ⚪ | ⬜ |

### Wave 1 — `context[]` builder quick wins *(one seam, near-zero risk)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **3** | **Standing style & feature prefs (global)** — `styleItems()` builder + two `settings` rows (`ai_style_prefs`, `ai_feature_prefs`) + extend the `/settings/ai` Zod enum, spread into all six planning call sites | Nothing lets the teacher set standing intent today; S-effort, no new table, influences *every* planning feature at once, and forces the registry-validated settings endpoint Waves 2/4/5 all need | S | 🔴 | ✅ |
| **3b** | **Per-course pref override** — course-scoped `ai_style_prefs_course_<id>` / `ai_feature_prefs_course_<id>` keys via the same registry-validated dynamic-key endpoint as idea 5 (no new table), with the override form in the course editor; `styleItems()` merges course-over-global | Decided 2026-06-14: prefs are global **+ per-course**. The global base (above) ships first; this adds e.g. GCSE-vs-KS3 tone/feature differences | M | 🟡 | ⬜ |
| **1.1** | **Teaching-concepts library (weave-on-generate)** — `teaching_concepts` table + `repos/concepts.ts` + `/concepts` admin (clone of the kit/equipment pattern) + `conceptItems()` spread into the four generation sites | Closes a gap: there is no place to bank cohort-level teaching ideas the AI should weave in; pure additive plumbing, empty library is a literal no-op | M | 🟠 | ✅ |
| **7** | **Guided cohort-access questions (no AI)** — a `group_courses.guided_access` JSONB questionnaire (VI→min font, short attention, reading age, EAL, dyslexia-friendly, low typing) on the per-class context editor + deterministic `accessConstraints.ts` deriving a cohort constraint **`context[]` item** spread into the class-scoped generators (`adapt_lesson`/`adapt_resources`) | Turns "min 18pt, shorter tasks" cohort needs into a constraint every class-targeted generation honours — deterministic, **no AI at all** (cleaner than a sentinel line in `teaching_context`) | S | 🟠 | ✅ |
| **1.2** | *(stretch)* **Weave concepts into an existing lesson** — `weave_concepts` feature reusing the `improve_master` propose-then-apply flow, instructed to rebalance within `duration_min` not lengthen | The harder half of idea 1; soft "don't lengthen" constraint needs smoke-testing before it's trusted | M | 🟡 | ⬜ |

### Wave 2 — Cost/depth control *(config layer, unblocks the expensive waves)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **5** | **Per-feature model selection** — `modelForFeature(feature, fallbackRole)` over `modelFor(role)`; an `AI_FEATURES` registry (17 features) + a per-feature picker in Settings → AI, restricted to the priced models (Opus/Sonnet/Haiku) so the cap stays accurate; overrides stored as registry-validated `ai_model_feature_<key>` keys | Backward-compatible (unset = today exactly); lands *before* the Opus reviewer so a feature can be dialled to Haiku/Sonnet, materially de-risking idea 4/8 cost. Decided 2026-06-14: per-feature, priced-models-only (provider refresh deferred) | M | 🟡 | ✅ |

### Wave 3 — Pace-aware sizing *(needs the tracker data in real use)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **2** | **Pace ratio → sizing directive** — pure `classifyPace()` over `occurrence_courses.progress_step` vs the planned-step count (`outlineSteps()`), surfaced as a cohort `paceItems()` in the `adapt_lesson` context | The tracker captured where a class gets to but never fed sizing. Gated hard: **≥2 samples, under-running only, a soft band (not a %), ratio capped, no-op otherwise** — a slow class now gets a "plan fewer activities, keep the duration" nudge | M | 🟡 | ✅ |

### Wave 3b — Smart capture *(idea 12 — user-requested; the manual-note sibling of email triage)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **12** | **Notes pop-up + AI auto-filing** — the 📝 Note button & the `n` shortcut open a modal anywhere; on save a new `note_route` feature (cheap) proposes **1–3** destinations (task / event / captured / general note), shown as **tick-to-confirm** cards before they're created via the existing `createTask` / `createEventFromIntake` / `fileCaptured` / `createNote` repos | A jotted note must currently be filed by hand. This is `email_triage`'s routing applied to **manual** input, extended to **multiple destinations**; reuses the whole triage apply-path, so the new work was the multi-destination schema + the modal + a confirm step | M | 🟠 | ✅ |
| **12** | *(safe default)* **Private toggle + general-notes fallback** — a 🔒 "keep private" toggle files the note as a flagged captured item (safeguarding register, **never sent to AI**); AI off / unsure / "just add" → straight into general notes. The pop-up always saves *somewhere* | The capture box can't lose what you typed, and a sensitive note is withheld from routing by the teacher's choice (the reliable point to decide it) | S | 🔴 | ✅ |

### Wave 4 — Coverage & document backbone *(the big rocks, strict order)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **10** | **Spec-point library + deterministic coverage map** — `course_spec_points` + `lesson_plan_spec_points` + a paste-import parser + an AI-free `schemeCoverage()` query + read-only coverage panel | Closes the biggest planning gap: "what must be covered" exists nowhere today. The first slice is **AI-free** and the durable backbone everything else builds on | L | 🟠 | ⬜ |
| **10** | **AI coverage authoring + gap-check** — `author_scheme@4` covers every spec point and emits a revision unit for exam courses; a cheap `coverage_check` critic maps uncovered points to likely lessons; edits that drop coverage warn inline (no AI) | Makes the AI author honour the source-of-truth and flags coverage loss on every later edit — teacher confirms each mapping | L | 🟡 | ⬜ |
| **9** | **Official course documents + text extraction** — `doc_role` tag on `resources` + `course_doc_text` sidecar + `docText.ts` (mammoth/pdfjs/Gotenberg fallback) + `courseDocItems()` into authoring | Lets the AI cite the *real* spec; the heaviest L (new deps, PDF extraction quirks). An enhancer that can later auto-seed idea 10, **not** a prerequisite for it | L | 🟡 | ⬜ |

### Wave 5 — AI reviewer *(unify ideas 8 + 4, cost-gated, build last)*

| # | Slice | Why it matters | Size | Pri | Status |
|---|---|---|---|---|---|
| **8** | **Untaught-review sweep (master scope)** — one `lesson_reviews` table (idea 8's FK schema), a `review_lesson` Opus feature, a per-unit sweep mirroring the `resources-ai` loop, advisory findings applied via the existing `apply-improvement` endpoint | The most actionable reviewer cut: critique not-yet-taught lessons against the latest info; off-by-default, cost-gated, never mutates the master until the teacher clicks Apply | M | 🟡 | ⬜ |
| **4** | *(stretch)* **Random spot-check sweep + scheme review + finding re-injection** — fold idea 4's `~1/3` schemes / `~1/6` lessons sampler, scheme-level `review_scheme`, and the "feed findings back to the cheap models" loop onto idea 8's table | The richer reviewer behaviours layered onto the shared store; expensive and the self-reference loop needs care, so it ships last | L | ⚪ | ⬜ |

**Recommended order.** Land **Wave 0** (the nav-model refactor — no AI, no migration, fixes a real
drift bug) and **idea 3** first: idea 3 is the highest priority-to-effort ratio in the set and the
endpoint it forces (registry-validated settings writes) pays forward to Waves 2/4/5. Then **idea 1.1
→ idea 7** on the same `context[]` seam, then **idea 5** so cost can be tuned before the Opus work.
**Idea 2** slots in once the tracker data is genuinely in daily use. The big rocks come last in
strict order: **idea 10's deterministic backbone → idea 10's AI authoring → idea 9 extraction →
idea 9 as a coverage seed**, then the **unified 8+4 reviewer** — built last because its Opus cost is
the main project risk and idea 5 is what lets you throttle it.

---

## 2. Data model — migration `0028`+ (next free number; `0027` was the Phase-10 `pupil_unit_signal` table)

Every one of the eleven designs independently proposed `0028` — there can be only one. **Assign
sequential numbers in build order**; the table below shows the build-order assignment, not eleven
collisions. Much of Phase 11 needs **no schema**: idea 3 (global base = two `settings` rows; the
per-course override (3b) rides the same dynamic registry-validated settings-key pattern as idea 5 —
no new table), idea 5 (dynamic `ai_model_feature_*` keys — priced models only, no catalog), ideas
6/11 (the configurable daily set in a `nav_daily` setting, theme prefs in `localStorage` / `settings`,
nav model in code), and idea 12 (smart capture writes to the existing task / event / captured / note
entities) add no core tables; idea 2 derives pace entirely at read time. The genuinely new tables, in
build order:

```
teaching_concepts             -- idea 1.1 (mig 0028): cohort teaching ideas to weave in
  id          BIGSERIAL PK
  course_id   BIGINT NULL REFERENCES courses(id) ON DELETE CASCADE   -- NULL = applies to all courses
  title       TEXT NOT NULL
  body        TEXT
  tags        TEXT
  active      BOOLEAN NOT NULL DEFAULT true     -- archive, never delete (no soft-delete convention)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- cohort/curriculum prose only; never about an individual pupil; rides context[] so redaction holds

group_courses.guided_access   -- idea 7 (mig 0029): ALTER ADD COLUMN guided_access JSONB
  -- optional questionnaire answers per class (counts/levels, never a named pupil) so the form pre-fills
  -- and is editable year-on-year; the DERIVED line lands in teaching_context, the raw answers stay here

course_spec_points            -- idea 10 (mig 0030): the source-of-truth for required coverage
  id            BIGSERIAL PK
  course_id     BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE
  code          TEXT NOT NULL                   -- e.g. an OCR J277 sub-statement code
  title         TEXT NOT NULL
  exam_weight   INT NULL
  active        BOOLEAN NOT NULL DEFAULT true
  display_order INT NOT NULL DEFAULT 0
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (course_id, code)
  -- cohort/curriculum reference data only; no pupil identity ever attached

lesson_plan_spec_points       -- idea 10 (mig 0030): many-to-many coverage mapping (deterministic read)
  lesson_plan_id BIGINT NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE
  spec_point_id  BIGINT NOT NULL REFERENCES course_spec_points(id) ON DELETE CASCADE
  source         TEXT NOT NULL DEFAULT 'teacher' CHECK (source IN ('teacher','ai'))
  PRIMARY KEY (lesson_plan_id, spec_point_id)
  -- schemeCoverage() LEFT JOINs points to this map; cloneSchemeNewVersion MUST copy these rows

resources.doc_role            -- idea 9 (mig 0031): ALTER ADD COLUMN doc_role TEXT
  CHECK (doc_role IS NULL OR doc_role IN ('spec','examiners_report','past_paper','reference'))
  -- orthogonal to kind; marks an authoritative reference doc, linked to a course via resource_links

course_doc_text               -- idea 9 (mig 0031): extracted plaintext sidecar (parse once)
  id          BIGSERIAL PK
  resource_id BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE
  version_id  BIGINT NOT NULL REFERENCES resource_versions(id) ON DELETE CASCADE
  content     TEXT NOT NULL
  char_count  INT NOT NULL
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (version_id)            -- one extraction per version; survives version bumps
  -- reference content only, never safeguarding-flagged; chunks still ride context[] redacted

lesson_reviews                 -- ideas 8 + 4 (mig 0032): ONE table, idea 8's FK schema
  id              BIGSERIAL PK
  lesson_plan_id  BIGINT NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE
  group_course_id BIGINT REFERENCES group_courses(id) ON DELETE CASCADE  -- NULL = master scope
  verdict         TEXT NOT NULL CHECK (verdict IN ('keep','tweak','rework'))
  findings        JSONB NOT NULL DEFAULT '[]'
  suggested_objectives TEXT
  suggested_outline    TEXT
  rationale       TEXT
  prompt_version  TEXT
  status          TEXT NOT NULL CHECK (status IN ('open','applied','dismissed')) DEFAULT 'open'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (lesson_plan_id, COALESCE(group_course_id, 0))   -- re-run upserts, never duplicates
  -- findings are cohort-level reviewer prose; no raw pupil data; applied via apply-improvement
```

**`lesson_reviews` is double-defined in the raw backlog and must be designed once.** Idea 4 proposed
a *polymorphic* `target_type/target_id` with no FK (orphan risk on delete); idea 8 proposed real FKs
with `ON DELETE CASCADE`, a `verdict` enum and per-class scope. **Adopt idea 8's schema** (strictly
richer) and treat idea 4's sampler, scheme-level review and re-injection as features layered on top —
they share this one table.

**Coverage versioning is the migration-sensitive trap.** `cloneSchemeNewVersion`
([schemes.ts](../app/src/repos/schemes.ts)) copies units/plans on a new draft year — it **must also
copy `lesson_plan_spec_points`**, or coverage silently resets to zero every September rollover and the
whole feature becomes quietly useless. The deterministic "this edit dropped coverage of X" warning
fires only on genuine structural mutations (`deletePlan`/`deleteUnit`), never on a title autosave that
keeps the join row — scope it tightly to avoid noisy toasts.

---

## 3. The AI boundary holds — every new AI touch goes through the one wrapper

The boundary is clean today and stays clean: nothing in Phase 11 adds a second SDK importer, and
nothing sends a pupil name, an individual profile, or a disclosure to the model. The new touches,
all through [client.ts](../app/src/llm/client.ts) with the same `withhold → redactNames →
containsRosterName egress-assert → audit`:

- **Ideas 3 / 1.1 / 7 / 10 / 9** add only **new `context[]` `RedactableItem` builders** spread into
  the existing planning arrays — `styleItems()`, `conceptItems()`, the idea-7 derived `[access]` line
  (via `groupContextItems()`), `specPointsItems()`, `courseDocItems()`. Each returns `[]` when empty
  (a literal no-op until the teacher enters data), carries cohort/curriculum prose only, and lands in
  `context[]` **never** the `system` string — so it inherits redaction/withholding/audit with no
  wrapper change.
- **Idea 1.2 `weave_concepts`** and **idea 10 `coverage_check`** are new feature labels via
  `callLLMStructured` — `weave_concepts` at `modelFor('plan')` like `improve_master`,
  `coverage_check` at `modelFor('cheap')` (Haiku) like `captured_categorise`. The audit row, cap
  gate and redaction apply automatically.
- **Idea 8/4 `review_lesson` / `review_scheme`** run at `modelFor('design')` (Opus), one structured
  call per target. Per-class reviews feed `recentGroupHistory`/`historyItems` — which already
  **withhold** safeguarding-flagged notes/feedback entirely, not merely redact them — plus the
  *anonymous* cohort `missesItem` `adapt_lesson` already uses. Findings are stored, never
  auto-applied.
- **Idea 5 adds no AI surface** — `modelForFeature()` just chooses which model id a feature hands to
  the existing wrapper; the picker offers a fixed, priced list (the live provider-refresh was dropped,
  §6 Q7).
- **Idea 12's `note_route`** is a new `callLLMStructured` feature (cheap model, like `email_triage` /
  `captured_categorise`): the typed note rides `context[]`, names are redacted, and a
  **safeguarding-flagged note is withheld from routing entirely** — filed straight to general notes
  (and the safeguarding register) instead, never sent. Routing only *proposes* destinations; the
  teacher confirms before anything is created.

**The cohort-prose rule is socially enforced (a UI hint), not code-enforced.** The teaching-concepts
body, standing prefs, guided-access answers and spec-point titles are free text that *could* contain
a pupil name — the `containsRosterName` egress assert is the real backstop and it holds precisely
because every one of them routes through `context[]`. A reviewer must enforce that none ever slips
into the `system` string (which bypasses redaction). See
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) and [DPIA.md](DPIA.md).

---

## 4. Testing

Per house convention — pure logic unit-tested (DB-free), data/route behaviour in the integration
suite (real dev DB on 5434, AI forced off). Per-idea:

- **3 / 1.1 / 7 / 10 / 9** — unit-test each pure builder/parser DB-free: empty input → `[]`/`null`
  (the no-op guarantee), populated input → the expected terse labelled item; `accessConstraints`
  (idea 7) and `specImport` (idea 10) get round-trip + cap-respected tests like `feedbackDigest.ts`.
- **2** — `classifyPace` unit tests: empty/low-sample → `null`, consistent under-run → `'over'`,
  over-completion → `'racing'`, boundary ratios, and ignoring zero-planned / no-`progress_step`
  samples.
- **10 (deterministic)** — integration: paste-import points, map a plan, assert `schemeCoverage`
  returns the right covered/uncovered split; delete a covering plan → the "dropped coverage" warning
  fires; **new-version clone carries the mappings** (the rollover trap).
- **8 (reviewer)** — integration: enqueue a per-unit sweep with AI off → it returns the wrapper's
  degrade message and writes **no** rows; a re-run upserts (does not duplicate); applying a master
  finding writes via `updatePlanField` and the master is untouched until the click.
- **Egress asserts** — every AI slice gets a context-screen test beside the existing redaction suite:
  no pupil name / no individual identity survives in any request, and idea 8's per-class history items
  are **withheld** (not merely redacted) when safeguarding-flagged.
- Integration suites stay **AI-free** (empty key forced); one live smoke per AI slice via a throwaway
  `app/scripts/X-smoke.ts` (self-cleaning, then deleted) — `weave_concepts`, `coverage_check`,
  `review_lesson`, and the idea-9 `upload→extract→courseDocItems→author_scheme` path.

---

## 5. Deliberately out of scope (parked, with reasons)

- **Anything multi-teacher** — per-teacher RBAC, cross-subject profiles, per-staff UI preferences:
  stays in [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md). Idea 11's "different teachers,
  different UIs" is satisfied for *this* single-teacher-per-instance app by per-browser `localStorage`
  + a per-instance `settings` default; a per-staff preference column waits for the multi-teacher work.
- **pgvector semantic retrieval over course docs** (idea 9 tail) — keyword/truncation retrieval ships
  first; revisit embeddings only if lexical retrieval surfaces irrelevant spec sections. The
  `course_doc_text` table is shaped to add a GIN/tsvector index later.
- **Reviewer finding re-injection into the cheap models** (idea 4 tail) — feeding Opus critique back
  into draft/adapt risks an over-correction loop and compounding stale findings; deferred until the
  base reviewer is proven, and then only `new`/`actioned` (never `dismissed`) findings feed back,
  capped and labelled advisory, marked stale on `updatePlanField`.
- **Scheduled/daily reviewer sweeps** (idea 4/8) — no in-app scheduler exists; manual-trigger first,
  matching the synchronous `resources-ai` loop, with an `hx-confirm` cost warning. A whole-scheme
  sweep that exceeds request timeouts is the cue to move to incremental-write + poll.
- **Structured feature toggles instead of free-text prefs** (idea 3) — free text first; add structure
  (retrieval-starter / exit-ticket toggles) only if the model ignores prose requests.
- **Auto-seeding spec points from uploaded docs** (idea 9 → idea 10) — idea 10 works fully via
  paste-import without idea 9; the auto-seed is an enhancer, not a dependency.
- **Smart capture → per-class teaching-context destination** (idea 12) — routing a note into a
  class's `teaching_context` needs resolving a specific `group_course` (class + course) from free
  text, which is ambiguous. v1 routes to task / event / captured / general note (exactly
  `email_triage`'s set); the teaching-context destination waits until there's a clean way to pick the
  class+course (e.g. a class picker in the modal).

---

## 6. Open questions for the teacher (before building Wave 0/1)

1. **Daily-vs-setup nav split (idea 6) — decided (2026-06-14): leaner five, but configurable.** The
   default daily set is the **leaner five** — Now, Focus, Timetable, Tasks, Captured — with everything
   else folded into "⚙ Setup & admin". **The split is teacher-configurable**: Settings gets a control
   to pick which links are always visible, stored as a `nav_daily` setting the `NAV_MODEL` reads, so
   the default can change without code. See Wave 0.
2. **Concept scope (idea 1) — decided (2026-06-14): course-scoped with optional global.** A concept is
   tied to one course or applies to all (`course_id` NULL); the AI weaves in the ones relevant to the
   lesson's course. v1 keeps plain active/archive — no per-concept "always include" flag.
3. **Standing-prefs scope (idea 3) — decided (2026-06-14): global base + per-course override.** Ship
   the **global** pair first (the S first slice, idea 3); add per-course overrides as a follow-on
   (idea 3b) that layers over the global base. Applies to planning/authoring features only, not the
   cheap triage features (`email_triage`, `captured_categorise`).
4. **Guided-access home (idea 7) — decided (2026-06-14): on `group_courses`.** Lives with the
   per-class `teaching_context` the generators already read; the September rollover wizard carries it
   forward (as it does adaptations), so it survives year-on-year. Still to confirm: the final question
   set (VI count→font, attention→task length, typing tolerance, reading age, EAL, dyslexia-friendly).
5. **Spec-point granularity & exam boundary (idea 10)** — seed full OCR J277 sub-statements
   (token-heavy) or topic-level headings (cheaper)? Where does the "leave space for revision"
   boundary come from — a new `courses.exam_date`, the academic-year end, or a prompt heuristic? Does
   coverage account for *delivery* (was the covering lesson taught) or plan-level mapping only for v1?
6. **PDF extraction approach (idea 9)** — `pdfjs-dist` (heavier, better layout) vs `pdf-parse`
   (simpler) vs routing through the existing Gotenberg sidecar then extracting? The "preview extracted
   text before use" control is essential, not optional, given multi-column spec PDFs.
7. **Per-feature model granularity (idea 5) — decided (2026-06-14): per-feature, priced models only.**
   All 17 features can override their model; the picker offers only ids in `PRICE_PENCE_PER_MTOK`
   (Opus/Sonnet/Haiku) so the spend cap stays meaningful. A provider "refresh model list" + selecting
   arbitrary ids is **deferred** (revisit if a model we want ships before we re-price).
8. **Reviewer cost posture (idea 8/4)** — manual-trigger only for v1 (recommended)? Skip targets that
   already have an `open` finding to avoid double-spend? It ships **off** behind `ai_review_enabled`
   either way, per the DPIA off-by-default posture.
9. **Smart capture (idea 12) — decided (2026-06-14) & built.** (a) **Confirm-before-create** — the
   pop-up shows tick-to-confirm cards; nothing is created until you click Create. (b) v1 destinations:
   **task / event / captured / general note** (per-class teaching-context deferred — see §5). (c) The
   `n` shortcut + the 📝 Note button open the modal **everywhere** (replacing the old `n`=inline-new-note);
   the inline new-note buttons on lesson/notes pages remain. (d) **≤3** destinations per note. Plus a
   teacher **🔒 keep-private** toggle that skips AI entirely (the reliable point to withhold a
   safeguarding note, since free text can't be pre-classified safely).

---

## Cross-cutting infrastructure (build once, many ideas consume)

These are the shared seams the per-idea designs all lean on. Building each **once** is what keeps the
backlog from becoming eleven parallel re-implementations.

- **The `context[]` `RedactableItem` builder seam** — ideas 1, 2, 3, 7, 8, 9, 10 all spread a pure
  builder into the *same* six call-site arrays ([schemes.ts](../app/src/routes/schemes.ts) ~L110/290/641,
  [lesson.ts](../app/src/routes/lesson.ts) ~L374/703/766). One convention: a terse leading label,
  returns `[]` when empty, cohort-prose only, lands in `context[]` never the `system` string. Consider
  a single `standingItems()` aggregator so the six sites don't each grow a separate spread line that
  one idea forgets to add.
- **The typed `NAV_MODEL` single source of truth** (ideas 6 + 11) — one extraction of the
  [html.ts](../app/src/lib/html.ts) nav string + the [app.js](../app/public/app.js) keyboard map into
  `nav.ts`, emitting the map as inline JSON so the two lists can never drift again.
- **A registry-validated settings-write endpoint** — idea 3 must widen the fixed 5-key `/settings/ai`
  Zod enum (capped at 100 chars); idea 3b writes per-course `ai_style_prefs_course_<id>` keys; idea 5
  writes free-form `ai_model_feature_<feature>` keys; ideas 6/4/8/9/10/11 add `nav_daily` /
  `ai_review_enabled` / `doc_role` / `ui_theme`. Writing arbitrary settings keys from the UI is a
  footgun — build **one** endpoint that validates `key` against a known registry (with per-key length
  caps, and an `_<id>`/`_<feature>` suffix pattern for the dynamic families) and route all of these
  through it.
- **The propose-then-apply flow** — `improve_master`'s `/lesson/plan/:id/apply-improvement` (writes
  via `updatePlanField`) is reused by idea 1.2 (`weave_concepts`) and idea 8 (apply-review to master
  via `updatePlanField`, to a class via `upsertAdaptation`). Reuse the endpoint and the panel pattern;
  do not build two parallel proposal UIs.
- **The `lesson_reviews` advisory store** — shared infra for the whole reviewer family (ideas 8 + 4);
  design the table once (idea 8's FK schema, see §2) before either ships.
- **The text-extraction pipeline** (`course_doc_text` + mammoth/pdfjs) — built by idea 9, later
  reusable to seed idea 10's spec points and to review against spec text. Build once.
- **Migration numbering** — assign `0028`, `0029`, `0030`… in build order (§2); they auto-run on boot
  and collide if two share a number.

---

## Recommended first slice

Ship **idea 3 (standing teacher style & feature instructions)** first. It is the highest
priority-to-effort ratio in the set: an **S** change that rides the already-proven `context[]`
builder seam, inherits redaction/withholding/audit with **zero** changes to the one wrapper, and
degrades to a literal no-op (byte-identical prompts and audit log) until the teacher types something.
Unlike ideas 1/2/7 it touches **no new table** and influences *every* planning feature at once, so
the teacher feels it immediately across drafts, adaptations, resources and scheme authoring. Its one
real piece of work — widening the fixed 5-key `/settings/ai` Zod enum into a registry-validated,
per-key-capped settings write — is exactly the cross-cutting endpoint ideas 5, 4, 8, 9 and 10 all
need anyway, so building it here pays forward.

Pair it immediately with the **Wave-0 `NAV_MODEL` extraction** (also no AI, no migration, and it
fixes a real existing drift bug between the rendered nav and the keyboard map) as a parallel chrome
track. Concretely: **Wave 0** = `NAV_MODEL` extraction (idea 11) → daily-vs-setup grouping (idea 6);
**Wave 1** = idea 3 → idea 1.1 → idea 7, all on the same `context[]` seam. Defer the big rocks
(the 10→9 coverage backbone, then the unified 8+4 reviewer) until that seam and the model-override
layer (idea 5) are settled, because the reviewer's Opus cost is the main project risk and idea 5 is
what lets you throttle it.

---

## Forward compatibility with the multi-teacher future

Nothing here pre-empts [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md). Standing prefs,
themes and per-feature model choice all live in single-instance `settings`/`localStorage`; when
multiple teacher accounts arrive they become per-staff rows without reshaping the feature. The
`context[]` builders are already cohort-scoped, so a future per-teacher style layer is just another
builder on the same seam. `course_spec_points` and `teaching_concepts` are course/cohort reference
data with no pupil identity, so they carry forward unchanged. The one thing to watch: idea 11's
"different teachers, different UIs" is satisfied today only per-browser — a genuine per-staff UI
preference is the multi-teacher project's job, not this one's.
