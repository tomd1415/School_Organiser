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
| **Screenshot / upload** | pastes or drops an image of their work | cell with `📷`/`🖼` or "paste … screenshot/image/work …" or "screenshot … here" | teacher view (PII) |
| **Checklist** | self-ticks success criteria | `- [ ] …` lines (usually under `## ✅ I can…`) | self-assessment (not credited) |

Plus prose, tables, headings, images and callouts render but are inert. Level differentiation = `## 🟢
Support` / `## 🟡 Core` / `## 🔴 Challenge` sections (auto-sliced per pupil; never labelled).

---

## 2. Backlog — question types a lesson wanted but the system can't do yet

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

### 2.3 Order / sequence (non-code)  — **NOT BUILT**
- **What.** Drag plain-text steps into the right order (Parsons but for **words/steps**, not code).
- **Why.** "order" is in the teaching context; e.g. order the steps of an algorithm in plain English, or a
  process (boot sequence, the data-packet journey).
- **Example.** Order: *set a start value → repeat → show the number → change the value → stop*.
- **Wants it:** `micro:bit countdown` (sequence the countdown steps), KS3 networks/algorithms lessons.
- **Likely build.** Generalise the `parsons` block to a `steps`/`order` block over prose lines.

### 2.4 Label a diagram / image hotspot  — **NOT BUILT**
- **What.** Drag labels onto a picture (or click hotspots): label the parts of a computer / the micro:bit.
- **Why.** "label" is in the teaching context; strongly visual, near-zero writing — ideal for SEND.
- **Example.** Label the micro:bit: *button A · button B · LED display · USB · pins*.
- **Wants it:** `micro:bit countdown — starter` (label the inputs), any hardware/parts lesson.
- **Likely build.** An image block with positioned drop-zones + a label bank; mark = label in the right zone.
  (Biggest build — needs an image-coordinate authoring step.)

### 2.5 Card sort / group into categories  — **NOT BUILT**
- **What.** Drag items into named groups/columns.
- **Why.** "drag" is in the teaching context; classic CS activity (input vs output vs storage; hardware vs
  software).
- **Example.** Sort into **Input / Output**: button, LED, microphone, speaker.
- **Wants it:** KS3 computing-systems lessons; the micro:bit inputs/outputs idea.
- **Likely build.** A `sort` block: items + category columns; mark = each item in the right column.

### 2.6 Slider / rating scale  — **NOT BUILT** (low priority)
- **What.** Drag a slider on a scale (e.g. confidence 1–5, or estimate a value).
- **Why.** Low-stakes self-rating / estimation; minimal writing.
- **Example.** *"How confident are you with loops?"* 1–5.
- **Wants it:** plenaries / self-assessment across lessons.
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

> Keep this table growing as lessons are converted — it's the worklist for sourcing/creating missing images.
