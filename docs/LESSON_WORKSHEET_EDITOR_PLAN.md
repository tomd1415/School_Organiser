# Implementation plan — in-place lesson & worksheet editing (noted_bugs.md #5)

> **Goal (from the bug list).** Make editing lessons and worksheets "literally in-place as seen in the
> browser." Worksheets need to **add/remove questions** with a **type picker**, capture the question (and
> options/answer for choice-like types), and **show the correct/model answers**.
>
> **Key finding: most of the editor already exists.** This is an *extend*, not a *build-from-scratch*. The
> plan below maps the real gaps. Storage does NOT change — the worksheet stays Markdown, answers stay in the
> mark scheme. Model on `QUESTION_TYPES_IMPLEMENTATION_PLAN.md`.

---

## 0. What already exists (don't rebuild)

- **Block editor.** `public/worksheetEditor.js` (309 lines) + `renderBlockEditor` + `/resources/:id/edit`
  render each instruction/question/heading/image as an **editable card**; you can reorder, change type,
  focus a level (🟢/🟡/🔴 / All), drag an image in (`/resources/:id/image`), **live-preview**
  (`POST /resources/:id/preview-blocks`) and **save** (`POST /resources/:id/edit-blocks`). A `?raw=1` link is
  the raw-markdown escape hatch. Slides (`kind='slides'`) use the same editor.
- **Block model.** `src/lib/worksheetBlocks.ts` — `parseBlocks(md) → Block[]`, `serialiseBlocks(blocks) → md`.
  The **contract** (oracle `tests/worksheetBlocks.test.ts`): `serialiseBlocks(parseBlocks(md))` yields
  Markdown whose `renderWorksheet().fields` are **identical** (same keys + kinds). Anything not modelled is
  kept verbatim as `raw`/`rawtable`, so the round-trip is always lossless.
- **Add-question palette** (`worksheetEditor.js` ~L259): already has + Instructions, + Question, + Multiple
  choice, + True/False, + Fill the blanks, + Matching, + Screenshot task, + Checklist, + Heading, + Note.
- **Marking / answers.** Correct answers live in the **mark scheme**, not the worksheet markdown:
  `upsertScheme(resourceId, versionNo, source, status, points)` where each point is
  `{ fieldKey, kind, expected, alternatives, marks, required }` keyed by the render-time field key
  (`t{n}.r{n}.c{n}`, `blank.{n}`, …). `deriveScheme` builds it with AI; `markObjective` marks against it.
  Ordering/grouping types (`parsons`/`order`/`sort`/`label`) carry their correct answer **in the markdown**
  (the fenced block's `solution`) and are checked in the mark modal.

## 1. The three real gaps

| Gap | Today | Want |
|---|---|---|
| **A. New question types in the block model** | `qtable` rows are only `text`/`screenshot`/`choice`; multichoice / fill-blank / code / parsons / order / sort / label / slider round-trip as opaque `raw`/`text` — not structurally editable | every supported type is a first-class, add-from-palette, editable block |
| **B. Model/correct answers in the editor** | the editor edits the *question* only; the answer lives in a separate mark scheme the teacher can't see/edit here | per-question **Answer** field; a "show model answers" toggle |
| **C. Lesson plan in-place editing** | plan objectives/outline are `<textarea>`s on the scheme page | edit the **rendered** objectives/outline in place |

---

## 2. Gap A — model every question type as an editable block

**Design.** Extend the `Block` union with a discriminated **`question` block** (or extend `qtable`) that
covers the engine's full type set, and make `parseBlocks`/`serialiseBlocks` round-trip each to the **canonical
markdown the engine already parses** (the fences/markers in `worksheetForm.ts`). The Markdown stays the source
of truth; the block is just the editor's structured view.

New block variants (round-trip target in parentheses — mirror `worksheetForm.ts` exactly):
- `multichoice` — a `qtable` row kind `multichoice` with `options` (`[  ] a [  ] b` cell).
- `cloze` — a `text`/`question` block carrying gap markers (`[[ ]]` in prose). (Palette "+ Fill the blanks"
  already inserts the markdown; make it a structured block so gaps + answers are editable.)
- `code` — a `qtable` row kind `code` (cell/header names code).
- `parsons` — `{ qtype:'parsons', lines:[…] }` (```` ```parsons ````).
- `order` — `{ qtype:'order', steps:[…] }` (```` ```order ````).
- `sort` — `{ qtype:'sort', categories:[{name, items:[…]}] }` (```` ```sort ````, `Category: a, b`).
- `label` — `{ qtype:'label', image:{{res:file}}, zones:[{id,x,y,label}] }` (```` ```label ````).
- `scale` — `{ qtype:'scale', min, max, minLabel?, maxLabel? }` (`[scale a-b: low … high]` cell).

**Contract:** for every new block, extend the **round-trip oracle** so `serialiseBlocks(parseBlocks(md))`
keeps `renderWorksheet().fields` identical (same keys/kinds) — this is the guard that the editor never breaks
auto-marking. `blockSchema` (zod) gets the new variants; `/edit-blocks` already validates with it.

**Editor (`worksheetEditor.js`):** add palette buttons (+ Order, + Card-sort, + Label a diagram, + Slider,
+ Code, + Parsons) and a per-type card UI:
- sort → category rows, each with an items list (add/remove).
- label → an image (reuse the drag-in `/image` upload) + a zone list (`id`, x%, y%, correct label); ideally a
  **click-the-image-to-capture x%,y%** helper (also the outstanding need from the question-types plan).
- order/parsons → an ordered list of steps/lines (add/remove/reorder — reuse the existing block reorder).
- scale → min/max + optional end labels.
- code → a monospace box + an optional starter.
`TYPE_LABEL` gets friendly names for each.

**Effort:** M–L (the block-model + oracle work is the careful part; the editor cards are mechanical). Ship
**one type at a time**, oracle green between.

## 3. Gap B — edit the correct / model answers in the editor

**Design.** Surface the **mark scheme** alongside the questions. Two answer homes (already true in the
engine), exposed in the editor:
- **In-markdown answers** (parsons/order/sort/label): the correct answer *is* the block content the teacher
  authors (the ordered steps, the category→items, the zone→label). The editor's "model answer" view just
  renders that back — no scheme write needed.
- **Scheme answers** (text/choice/multichoice/blank/numeric/code): add a per-question **Answer** input. On
  save, the server **re-renders** the serialised markdown to get the positional field keys, **zips** the
  editor's answers to those keys in document order, and `upsertScheme(resourceId, versionNo, 'manual', …)`.
  A "👁 show model answers" toggle reveals them read-only.

**Why re-render to map keys:** field keys are positional (`t{n}.r{n}.c{n}`, `blank.{n}`, …) and the editor
controls order, so rendering the saved markdown and walking `fields` in order gives a stable
block-row → fieldKey map without storing keys in the block. (Alternative: the editor mirrors the counter
logic client-side — more fragile; prefer server re-render.)

**New endpoints:** `GET /resources/:id/scheme` (current points, for the editor to load) and fold the answer
write into `POST /resources/:id/edit-blocks` (save markdown + scheme together, same version bump). Reuse
`upsertScheme`. The deterministic marker + mark modal already consume the scheme, so saved model answers
**immediately drive auto-marking** — a real bonus.

**Effort:** M. The mapping + scheme write is the new bit; the marker side is untouched.

## 4. Gap C — in-place lesson-plan editing

**Design.** On the scheme/lesson view, render objectives/outline as today but make the rendered block
**inline-editable** (a `contenteditable` region or an edit-on-click swap to the input) that saves via the
existing plan-save endpoint (`paths.schemesUnit`/plan save with `objectives`/`outline`). Keep the current
textarea as the fallback. This is the smaller, independent piece — do it first as a quick win.

**Effort:** S–M.

## 5. Storage & invariants (the spec)

- **No new storage.** Worksheet/slides = Markdown `resource` (versioned via `createResourceWithVersion`).
  Answers = mark-scheme rows (`upsertScheme`). Plan = `lesson_plans` columns. The block list is an in-memory
  editor representation; **Markdown stays the source of truth**, so auto-marking, slicing and transfer are
  unaffected.
- **Round-trip oracle is law.** Every block type must satisfy `serialiseBlocks(parseBlocks(md))` ⇒ identical
  `renderWorksheet().fields`. Extend `tests/worksheetBlocks.test.ts` for each new type before shipping it.
- **Field-key stability.** Editing order changes keys (positional) — that's expected on a deliberate edit
  (a re-version). The scheme is re-derived/zipped on save, so it stays aligned.
- **Escape hatch stays.** `?raw=1` raw-markdown editing remains for anything the block editor can't model.

## 6. Build order

1. **Lesson-plan in-place edit (Gap C)** — small, independent, immediately useful.
2. **Block-model + editor for the new question types (Gap A)** — one type at a time (order → sort → slider →
   code → parsons → label), oracle green each; label last (needs the coordinate-picker).
3. **Model-answer editing (Gap B)** — once the types are blocks, add the Answer field + scheme write + the
   show-answers toggle.

## 7. Tests

- **Round-trip** per new block type (the oracle) — the non-negotiable guard.
- **Parser/serialise** unit tests (markdown ⇄ block) per type.
- **Scheme write**: editor answers → `upsertScheme` points with the right field keys; then `markObjective`
  marks a sample answer correctly (ties the editor to real auto-marking).
- **Plan edit**: in-place save updates `lesson_plans` and re-renders.
- Keep the existing 1180 unit + 444 integration green.

## 8. Risks / call-outs

- The block-model extension is the main risk surface — the oracle contains it. Don't let a new block serialise
  to markdown the engine parses differently (that silently breaks marking).
- Label authoring needs coordinates — build the `/ui-gallery` (or in-editor) **click-to-capture x%,y%** helper
  alongside the label block (shared need with the question-types plan).
- This overlaps **#6 (adjust with AI)** and **#7 (wizard)** — the editor is where an AI-adjust result lands and
  where a wizard's output is refined. Build the editor first; #6/#7 plug into it.
