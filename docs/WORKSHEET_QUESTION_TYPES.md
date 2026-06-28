# Worksheet question types — available + backlog

> **Purpose.** Two jobs: (1) the **reference** of question/answer types the worksheet engine supports today
> (so a conversion uses only real ones — see [LESSON_CONVERSION_GUIDE.md](LESSON_CONVERSION_GUIDE.md)); and
> (2) a **living backlog** of question types a lesson *wanted* but the system can't do yet. When a backlog
> type is built, come back here, tick it off, and update the worksheets listed against it.
>
> Engine: `app/src/lib/worksheetForm.ts` (+ `worksheetBlocks.ts`). A question lives in a Markdown table cell
> or a fenced block; the answer kind is detected from the cell text / markers.

---

## 1. Available types (use these freely)

| Type | What the pupil does | Markdown trigger | Marking |
|---|---|---|---|
| **Text** | types a short/long answer | cell text `Type your answer here` (or any non-marker cell) | open / AI or keyword |
| **Multiple choice** *(single-select)* | picks **one** option (radio) | cell with **≥2** `(  )` markers: `(  ) loop (  ) input (  ) button` | objective (auto) |
| **Multi-select** *(tick all that apply)* | ticks **several** options (checkboxes) | cell with **≥2** `[  ]` markers: `[  ] buttons [  ] microphone [  ] the screen` | objective (the SET, auto) |
| **Matching** *(term ↔ definition)* | picks the match per row | a 2-column table where **every** answer cell is the SAME `(  )`-choice over the option pool | objective (per row) |
| **Fill-in-the-blank** | types into an inline gap | `[[ ]]` in the text (one per gap) | objective (auto) |
| **Code** | writes/edits code (monospaced box) | cell/header names code: `Type your code here`, "program", "script", "pseudocode", "algorithm" | open |
| **Parsons** *(order CODE)* | drags jumbled **code** lines into order | a fenced ```` ```parsons ```` block with the lines | objective (correct order) |
| **Order** *(sequence, non-code)* | drags plain-language **steps** into order | a fenced ```` ```order ```` block, one step per line in CORRECT order | self-marked (modal: correct order + ✓ badge) |
| **Card-sort** *(group into categories)* | drags items into category columns | a fenced ```` ```sort ```` block, one `Category: item, item` line per group | self-marked (modal: correct group + ✓ badge per item) |
| **Label a diagram** | drags labels onto spots on an image | a fenced ```` ```label ```` block: `image: {{res:file}}` then `zoneId (x%, y%): correct label` per spot | self-marked (modal: correct label + ✓ badge per zone) |
| **Slider / rating** | drags a 1–N scale | an answer cell `[scale 1-5]` or `[scale 1-5: low … high]` | uncredited self-assessment |
| **Screenshot / upload** | pastes or drops an image of their work | cell with `📷`/`🖼` or "paste … screenshot/image/work …" or "screenshot … here" | teacher view (PII) |
| **Checklist** | self-ticks success criteria | `- [ ] …` lines (usually under `## ✅ I can…`) | self-assessment (not credited) |

Plus prose, tables, headings, images and callouts render but are inert. Level differentiation = `## 🟢
Support` / `## 🟡 Core` / `## 🔴 Challenge` sections (auto-sliced per pupil; never labelled).

---

## 2. Backlog — question types a lesson wanted but the system can't do yet

> **Implementation plan + storage spec for all four below:** [QUESTION_TYPES_IMPLEMENTATION_PLAN.md](QUESTION_TYPES_IMPLEMENTATION_PLAN.md)
> — authoring syntax, the per-field storage encoding (no DB change), marking, render/client, build order.
>
> **Teacher's steer: prefer ADDING a type over reducing question variety.** When a lesson wants a type that
> isn't built, build it (it keeps the variety) rather than dumbing the question down. Until it's built, see
> the §3 stop-gap — but the default is *add the type*.
>
> Status legend: **NOT BUILT** / **BUILT (date)**. When you build one: flip the status, move it up to §1,
> then update each worksheet under "wants it" and re-run the alignment check (LESSON_CONVERSION_GUIDE.md §7a).

### ✅ Built / already-available (moved to §1)
- **Multi-select ("tick all that apply")** — **BUILT 2026-06-27** (`[  ] a [  ] b` cell → checkboxes,
  set-marked). *Updated worksheet:* `micro:bit countdown — starter worksheet` (the inputs question is now a
  real multi-select).
- **Matching (term ↔ definition)** — **already available** (a 2-column choice grid; `detectMatching`) — was
  never actually missing.
- **Order / sequence (non-code)** — **BUILT 2026-06-27** (§2.3) — ```` ```order ```` block, see §1.
- **Card sort / group into categories** — **BUILT 2026-06-27** (§2.5) — ```` ```sort ```` block, see §1.
- **Label a diagram / image hotspot** — **BUILT 2026-06-27** (§2.4) — ```` ```label ```` block, see §1.
  (Coordinates are hand-set for now — a `/ui-gallery` click-to-capture picker is the recommended next helper
  before mass-authoring labels.)
- **Slider / rating scale** — **BUILT 2026-06-27** (§2.6) — `[scale 1-5: low … high]` cell, see §1.

All four backlog types below are now built; the sub-sections are kept only as the design record. Storage +
build detail: [QUESTION_TYPES_IMPLEMENTATION_PLAN.md](QUESTION_TYPES_IMPLEMENTATION_PLAN.md).

> **Validation (2026-06-27):** the whole Year-8 batch (6 units / 36 lessons) converted with **zero new
> type-gaps** — the four types above covered all the demand the Y7 batch had logged (Y8 used order=15,
> card-sort=142 items, label=22 zones, slider=10). Years 9 + GCSE then surfaced ONE new wanted type (§2.7).

### 2.7 Interactive trace table  — **NOT BUILT**
- **What.** A fillable GRID where the pupil records how variables change as code runs (line | var1 | var2 |
  output), each cell auto-marked against the expected trace. Today these are done as a screenshot
  show-your-work or broken into separate fill-blank cells.
- **Why.** Tracing is a core GCSE/KS3 programming skill (OCR J277, "trace tables"); a real grid that
  auto-marks would save a lot of teacher marking and give pupils immediate feedback.
- **Example.** Trace `for i in range(3): total = total + i` — rows for each iteration, columns `i`, `total`.
- **Wants it:** **GCSE Algorithms 1** (tracing), **GCSE Programming 3 — iteration** (loop traces), GCSE
  Programming 2 (selection traces), KS3 Y8 Scratch / Python traces. (Stop-gapped with screenshot + fill-blank.)
- **Likely build.** Extend the existing trace/truth-table grid render (`isGrid` in `worksheetForm.ts` already
  makes ≥3-col answer tables compact-input grids) with per-cell expected values + a `trace` block syntax, then
  mark each cell `exact`/`numeric`. The storage is already per-cell `t{n}.r{n}.c{n}` text — so, like the
  others, **no storage change**; it's a marking-scheme + authoring-syntax addition.

### 2.3 Order / sequence (non-code)  — **BUILT 2026-06-27 (see §1)**
- **What.** Drag plain-text steps into the right order (Parsons but for **words/steps**, not code).
- **Why.** "order" is in the teaching context; e.g. order the steps of an algorithm in plain English, or a
  process (boot sequence, the data-packet journey).
- **Example.** Order: *set a start value → repeat → show the number → change the value → stop*.
- **Wants it:** `micro:bit countdown` (sequence the countdown steps); **Y7 Networks** L1 (semaphore/relay
  message order), L4 (the packet's journey); **Y7 Clear messaging** L2/L6 (poster-making / presenting steps);
  **Y7 Spreadsheets** (make-a-chart / autofill steps); **Y7 Using media** L1/L2 (word-processing / licensing
  steps). (Code ordering is already covered by Parsons — this is for prose/process steps.)
- **Likely build.** Generalise the `parsons` block to a `steps`/`order` block over prose lines.

### 2.4 Label a diagram / image hotspot  — **BUILT 2026-06-27 (see §1)**
- **What.** Drag labels onto a picture (or click hotspots): label the parts of a computer / the micro:bit.
- **Why.** "label" is in the teaching context; strongly visual, near-zero writing — ideal for SEND.
- **Example.** Label the micro:bit: *button A · button B · LED display · USB · pins*.
- **Wants it:** `micro:bit countdown — starter` (label the inputs); **Y7 Networks** L2/L4 (label network
  hardware / a labelled packet); **Y7 Clear messaging** L1/L3 (label parts of a good poster / a logo);
  **Y7 Using media** L1 (label the word-processor toolbar); any hardware/parts lesson.
- **Likely build.** An image block with positioned drop-zones + a label bank; mark = label in the right zone.
  (Biggest build — needs an image-coordinate authoring step.)

### 2.5 Card sort / group into categories  — **BUILT 2026-06-27 (see §1)**
- **What.** Drag items into named groups/columns.
- **Why.** "drag" is in the teaching context; classic CS activity (input vs output vs storage; hardware vs
  software).
- **Example.** Sort into **Input / Output**: button, LED, microphone, speaker.
- **Wants it:** KS3 computing-systems lessons; the micro:bit inputs/outputs idea; **Y7 Networks** L3
  (wired-vs-wireless scenarios, bandwidth bands); **Y7 Clear messaging** L4 (branding-vs-content);
  **Y7 Spreadsheets** L3 (primary-vs-secondary data); **Y7 Scratch II** L9/L10 (choose-the-loop / list ops);
  **Y7 Using media** L2/L3 (licence types, credible-vs-not sources).
- **Likely build.** A `sort` block: items + category columns; mark = each item in the right column.

### 2.6 Slider / rating scale  — **BUILT 2026-06-27 (see §1)** (low priority)
- **What.** Drag a slider on a scale (e.g. confidence 1–5, or estimate a value).
- **Why.** Low-stakes self-rating / estimation; minimal writing.
- **Example.** *"How confident are you with loops?"* 1–5.
- **Wants it:** plenaries / self-assessment across lessons; **Y7 Scratch I** L6 ("you're hired" 3-point skill
  rating); **Y7 Scratch II** & **Y7 Using media** plenaries (currently stop-gapped with the ✅ checklist).
- **Likely build.** A `scale` field (range input), stored as a number; uncredited or compared to a range.

---

## 3. Stop-gap rule (only until you build the type)

**Default = build the type** (§2 steer). The stop-gap is only for when you can't build it in the same pass:
(a) reframe to a supported type that's still pedagogically sound (e.g. several yes/no rows), or (b) leave a
plain text/answer box — **and add the worksheet to the relevant §2 item** so it's revisited once the type
lands. Never use a single-radio `choice` for a multi-correct question (it can't be answered) — use the
multi-select type instead (now built).

---

## 4. Image-gap log — places an image would help but none was found

The teacher is concerned about a **lack of images**. When converting a lesson, if a slide/worksheet **would
benefit from an image** and you can't find a suitable one (no usable image in the source `.pptx`/`.docx`, or
the source image is too specific/low-quality), **record it here** so an image can be sourced or made later.
Embedding found images is in [LESSON_CONVERSION_GUIDE.md §3a](LESSON_CONVERSION_GUIDE.md).

| Lesson / scheme | Where (slide / worksheet section) | What image is wanted | Source had one? |
|---|---|---|---|
| KS3 Y7 U1 L1 micro:bit countdown | starter slide + worksheet | the micro:bit v2 board (inputs) | ✅ used `image12.png` from the source deck |
| KS3 Y7 U1 L1 micro:bit countdown | "for loop" slide | a side-by-side "many blocks vs one for-loop" diagram | ✅ in source deck (not yet embedded — candidate) |
| KS3 Y7 U1 L2 basketball throw | starter + investigate slides | a basketball-throw / accelerometer-axes diagram | ⚠️ **not yet checked / sourced** — record on next pass |
| KS3 Y7 U2 Clear messaging | L5 content slide; L6 plenary; L3/L4 logo | before/after content, apps-used icon strip, logo before/after still | ⚠️ design lessons — source had no clean still |
| KS3 Y7 U3 Networks | L1–L6 diagram slides | relay/semaphore, network topology, **labelled packet**, router-mesh, internet-vs-WWW contrast, URL anatomy | ⚠️ source diagrams are PowerPoint **shapes**, not extractable rasters — embedded the available photos/icons |
| KS3 Y7 U4 Scratch I | L1 Frère Jacques block-stack; L5 Grace Hopper | clean Scratch block-stack still (source was animated GIF, omitted per no-animation); moth/bug photo | ⚠️ 8 of 9 source screenshots embedded; 2 soft gaps |
| KS3 Y7 U5 Spreadsheets | L1 cell grid; L2 formula bar; L4/L5 function results; L6 conditional formatting | real spreadsheet **screenshots** (source decks are mostly clipart) | ⚠️ only 1 genuine screenshot in source; embedded analogy visuals instead |
| KS3 Y7 U6 Scratch II | L11/L12 translate blocks; L8/L9 minor | clean `translate`-block code screenshot | ⚠️ none clean in source — wrote the blocks as Parsons + reused languages photo |
| KS3 Y7 U7 Using media | L1 before/after formatting; L2 CC-licences chart; L6 finished blog | formatting comparison, all-6-CC-licences chart, example finished blog | ⚠️ embedded 7 OGL images; 3 still wanted |
| KS3 Y8 U1 Vector graphics | L1–L5 editor stills | annotated handles/nodes, align before/after, markup↔preview | ⚠️ source = animated Inkscape GIFs (excluded per no-animation) — re-shoot as stills |
| KS3 Y8 U2 Computing systems | L1–L5 | Antikythera still, system-monitor still, logic-gate symbols chart, AI-examples strip | ⚠️ embedded OGL alternatives + 3 system-monitor videos |
| KS3 Y8 U3 Web | L3 inline-vs-CSS; L5 AND/OR/NOT | comparison + boolean-operator diagram | ⚠️ source had only PPT shapes / decorative photos |
| KS3 Y8 U4 Representations | L4 blank place-value grid (for a **label** widget); L3 doubling; L6 puzzle art | a CLEAN unlabelled binary place-value grid | ⚠️ source coins have values pre-printed — a blank grid would unlock a label-the-place-values task |
| KS3 Y8 U5 Mobile app | L6 second-screen; L3 phone internals | a phone-internals diagram + a 2nd-screen still | ⚠️ used a generic circuit-board photo + reused L5 |
| KS3 Y8 U6 Python | L1–L6 | flow-chart / variable-trace / TypeError stills | ⚠️ source diagrams are non-rasterisable PPT shapes/animations |
| GCSE U2 Computer systems pt2 | L10 logic gates — activity/slides | a CLEAN unlabelled AND/OR/NOT **gate-symbol** image (to unlock a `label` drag-the-name task) | ⚠️ source draws the symbols as **PPT vector shapes**, not rasters — `extractOfficeImages` gets none; stop-gapped with matching + card-sort + truth-table tick grids |
| GCSE U2 Computer systems pt2 | L8 specifications — activity/slides | a clean 1.5GHz-vs-3GHz CPU spec comparison | ⚠️ only a worksheet screenshot in source; used a clock photo (analogy) + PC-tower clipart instead |

> Keep this table growing as lessons are converted — it's the worklist for sourcing/creating missing images.
> **Per-unit detail** (full §7a alignment tables + every gap) lives beside each bundle in
> `app/seed-content/lessons/_notes/<slug>.md`. Recurring theme from the Y7 batch: TCC network/spreadsheet
> diagrams are **vector shapes inside the .pptx**, so `extractOfficeImages` (raster-only) can't pull them —
> these need re-drawing or a render step to embed.
