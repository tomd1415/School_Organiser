# Conversion notes — GCSE Programming part 4 — subroutines (Teach Computing — adapted)

Slug: `gcse-programming-4-subroutines-teach-computing-adapted`
Course: OCR J277 GCSE Computer Science (keyStage **KS4**). Scheme mapping: GCSE → course 3.
Source: `TeachComputing/GCSE/unit_5/` lessons L18–L24 (L23/24 is one double lesson + project).
6 native lessons. Sibling unit `gcse-programming-3-iteration-…` used as the style template.

Question-type variety used: matching, multiple-choice, multi-select, fill-blank, **card-sort**,
**Parson's (code)**, **label-a-diagram**, **slider**, code, screenshot, checklist. No single-radio
multi-correct cells. Self-verify (render + slice + placeholder/manifest consistency) PASS.

---

## L1 — Subroutines (parameters & decomposition)  [TCC L18]

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| describe what a subroutine is | S2 starter, S3 | starter Support choice (×2); activity Key-words matching |
| explain parameters and arguments | S3, S4 we-do | activity Key-words matching; Core "what are num1/num2 called"; starter Challenge |
| write a subroutine that uses parameters | S5 you-do | activity Support Parson's (double); Challenge write `average_value(a,b,c)` (code) |
| use subroutines to break a problem into parts | S6 decomposition | activity card-sort (subroutine vs main program) + show-your-work |

Images: `l1-calculator-program` (starter, real code screenshot), `l1-decomposition-puzzle`
(decomposition). No source video for L18.

## L2 — Functions (return values & trace tables)  [TCC L19]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| explain function vs procedure | S4 | activity card-sort function/procedure; starter |
| read a function that uses return | S3 return, starter | starter (powers crash); activity Support choice |
| use a trace table to investigate a function | S5 we-do | activity fill-blank trace of `to_the_power(2,3)`; Core trace `find_highest(9,12)` |
| write a function that returns a value | S6 you-do | activity Challenge `average_value(a,b)` (code) + show-your-work |

Images: `l2-trace-table-function` (real worksheet screenshot of a trace table).

## L3 — Scope (local, global, constants)  [TCC L20]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| describe local vs global scope | S3 telescope, S4 | starter; activity card-sort local/global |
| spot local vs global | S2 starter, S4 | starter Support choice; activity Core |
| change a global program to use parameters | S5 you-do | activity Challenge rewrite `double` (code) |
| describe a constant | S6 | activity constant text Q |

Images: `l3-scope-telescope` (visual metaphor for scope — decorative photo, low-arousal).

## L4 — Making an XOR function (truth tables)  [TCC L21]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| read & complete a truth table | S3 AND-table image, starter | activity XOR truth-table choice rows (×4) |
| describe what XOR does | S4 | starter Challenge; activity Support choices |
| design an XOR function in pseudocode | S5 you-do | activity Core Parson's (pseudocode) |
| create & test an XOR function | S5 | activity Challenge write+test XOR (code) + show-your-work |

Images: `l4-and-truth-table-code` (real AND truth-table screenshot), `l4-and-or-function-code`
(real AND/OR function screenshot — used for the **label-a-diagram** task: name / parameters /
return value / arguments). Label zone coordinates were read off the viewed image (self-marked, so
approximate is fine).

## L5 — Structured programming (one way in, one way out)  [TCC L22]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| explain one entry/one exit | S2 starter, S3 | starter (count exit points); activity Support choices |
| improve code (remove break/extra returns) | S3 we-do | activity Core rewrite `multiple_five` (code) |
| read a structure chart | S5 dog-walking | activity structure-chart choice rows (×3) |
| complete a program from a structure chart | S6 you-do | activity Challenge complete dog-walking invoice (code) + show-your-work |

Images: `l5-dog-walking` (the dog-walking invoice scenario).

## L6 — Create a program (testing + final project, double lesson)  [TCC L23/24] + summative folded in

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| describe iterative & final testing | S2 starter, S3 | starter; quiz |
| sort data: erroneous/boundary/normal | S3 | activity card-sort; quiz sort |
| plan a program from a structure chart | S4 scenario, S5 | activity design (pseudocode, code) |
| create & test a program | S5 you-do | activity Challenge build ticket machine (code) + test-table choices + show-your-work |

Summative folded in as **`l6-subroutines-unit-quiz-worksheet.md`** (whole-unit: key-words matching,
test-data sort, function multi-select, fill-blank, write/improve code, confidence slider) — replaces the
TCC "Create a program" rubric/summative as the unit's final assessment artefact. The TCC rubric criteria
(subroutines used, validation, structured approach, testing) are reflected in the activity-worksheet tasks
and the slide teacher-notes.
Images: `l6-theme-park-ride` (ticket-machine scenario), `l6-project-coding` (build phase).

---

## Image gaps (for WORKSHEET_QUESTION_TYPES.md §4 — recorded here per the bundle convention)

| Lesson | Where | Wanted image | Source had one? |
|---|---|---|---|
| L1 Subroutines | S3/S4 "arguments vs parameters" | a clean annotated call→def arrow diagram | ⚠️ source diagram is an animated PPT shape (not rasterisable) — used the calculator code screenshot + puzzle photo instead |
| L2 Functions | S3 "return" | a control-flow diagram showing the value returning to the caller | ⚠️ PPT animation only — embedded the trace-table screenshot instead |
| L3 Scope | S4 local/global | a memory diagram showing local box inside global box | ⚠️ source = PPT shapes/animation — used the telescope metaphor photo |
| L4 XOR | S4 | a clean XOR truth-table graphic (0/1 grid) | ⚠️ only the AND/OR worksheet stills were rasterisable — XOR table built as choice cells; AND table screenshot embedded |
| L5 Structured | S5 | a rendered dog-walking **structure chart** (boxes: identifier/parameters/return) | ⚠️ chart is a PPT shape diagram — not extractable; used the dogs photo + a choice table standing in for the chart |
| L6 Create a program | S4 | the **project structure chart** for the ticket machine | ⚠️ PPT shape diagram — not extractable; scenario described in prose + structure listed in the worksheet |

Recurring theme (matches the Y7/Y8 batch note): TCC's code-flow / structure-chart / scope diagrams are
**vector shapes/animations inside the .pptx**, so `extractOfficeImages` (raster-only) can't pull them. The
genuinely rasterised stills that DID come through (worksheet code screenshots: trace table, AND truth table,
AND/OR functions) were embedded. These diagram gaps want re-drawing or a render step.

## Wanted-but-unbuilt question type

| Lesson | Worksheet | Type wanted | Why | §2 category |
|---|---|---|---|---|
| L2 Functions | activity (trace `to_the_power` / `find_highest`) | **Interactive trace table** (auto-marked grid) | tracing is a core OCR J277 skill; this is the exact loop-trace use case | §2.7 (NOT BUILT) — stop-gapped with the embedded trace-table screenshot + fill-blank/choice cells |

No other type-gaps — order/sort/label/slider/multi-select all covered the demand.

## Source-fidelity notes
- L18 calculator, L19 powers/trace functions, L20 scope examples + constants, L21 AND/OR/XOR truth tables &
  functions, L22 improve-the-code + dog-walking structure chart, L23/24 testing types + Copington ticket
  machine scenario — all preserved from the TCC plans/worksheets, re-authored to SEND low-load native format.
- M24 (parameter passing forms no live link) is called out in L1 teacher notes; M-scope shadowing in L3.
- TCC live-coding `.webm` videos (L19) were NOT bundled: large (18 MB + 59 MB) teacher demonstrations, not
  pupil-facing hooks, and contain on-screen typing only. Logged here as a deliberate omission (the lesson's
  live-code is reproduced as a worked example on the slide + worksheet instead).
