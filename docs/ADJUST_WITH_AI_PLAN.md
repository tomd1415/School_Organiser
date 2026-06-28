# Implementation plan — "Adjust with AI" (noted_bugs.md #6)

> **Goal (from the bug list).** On a lesson / worksheet / slide deck, let the teacher click **"Adjust with
> AI"**, write a few sentences about *what's wrong / what to improve*, and have the AI rewrite that artefact —
> targeting **either the class's copy or the master** (teacher's choice).
>
> This is a new AI **feature** on top of the existing privacy-safe wrapper. **No new AI plumbing** — it reuses
> `callLLM`, redaction/withholding/audit/budget, and the existing master-vs-class adaptation + resource
> versioning. The whole risk surface is **privacy** and **not silently overwriting the master**.

---

## 0. What already exists (reuse, don't rebuild)

- **The one AI wrapper** `src/llm/client.ts`: `callLLM(req)` / `callLLMStructured(req, schema)` where
  `LlmRequest = { feature, model, promptVersion?, system, context: RedactableItem[], instruction, maxTokens }`.
  It already, in order: gates on availability/budget → **withholds safeguarding-flagged** context →
  **redacts pupil names** (roster → tokens) → **egress-asserts** (refuses if a name survives) → reserves
  budget → calls the provider → **audits the redacted request**. Feature inputs belong in **`context[]`**,
  never the `system` string (so they inherit redaction/withholding/audit) — this is the project's
  non-negotiable rule (`CLAUDE.md`).
- **Existing AI features** prove the pattern: `draft_lesson`, `mark_scheme` (`deriveScheme`), `convert_unit`,
  the lesson **reviewer** (suggests → teacher applies/dismisses), slide generation. `modelForFeature(feature,
  tier)` picks the model.
- **Targets already exist:** a worksheet/slide is a versioned `resource` (`createResourceWithVersion`); a
  class has its **adaptation** of a lesson (the scheme page's class-compare + "⬆ Promote this class's version
  to master"). So "apply to master" = a new master resource version; "apply to this class" = the class
  adaptation.

## 1. User flow

1. **Entry point** — an **"✨ Adjust with AI"** affordance on:
   - a worksheet/slide (resource view + the block editor header), and
   - a lesson plan (scheme plan row + the cockpit lesson screen).
   Shown only when AI is enabled (Settings → AI); otherwise a muted "AI is off" hint (mirror the existing
   `📄 Generate resources` / `🔎 Review` gating).
2. **The form** — a small panel: a free-text box *"What should change? (what's wrong / what to improve)"* +
   a **target selector**: ◉ This class's copy / ○ Master (every class starts here). For a master-only artefact
   (no class context) the selector is fixed to Master.
3. **Confirm-gate** — submitting **generates a proposal, does not apply it**. The result is shown
   (rendered preview, and/or a before/after diff) with **Apply** / **Discard**. This mirrors the reviewer's
   "it suggests; you apply" — the AI never silently overwrites, especially the master.
4. **Apply** — writes the improved artefact to the chosen target (new master version, or the class
   adaptation), bumping the version. The audit row (redacted request) is already written by the wrapper.

## 2. The AI call (privacy-critical)

```ts
const res = await callLLM({
  feature: 'adjust_worksheet', // | 'adjust_slides' | 'adjust_lesson'  (audit label)
  model: await modelForFeature('adjust_worksheet', 'plan'),
  promptVersion: ADJUST_VERSION,
  system: ADJUST_SYSTEM,        // STATIC rules only — never any input goes here
  context: [
    { text: currentArtefactMarkdown },          // the worksheet/slide/plan to improve
    { text: cohortTeachingContext },            // course + class context — cohort-level prose only
  ],
  instruction: teacherFreeText,                 // "what's wrong / what to improve"
  maxTokens: 6000,
});
```

- **`system` (static):** the editing rules — the SEND teaching context summary; the **supported question
  types only** (`WORKSHEET_QUESTION_TYPES.md §1`) with their markdown; the format invariants (slides resource
  title ends `.md`, one `## ` per slide, `> 🧑‍🏫` notes; worksheet level sections `## 🟢/🟡/🔴`, a `📷`
  show-your-work, a `## ✅ I can…`); "return the FULL improved artefact as Markdown, change only what's asked,
  keep everything else." No pupil names, ever.
- **`context[]` (inputs):** the current artefact + the cohort context. Because they go through `context`, the
  wrapper redacts names, withholds safeguarding-flagged items, and audits — automatically.
- **`instruction`:** the teacher's sentences. Also redacted.
- **Never** put the artefact or instruction in `system` (that bypasses redaction/audit — forbidden).

## 3. Apply + validate

- **Validate before applying** (the AI can drift): render the returned Markdown —
  `renderWorksheet()` / slide deck parse (`sliceSlidesForLevel` + `splitTeacherNotes`) / plan parse — and
  check the invariants (worksheet has answerable fields + screenshot; slides parse with a `.md` title + notes;
  only supported question types). If it fails, show the result but warn / block apply (don't persist a broken
  lesson).
- **Write to the target:**
  - **Master** → `createResourceWithVersion` (new version of the master resource) / write `lesson_plans` for a
    plan. Reuse the same path `deriveScheme`/draft use.
  - **This class** → the class **adaptation** record (the same store behind the class-compare + promote flow).
- Re-derive the mark scheme if the worksheet's questions changed (call `deriveScheme`, or leave the existing
  scheme and flag "answers may need re-checking").

## 4. Storage & invariants

- **No new storage / no schema change.** Reuses resource versions, the adaptation store, `lesson_plans`, and
  the existing `ai_audit` rows. The improved artefact is just another version / adaptation.
- **Privacy invariants (hard):** inputs only via `context[]`/`instruction`; the wrapper's egress-assert
  refuses if any roster name survives; safeguarding-flagged content is withheld entirely; the teaching context
  is cohort-level prose (never an individual pupil). Tests must never hit the real API (integration config
  forces an empty key → the feature degrades to "AI unavailable").
- **No silent writes:** the confirm-gate is mandatory; master is never overwritten without an explicit Apply.

## 5. Build order

1. **`adjust_worksheet`** — most concrete + testable (worksheet markdown in, improved markdown out, validate,
   apply to class/master). Lands the wrapper feature, the form, the confirm-gate, the apply-to-target.
2. **`adjust_slides`** — same shape; validate slide-deck invariants.
3. **`adjust_lesson`** (plan objectives/outline) — same shape; smaller artefact.

## 6. Tests (never call the real API)

- **Request shape:** building an adjust request puts the artefact + instruction in `context`/`instruction`
  and **nothing input in `system`**; a planted roster name in the artefact is redacted before egress (reuse
  the redaction test harness).
- **Withholding:** a safeguarding-flagged context item is dropped.
- **Unavailable path:** with the key empty (integration default), the feature returns the "AI is off / couldn't
  adjust" message and writes nothing.
- **Apply routing:** master target → new master version; class target → the class adaptation (no master
  change). Confirm-gate: generating does not write; only Apply writes.
- **Validation:** a malformed AI result (e.g. a slide deck whose title doesn't end `.md`, or an unsupported
  question type) is rejected/flagged, not persisted.

## 7. Risks / call-outs

- **Privacy is the whole game** — the only safe path is the wrapper with inputs in `context[]`. A reviewer
  should check no input ever reaches `system` and that the egress-assert path is exercised by a test.
- **Confirm-gate + validate** prevent a bad or silent overwrite of a working lesson (especially the master).
- **Overlap:** this is the natural partner of **#5** (the adjusted result lands in the in-place editor for a
  final human tweak) and **#7** (a wizard could call the same feature). Build #6 to *return Markdown the
  editor can open*, so the three compose.
