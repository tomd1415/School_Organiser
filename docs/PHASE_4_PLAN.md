# Phase 4 — AI assistance (detailed build plan)

Phase 4 turns the record built in Phases 1–3 into **planning leverage**: draft the next lesson,
redesign or author a scheme, summarise a term, break down a task, calibrate estimates, file
captured info — all through **one LLM wrapper** with a hard safeguarding boundary. AI is
**additive**: every screen still works with the provider offline.

Source material: [ROADMAP.md](ROADMAP.md) §"Phase 4", [SPECIFICATION.md](SPECIFICATION.md) §5.10
(+ §5.16–5.18), [ARCHITECTURE.md](ARCHITECTURE.md) §"LLM client", and — non-negotiable —
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) §"The pupil-name rule" and §"Safeguarding
content is withheld from AI".

---

## 0. What Phase 4 changes vs Phases 1–3

- A new **`llm/` client** is the **only** code that talks to a provider. Every feature calls it;
  nothing else imports the SDK. Default provider **Anthropic Claude**, provider/model in `settings`.
- Two structural guarantees live in that one place: **pupil names → tokens** (from
  `pupils.ai_token`) and **safeguarding-flagged content never sent at all**. Both are proven by
  tests that fail the build if a roster name or a flagged item could reach egress.
- A new **`ai_calls`** audit table stores only the **redacted** request + response + model +
  prompt version + token/cost — the record itself proves no name left the building.
- Features write their output **into the existing model as drafts** (a new `lesson_plans` row, a
  new scheme version via the 3.x clone, a new `resource_versions` row) so everything AI produces
  is **reviewable, versioned and reversible** — never an irreversible auto-edit.
- Already in place to build on: `pupils(ai_token)` and `settings(key,value)` tables exist; the
  **safeguarding flag** ships from Phase 2; **pgvector** is installed; the 2,433-resource store +
  schemes/plans give the AI real context.

---

## 1. Build order (each row a reviewable commit/PR)

| # | Increment | Why / depends on | Size |
|---|---|---|---|
| **4.1** | **LLM wrapper + `ai_calls` audit + settings** — redaction, withholding, tool-use structured output, graceful degradation | the safety core; everything depends on it | M |
| **4.2** | **Context builder + redaction/withholding tests** — assemble AI inputs (SoW, notes, tasks) with names tokenised and flagged items stripped | the boundary, exercised end-to-end | S |

> **Status (2026-06-10): 4.1–4.5, 4.7 + teaching-context built ✅; 4.6 partial.** Boundary: the
> `llm/` wrapper, `ai_calls` audit, names-only roster, redaction/withholding egress tests.
> **Live, all verified:** 4.3 draft-lesson (~0.7p), 4.4 author-scheme (~1.1p), **4.4.1 per-course
> teaching-context** auto-injected into every request (SEND default, editable), **4.5 term-summary**,
> **4.6 task-breakdown** (~0.1p), **4.7 AI resource-generation** → versioned Markdown (~0.8p). A
> **DPIA** is drafted (`docs/DPIA.md`). Remaining: **4.6** captured-categorise / estimate-calibration
> / current-interest (need data or steering); scheme **redesign**; 4.7 DOCX/PPTX rendering; optional
> **4.8** semantic search.
| **4.3** | **Draft next lesson** → a draft `lesson_plan` from SoW position + recent notes | first concrete win; needs 3.2/3.3 | M |
| **4.4** | **Author / redesign a scheme** → new scheme **version** (clone) from aims + Teach Computing context | the KS3 *"Effective use of computers in school"* win | M |
| **4.5** | **Summarise this term** for a group/course from accumulated notes | read-only; cheap | S |
| **4.6** | **Task breakdown + estimate calibration + captured auto-categorisation + current-interest** (the "manual now, AI later" hooks) | Haiku-cheap, structured; needs §5.16/5.17 data | M |
| **4.7** | **AI resource editing** — generate/revise → new `resource_versions` (Markdown/HTML first; DOCX/PPTX render a stretch) | hardest fidelity problem; isolate it | L |
| **4.8** | **(Optional, C) pgvector semantic search** over notes/resources | "when did I last teach recursion?" | M |

Ship strictly in order — **4.1 + 4.2 gate everything else** (no feature may call a provider until
the wrapper and its egress tests exist).

---

## 2. Migration `0007_phase4.sql` — schema

- **`ai_calls`** — the audit row: `id`, `created_at`, `feature` (e.g. `draft_lesson`), `provider`,
  `model`, `prompt_version`, `request_redacted` (jsonb — **redacted payload only**), `response`
  (jsonb/text), `input_tokens`, `output_tokens`, `cost_pence`, `status` (`ok`/`error`/`blocked`),
  `error`. No raw (un-redacted) request column exists — it is structurally impossible to log one.
- **`settings`** keys (rows, not columns): `ai_provider` (`anthropic`), `ai_model_plan`,
  `ai_model_design`, `ai_model_cheap`, `ai_enabled` (`true`/`false` kill-switch), `ai_month_cap_pence`.
- **`pupils.ai_token`** already exists — no change; the redactor reads it. (Roster population is the
  2.11 question — see §10.)
- **(4.8 only)** `note_embeddings` / `resource_embeddings` (`vector(N)` + source id), built only if
  semantic search is taken.

Migrations auto-run on boot (existing harness). One reversible forward migration.

---

## 3. The LLM client (`src/llm/`) — the safety core (4.1)

One entry point. Mirrors the `exam_questions` client structure (redaction + audit + provider swap),
implemented for Anthropic per the **`claude-api`** skill at build time.

```
src/llm/
  client.ts      # the only fetch() to a provider; redact → call → audit → re-expand
  redact.ts      # pupil names ↔ ai_token; safeguarding withholding
  context.ts     # assemble feature inputs (SoW, notes, tasks) — already redacted/filtered
  schemas/       # Zod schemas for structured output (one per feature)
  prompts/       # versioned prompt templates (prompt_version recorded in ai_calls)
```

`callLLM({ feature, model, system, input, schema })` does, in order:

1. **Withhold** — drop any input item flagged `safeguarding` (notes/captured). Not redacted —
   removed. A flagged item reaching this function is a test failure.
2. **Redact** — replace every `pupils.ai_token` roster name in the payload with its token. The
   payload that proceeds is the only thing that can be sent.
3. **Call** — Anthropic Messages API via the official **`@anthropic-ai/sdk`**, with **structured
   output** through `messages.parse()` + `output_config.format` (Zod schemas via `zodOutputFormat` —
   Zod is already a project dependency). Adaptive thinking + `effort` for heavy design; **prompt
   caching** for large repeated context (a scheme + recent notes). Model from `settings`.
4. **Audit** — write an `ai_calls` row with the **redacted** request, response, model, tokens, cost.
5. **Re-expand** — substitute tokens back to names **in the returned object, for display only**.

Cross-cutting: **kill-switch** (`ai_enabled=false` → every feature shows "AI is off"); **monthly
cap** (`ai_month_cap_pence` — refuse + warn past budget); **graceful degradation** (provider
unreachable → the AI panel shows a clear "unavailable", the rest of the app is untouched);
`ANTHROPIC_API_KEY` from `.env` (never committed).

**Models** (from ARCHITECTURE; confirm current ids via the `claude-api` skill): planning/authoring →
**Sonnet** (`claude-sonnet-4-6`); heavy curriculum design → **Opus** (`claude-opus-4-8`); cheap
categorisation/tagging → **Haiku** (`claude-haiku-4-5-...`).

---

## 4. Redaction + withholding, proven (4.2)

The boundary is only real if tested. `context.ts` builds each feature's input from the DB and is
the choke point where flagged items are excluded and the roster is tokenised.

**Tests that must exist and gate the build:**
- A payload containing a known roster `display_name` is **rejected or tokenised** before egress
  (assert on what `client.ts` would send, with a mocked provider).
- A note/captured item with `safeguarding=true` **never appears** in any assembled context.
- An `ai_calls` row never contains an un-redacted name (property test over generated payloads).
- Token → name re-expansion is display-only and round-trips.

The provider is **mocked in tests** (no network, no spend); only `client.ts` knows the real SDK.

---

## 5. Draft next lesson (4.3) — the first win

`PlanningAssistant.draftLesson(courseId, groupId)`:
- **Context:** the course's SoW position (next unbound/next-in-sequence plan), the last few lessons'
  notes (stopping point, follow-ups, plan changes), the unit's linked resources (titles).
- **Output (schema):** objectives, a lesson outline/activities, suggested resources, a duration.
- **Lands as:** a **draft `lesson_plans` row** (or fills an empty bound plan) the teacher edits in
  the existing schemes editor — never auto-published. "Draft with AI" button on the lesson/plan.

Smallest end-to-end proof that the wrapper + context + a real feature work. Sonnet.

---

## 6. Author / redesign a scheme (4.4) — the KS3 win

Two entry points, both producing a **new scheme version** via the existing 3.x clone (so the
current scheme is never overwritten):
- **Redesign:** current SoW + notes on what worked/didn't → re-sequenced/redesigned units+plans.
- **Author from scratch:** rough aims + Teach Computing context (from the resource store) → draft
  units/lessons — explicitly the unfinished **"Effective use of computers in school"** KS3 scheme.

Opus for the heavy design; outputs a draft scheme tree the teacher prunes. Prompt-cache the
Teach Computing context.

---

## 7. Summarise this term (4.5)

`PlanningAssistant.summariseTerm(courseId/groupId, range)` → a prose summary from accumulated
lesson notes (redacted). Read-only, cheap (Sonnet/Haiku), shown on the course/schemes screen.

---

## 8. The "manual now, AI later" hooks (4.6)

Each is a small, **structured, Haiku-cheap** call that fills a field the teacher can always
override — the manual versions already exist from Phase 2:
- **Task breakdown** (§5.12): a task → an ordered checklist of sub-steps, surfaced in focus mode.
- **Estimate calibration** (§5.16): from a task's type/tags/cognitive-load + **timed history**
  (`time_entries`), predict a duration; show predicted vs. the teacher's estimate.
- **Captured auto-categorisation** (§5.17): suggest a category for a captured item and a resurface
  context; **suggests** the safeguarding flag (and once flagged, the item is withheld forever).
- **Current-interest profile** (§5.18): a learned, **time-decaying** weight over what the teacher
  marks/opens/times, biasing focus mode + captured resurfacing. (Mostly arithmetic; AI optional.)

---

## 9. AI resource editing (4.7) — scoped carefully

The hardest part (ARCHITECTURE flags fidelity as open, OPEN_QUESTIONS Q14). Stage it:
- **First:** generate/revise **new** resources as Markdown/HTML → store as a `resources` row +
  `resource_versions` (the store already versions). Fully usable, low risk.
- **Stretch:** render structured content to **editable DOCX/PPTX** via a templating path (so
  worksheets stay pupil-editable and slides look acceptable). Treat as a separate spike — do not
  block 4.1–4.6 on it.

Every AI edit is a **new version** on an existing resource: reviewable, revertible.

---

## 10. Confirmations needed (before/at the relevant increment)

1. **API key + budget** — `ANTHROPIC_API_KEY` available? A sensible `ai_month_cap_pence`?
2. **The pupil-roster question (gates the redactor's reach).** `pupils.ai_token` exists but the
   roster is empty (2.11 deferred). The wrapper + tests can be built now against a **synthetic
   roster**, and the safeguarding withholding works today. But free-text **lesson notes could
   contain pupil names the redactor can't match without a roster.** Options, your call:
   - (a) **Recommended:** populate a **minimal names-only roster** (display_name + auto `ai_token`,
     no DPIA-heavy UI) as part of 4.2 so redaction is real — a small slice of 2.11's data layer.
   - (b) Keep pupils fully deferred; until then, **avoid pupil names in AI-bound notes**, and the
     AI features show a "review before sending" preview.
3. **First feature to build after 4.1/4.2** — recommend **4.3 Draft next lesson** (smallest win),
   or jump to **4.4** for the KS3 scheme you want to redesign.
4. **DPIA** — write `docs/DPIA.md` before any real pupil data is stored (per SECURITY_AND_PRIVACY).
   Not blocking the pupil-name-free features.
5. **Model choices / spend tier** — accept the Sonnet/Opus/Haiku split above, or constrain to one.

---

## 11. Test strategy

- **Egress/redaction tests are the priority** (§4) — they gate the build; provider always mocked.
- Each feature: a unit test on its **schema mapping** (provider response → DB draft) with a fixture
  response; an integration test that the **draft lands** (a plan/version/scheme row appears) and the
  screen renders the "draft with AI" affordance.
- A test that `ai_enabled=false` and provider-unreachable both degrade to a clean "unavailable",
  with the rest of the app working.
- No real API calls in `npm test` / `test:integration`.

---

## 12. Out of scope for Phase 4 (deferred, by design)

- **Pupil-name-dependent features** (e.g. per-pupil progress summaries) until the roster lands.
- Full **2.11 pupils UI + DPIA** beyond the minimal roster decided in §10.
- High-fidelity DOCX/PPTX generation beyond the 4.7 spike.
- Email intake v2, semantic search if 4.8 isn't taken — both Phase 5.

---

## 13. Recommended first slice

**4.1 + 4.2 together**: the `llm/` wrapper, `ai_calls` audit, `settings` keys, and the
redaction/withholding tests — i.e. build the *boundary* and prove it before a single feature.
Then **4.3 Draft next lesson** as the first user-visible win. Decide §10.2 (the roster) before 4.2,
since it sets how real the redactor is on day one.
