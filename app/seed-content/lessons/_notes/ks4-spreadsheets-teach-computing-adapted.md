# Conversion notes — KS4 Spreadsheets (Teach Computing — adapted)

- **Slug:** `ks4-spreadsheets-teach-computing-adapted`
- **Course / key stage:** KS4 IT & Digital Skills · **KS4**
- **Source:** TeachComputing KS4 (non-GCSE) unit_5 — Spreadsheets, KS4 v1.2. Lessons 1–6 + the unit guide
  and the end-of-unit summative assessment. © Raspberry Pi Foundation, OGL v3.0.
- **Lessons authored:** 6 (each: starter worksheet + activity/quiz worksheet + slide deck + media).
  Lesson 6 is the assessment lesson — the summative is folded into a shared end-of-unit quiz.
- **Self-verify:** PASS (renders, screenshot field on every activity/quiz, level slicing differs on every
  lesson with S/C/C sections, all decks ≥6 slides with teacher notes, all `{{res:}}` placeholders map to
  declared manifest files).
- **Question types used:** text, multiple-choice, multi-select (none needed — all MCQs single-correct),
  matching, fill-in-the-blank, code, Parsons, order, card-sort, label-a-diagram, screenshot, checklist.
- **Adaptation:** show-your-work uses "paste your formula" + a spreadsheet screenshot (this unit is
  Excel/Google Sheets, not MakeCode). SEND defaults throughout (low-arousal calm slides, I-do/we-do/you-do,
  S/C/C on the same task, likely-error fix-words + TA cues on every activity). Source context "Rock Star
  Challenge" TV-show scenario kept; pupil-facing language simplified.

> **Heading gotcha avoided:** no `#`/`##` heading contains the words support/core/challenge (the slicer
> reads those as level dividers). The unit is "RSC merchandise/stock control", so no clash arose.

---

## §7a alignment — Lesson 1: Spreadsheet warm-up

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| name the parts of a spreadsheet | S2 name-the-parts | starter: **label-a-diagram** column/row/cell (shared) · **matching** word↔meaning (Support) · which row is B10 (Core) |
| use a formula to work things out | S3 a formula starts with = | activity: predict ADD/MULTIPLY (shared) · write the E9 formula (Core) · profit formula (Challenge) |
| explain relative vs absolute | S4 relative vs absolute | activity: word-choice relative/absolute (Support) · **fill-blank** `$B$4` (Core) |
| format money cells as currency | S5 finished model | starter: spot the wrong currency format (Challenge) · activity show-your-work + ✅ checklist |

Media: voting cell-grid (used by the label task), completed voting model.

## §7a alignment — Lesson 2: The RSC Live event

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| calculate discounted prices | S3 prices from one place | starter recap; activity predict 25%/75% (shared) |
| use COUNTIF to count seats | S4 COUNTIF | activity: **Parsons** build the COUNTIF (shared) · seat-code **matching** (Support) · seats-remaining + **fill-blank** speech marks (Core) |
| use data validation | S5 data validation | starter: what validation/drop-down does (Support) · why a drop-down beats typing (Core) · validation keeps totals correct (Challenge) |
| use conditional formatting | S6 conditional formatting | starter: a useful rule for a sold seat (Challenge); activity show-your-work |

Media: seating codes/prices, seating plan with validation dropdowns, conditional-format dialog.

## §7a alignment — Lesson 3: RSC merchandise

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| calculate profit per item | S3 work out profit | activity: **Parsons** the profit formula (shared) · write E8 (Core) |
| total a column with SUM | S3 | activity: what SUM does (Support) · **fill-blank** `SUM` (Core) |
| format money as currency | S4 finished model | starter: money→currency (Support); activity choose currency format (Support) |
| conditional formatting for a target | S5 conditional formatting | starter: describe a green-at-target rule (Challenge) · activity: red-below-target rule (Challenge) |

Media: blank merchandise sheet, completed model (red conditional format), conditional-format dialog.

## §7a alignment — Lesson 4: RSC data visualisation

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| make a column chart | S3 column chart | activity: **order** the make-a-chart steps (shared) · column choice (Support) |
| make a pie chart | S4 pie chart | activity: **card-sort** column-vs-pie jobs (shared) · pie choice (Support) |
| clear title and labels | S3/S4 | activity: **fill-blank** title/labels (Core) · write a chart title (Core) |
| choose the right chart | S5 pick the right chart | starter: misleading axis (shared, S/C/C depth) · why a pie is wrong for groups (Challenge) |

Media: misleading bar chart (starter), column chart, pie chart, grouped column chart.

## §7a alignment — Lesson 5: RSC stock control

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| use VLOOKUP to fetch data | S3 VLOOKUP | activity: **Parsons** the VLOOKUP (shared) · what A8/FALSE mean (Support) |
| lock the lookup range with $ | S3 | activity: predict a bad lookup (shared) · ✅ checklist |
| use IF to warn on low stock | S4 IF | activity: **fill-blank** the IF (Core) · write a <50 IF (Core) |
| test the model | S5 test it | starter: barcode/QR (S/C/C); activity: CHECK INPUT IF (Challenge) + show-your-work |

Media: QR code (starter), till receipt, VAT-rate lookup cell.

## §7a alignment — Lesson 6: Spreadsheets assessment (folded summative)

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| apply skills to a new scenario | S3 the assessment | starter: **matching** function↔job (Support); quiz: all 11 Qs on a new fete spreadsheet |
| write formulae from scratch | S4 quiz conditions | quiz Q1–Q4 SUM/× as **code** |
| explain a computer model | S2 read-the-formula | starter: what is a model (Core); quiz Q6 model (text) |
| choose the right function | S3 | quiz Q8–Q10 single-choice (FALSE / AVERAGE / COUNT); Q5/Q7/Q11 text |

The quiz is a **shared** assessment (no S/C/C — everyone sits the same exam), per "fold the summative into a
final quiz". The L6 **starter** carries the S/C/C differentiation for the lesson.

---

## Image-gap log (also relevant to docs/WORKSHEET_QUESTION_TYPES.md §4)

| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1 | starter label task | a CLEAN spreadsheet still with a visible **formula bar** and named active cell, for a richer label widget | ⚠️ used the voting cell-grid (columns/rows clear, no formula bar) — coords hand-set for column/row/cell zones; a still showing the formula bar would unlock a 4th zone |
| L2 | S6 conditional formatting | a before/after of seats colouring when sold | ⚠️ source had only the rule dialog — embedded that; a result still would help |
| L4 | starter | the truncated-axis vs full-axis pair side by side | ⚠️ only the truncated bar chart was extractable as a raster — taught the contrast in bullets |
| L5 | S3 VLOOKUP | an annotated VLOOKUP with callouts on each argument | ⚠️ source callouts are animated PPT shapes (excluded per no-animation) — wrote the arguments as a Parsons block + bullets |

**Embedded media count:** 16 images, all genuine source rasters (spreadsheet screenshots, real charts, a QR
code and a till receipt). Unusually strong image coverage for a spreadsheets unit — the source decks here
held real Sheets/Excel screenshots rather than clipart. No source videos in this unit (macro lessons are
text/step based). The till-receipt PNG is ~0.9 MB — flagged for git-LFS per
`app/seed-content/lessons/README.md` when LFS lands.

## Wanted-but-unbuilt question types

**None.** Every question type a lesson wanted is live in the engine: order, card-sort, label-a-diagram,
Parsons, code, fill-in-the-blank, matching, multiple-choice, screenshot, checklist. No backlog additions
needed (WORKSHEET_QUESTION_TYPES.md §2 unchanged). A spreadsheet-formula auto-marker (like the proposed
trace-table grid) would be the natural next type to make the `code` answers auto-markable, but it was not
*required* — the `code` cells render and store fine as open answers.
