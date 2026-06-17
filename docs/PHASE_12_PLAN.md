# Phase 12 — Content-rich worksheets, zero-friction pupils, and the deferred tail

> **Status (2026-06-17): in progress.** ✅ A1–A3 (save confirmation, live saving state, narrow-screen
> Slides/Worksheet toggle); ✅ B1–B4 (the lesson's prepared materials now feed worksheet generation +
> per-class adaptation + unit conversion, with a default-on consent toggle that lists which files are
> used); ✅ B5.1 (OCR GCSE exam-style question weighting by proximity to exams — KS3 unchanged, exam
> questions appear more as a cohort nears its GCSEs, using shapes that already auto-/AI-mark).
> **Remaining:** A4–A7, B5.2 (bespoke render widgets — trace/truth tables — + levels-of-response
> banded marking + numeric-scheme derivation), C, D, E. Suite green throughout (419 unit / 259 integration).
>
> Completes the "What's next" backlog after the pupil-UI
> worksheet overhaul (CHANGELOG 2026-06-15). Adds one new requirement from the teacher: **worksheets
> must use all of a lesson's prepared materials to contribute to the sheet**, and **presentation /
> usability for pupils is the overriding priority — remove as much friction as possible.**

**Guiding principle:** presentation and usability come first. Every slice is judged by "does this
make the sheet easier and calmer for a pupil to use, and does it look good?" Backend richness only
counts if it produces a clearer sheet.

**Standing constraints (unchanged — see [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md), CLAUDE.md):**
no pupil name reaches any AI service; safeguarding-flagged content is withheld entirely; every feature
input rides the wrapper's `context[]` (redact → withhold → egress-assert → audit); extracted material
is **teacher-previewed before spend** (the existing `docText` convention); tests never call the real
API; the user commits between sessions.

**Two grounding facts that shape the plan:**

1. **Text extraction already exists** — [app/src/lib/docText.ts](../app/src/lib/docText.ts) pulls text
   from PDF / docx / pptx / odt (Office via the Gotenberg sidecar → PDF → pdfjs) and plain files, and
   is already used for course documents with a "always previewed" convention. It is simply **not yet
   wired into worksheet generation or unit conversion.** So the new "use all lesson materials"
   requirement and the deferred 5.9 *content-based conversion* are the **same engine at two call
   sites**.
2. **Image carry-over already exists** — [app/src/services/sourceImages.ts](../app/src/services/sourceImages.ts)
   mines embedded images from linked Office files into generation. Text is the missing half.

---

## Workstream A — Pupil usability & presentation *(highest priority)*

Mostly client-side / CSS, migration-free, independently shippable.

| # | Slice | Friction it removes | Size |
|---|---|---|---|
| **A1** | **Consistent save confirmation on every field type.** Today only text & blank show "saved ✓"; choice, matching, checkbox and the feedback widget save silently ([worksheetForm.ts](../app/src/lib/worksheetForm.ts), [me.ts](../app/src/routes/me.ts)). Add the same animated tick + `aria-live` everywhere a pupil's action is captured. | S |
| **A2** | **"Saving… → saved ✓" state, not just a late tick.** The 600 ms text debounce reads as a dead pause; show an immediate "saving…" then "saved ✓". | S |
| **A3** | **Narrow-screen worksheet-first toggle.** On ≤960 px the two panes stack with slides on top, so a pupil scrolls past the whole deck to reach the question. Add a sticky **Slides / Worksheet** segmented toggle + a "jump to my work" affordance. | S–M |
| **A4** | **Per-element read-aloud buttons.** Read-aloud is a global "toggle then tap text" mode; add an inline 🔊 on each question/instruction so a pupil hears *this* prompt in one tap. | S–M |
| **A5** | **First-run micro-tour + calmer empty/loading states.** A dismissible one-time "here's how this page works" + friendly skeletons instead of abrupt swaps. | M |
| **A6** | **Presentation pass on the generated sheet itself.** Typography, spacing, one-idea-per-card rhythm; verified at every a11y setting (large text / dyslexia / high-contrast / dark). | M |
| **A7** | **Generation prompt tuned for usability.** Bias `lesson_resources` / `adapt_resources` toward short instructions, plain level-matched language, consistent scaffolding, low cognitive load — so sheets are *born* easy. (Lands with Workstream B's prompt bump.) | S |

**Tests:** render-path integration (every field type emits a save indicator; toggle present ≤960 px;
per-question speaker buttons present); the block round-trip stays green; a manual pass at each a11y
setting.

---

## Workstream B — Content-rich worksheets *(new requirement + 5.9 content-based conversion, unified)*

One extraction engine, three call sites.

- **B1 — `lessonMaterialText(planId | adaptationId)` helper.** Enumerate the lesson's linked resources
  (`listResourcesForPlan` / `listResourcesForAdaptation` / `listSourceFilesForUnit` in
  [repos/resources.ts](../app/src/repos/resources.ts)), pull text via [docText.ts](../app/src/lib/docText.ts),
  **cap per-file (~2–4k) and total (~10k)**, skip AI-generated docs (no feedback loop) and images
  (already handled), fall back to structure-only on any extraction failure. **M.**
- **B2 — Feed it into worksheet generation.** Add one `context[]` item — *"LESSON MATERIALS ALREADY
  PREPARED — base the worksheet on these; reuse their examples, vocabulary and tasks so the sheet
  matches what's on the board"* — to `lesson_resources` (`@11→@12`) and `adapt_resources` (`@9→@10`).
  Empty materials ⇒ no item (behaviour unchanged). **S–M.**
- **B3 — Content-based conversion (the 5.9 item).** Feed the same extracted text into `convert_unit`
  (`@2→@3`) so conversion reworks the *real* content, not just filenames. **S** once B1 exists.
- **B4 — Teacher preview & consent.** Before spend, show which files were read + a char count + a "use
  my materials" toggle (default on), honouring the `docText` "always previewed" rule. Inherits
  redaction/withholding/audit via `context[]`. **M.**
- **B5 — OCR GCSE Computer Science exam question types, weighted by proximity to GCSE.** Every question
  shape used in the **OCR GCSE CS (J277) exam papers** must be generatable and auto-/AI-markable —
  extending the four closed types already built (MC / true-false / matching / fill-in-the-blanks) with:
  - **short-answer recall** ("state", "identify", "give") — 1–2 mark `keyword`/`exact` marking;
  - **describe / explain** (2–4 mark open answers, AI-marked against point-based schemes);
  - **extended / "discuss"** (6–8 mark, **levels-of-response** mark scheme — AI-marked, banded);
  - **calculations / conversions** (binary ↔ denary ↔ hex, data-size, ranges) — `numeric` marking;
  - **trace tables** (complete-the-table given an algorithm) — table of `exact` cells;
  - **pseudocode / code completion** (OCR Exam Reference Language) — open answer, AI-marked on logic;
  - **truth tables & Boolean / logic-gate** questions — `exact`/`choice` cells.

  These reuse the existing `t.r.c` key model and marking kinds (`exact`/`keyword`/`numeric`/`choice`)
  plus the open-answer AI marker where a deterministic kind can't apply, so most are render/prompt work,
  not new marking infrastructure. **Weighting:** the generator should pick these exam-style shapes
  **more frequently the closer a cohort is to its GCSE exams** (Years 11–12) and lean on friendlier
  closed/scaffolded shapes for younger KS3 groups — driven off a per-course/per-group "proximity to
  GCSE" signal (year group / exam date) injected via `context[]`, with the level-slicing (🟢🟡🔴) still
  honouring usability (Workstream A) so an exam-style question is never a wall of text for a pupil who
  needs scaffolding. **Size: L** (one new prompt contract + a few render widgets — trace/truth tables,
  banded-mark open answers — landed incrementally; each shape ships with marking tests). Builds on
  B1–B4 (real materials make the generated exam questions match the taught content).

**Privacy:** lesson materials are teaching content, not pupil data, but still pass the one boundary —
a stray name is tokenised, a safeguarding-flagged doc withheld. **Tests:** capping / skip-AI /
empty-list units; prompt-builder unit asserting the material item appears when materials exist;
degrade test (no key ⇒ nothing written); one live smoke per call site (throwaway, self-cleaning).

---

## Workstream C — Remaining Phase 5.9 curriculum stretch

- **C1 — Kit-per-lesson linkage.** A "kit needed" line on lesson plans (free text or picked from
  `/kit`), shown on the lesson screen and the map, plus a lay-down summary. *Small migration.* **M.**
- **C2 — Cross-group compare.** One master lesson, each group's adaptation side-by-side (read-only
  diff), with "promote this group's version" pre-filling the existing 5.5b apply. Migration-free. **M.**
- **C3 — Niceties.** Convert de-dup by source folder, kit CSV import, map drag-to-shift. **S each, optional.**

---

## Workstream D — Phase 4 leftovers

*(4.6 captured auto-categorisation already shipped as 10.17 — dropped from the list.)*

- **D1 — AI estimate calibration** from timed task history (no pupil data; arithmetic + cheap model). **M.**
- **D2 — Time-decaying "current interest" profile** biasing what surfaces. *Likely small migration.* **M.**
- **D3 — (Optional) pgvector semantic search** over notes/resources (4.8). Only if keyword search proves
  insufficient. **L.**

---

## Workstream E — Phase 11 deferred idea-4 reviewer tail

Whole-curriculum spot-check + scheme-level review + finding re-injection. **The project's named #1 cost
risk (Opus spend).** Keep **gated and last**: built only behind the existing off-by-default
`ai_review_enabled`, defaulting to the cheaper Planning model, with the per-call cap-estimate guard in
[client.ts](../app/src/llm/client.ts). **L.**

*(Multi-teacher v2 stays parked and unscheduled — see [PHASE_MULTI_TEACHER_PLAN.md](PHASE_MULTI_TEACHER_PLAN.md).)*

---

## Suggested order

**A1–A3** (instant friction wins) → **B1–B4** (content-rich + conversion, the headline) → **A4–A7**
(deeper usability + generation quality, lands with B's prompt bump) → **C1–C2** → **D1–D2** → **E**
(gated, last) → C3 / D3 niceties as time allows.

Each slice ends with the suite green (`npm test` + `npm run test:integration` + `npm run typecheck`)
and, for AI slices, a throwaway self-cleaning smoke against a real key.
