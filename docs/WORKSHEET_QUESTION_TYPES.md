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
| **Fill-in-the-blank** | types into an inline gap | `[[ ]]` in the text (one per gap) | objective (auto) |
| **Code** | writes/edits code (monospaced box) | cell/header names code: `Type your code here`, "program", "script", "pseudocode", "algorithm" | open |
| **Parsons** *(order CODE)* | drags jumbled **code** lines into order | a fenced ```` ```parsons ```` block with the lines | objective (correct order) |
| **Screenshot / upload** | pastes or drops an image of their work | cell with `📷`/`🖼` or "paste … screenshot/image/work …" or "screenshot … here" | teacher view (PII) |
| **Checklist** | self-ticks success criteria | `- [ ] …` lines (usually under `## ✅ I can…`) | self-assessment (not credited) |

Plus prose, tables, headings, images and callouts render but are inert. Level differentiation = `## 🟢
Support` / `## 🟡 Core` / `## 🔴 Challenge` sections (auto-sliced per pupil; never labelled).

---

## 2. Backlog — question types a lesson wanted but the system can't do yet

> Status legend: **NOT BUILT**. When you build one: change status to **BUILT (date)**, then update each
> worksheet under "wants it" and re-run the alignment check (LESSON_CONVERSION_GUIDE.md §7a).

### 2.1 Multiple-select ("choose ALL that apply")  — **NOT BUILT**  ⭐ highest priority
- **What.** Tick **several** correct options in one question (checkboxes that are *marked*, unlike the
  self-assessment checklist). The current `choice` cell is single-radio only.
- **Why.** The teaching context favours "tick/choose"; many recall questions have multiple right answers.
- **Example.** *"Which of these are micro:bit inputs?"* → buttons ✓, light sensor ✓, temperature sensor ✓,
  the screen ✗.
- **Wants it:** `micro:bit countdown — starter worksheet` (the inputs question — currently reworded to a
  single-answer "which is NOT an input?" as a stop-gap).
- **Likely build.** A cell marker like `[  ]` (square, ≥2) → multi-select; mark = the set of ticked == the
  expected set. Mirror `choice` in `worksheetForm.ts` + `deterministicMarker`.

### 2.2 Match / pair (term ↔ definition)  — **NOT BUILT**
- **What.** Draw lines / pick the matching pair: left column of terms, right column of definitions.
- **Why.** "match" is in the teaching context; ideal low-writing vocabulary practice.
- **Example.** Match: *iteration · variable · input* ↔ *a repeating loop · a stored value · data the
  micro:bit receives*.
- **Wants it:** both micro:bit lessons (vocabulary), most KS3 theory lessons.
- **Likely build.** A two-column table block kind `match` with a drag-to-pair (or dropdown-per-row) control;
  mark = each row's chosen right == expected.

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

## 3. Stop-gap rule (until a type exists)

When a lesson needs a missing type, **don't** fake it badly. Either (a) reframe to a supported type that's
still pedagogically sound (e.g. multi-select → a single-answer "which is NOT…", or several yes/no rows), or
(b) leave a plain text/answer box — **and add an entry/worksheet to the relevant §2 item** so it's fixed once
the type lands. Never use a single-radio `choice` for a multi-correct question (it can't be answered).
