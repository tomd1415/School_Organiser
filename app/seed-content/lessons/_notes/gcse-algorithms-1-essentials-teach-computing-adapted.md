# Conversion notes — GCSE Algorithms part 1, the essentials (Teach Computing — adapted)

Slug: `gcse-algorithms-1-essentials-teach-computing-adapted`
Course: OCR J277 GCSE Computer Science · keyStage **KS4**
Source: `TeachComputing/GCSE/unit_6` (L1–L3 only; this is "part 1, the essentials" — the searching/
sorting lessons of the full Algorithms unit are out of scope here). No source videos in any lesson.

Question-type variety used: multiple-choice, multi-select, matching, fill-in-the-blank, **card-sort**,
**order/sequence**, **label-a-diagram**, screenshot, checklist. Self-verify: **PASS** (all worksheets
parse; activity worksheets have a screenshot field; level sections slice support≠core≠challenge; slides
parse with teacher notes).

## §7a alignment — Lesson 1: Computational thinking

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| define decomposition, abstraction, algorithmic thinking | S3 CT intro, S4 decomposition, S5 abstraction, S6 algorithmic thinking | starter: Support 2× MCQ (decomp/abstraction), Core matching (term↔meaning), Challenge fill-blank "algorithm = ordered steps" |
| recognise where each skill is used | S2 starter (five sticks), S4–S6 | starter Support MCQs; activity card-sort (decomp) + multi-select (abstraction) |
| use the three skills to solve a problem | S7 you-do | activity: card-sort Move/Item/Spell, multi-select keep-to-test-movement, order the route + Show-your-work screenshot |

## §7a alignment — Lesson 2: Representing algorithms (flowcharts)

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| difference between algorithm & program | S2 Lego starter, S3 algorithm-vs-program | starter: Support 2× MCQ, Core explain, Challenge "3 ways to write an algorithm" |
| name flowchart symbols & their job | S5 symbols, S6 worked example | activity: **label-a-diagram** (4 symbols), Support matching symbol↔job, Core decision-has-two-exits MCQ |
| build a flowchart from a description | S6 we-do, S7 you-do | activity: **order** the dice-roll steps + Show-your-work (build flowchart in slides/Draw.io → screenshot); Challenge store/show score |

## §7a alignment — Lesson 3: Tracing algorithms (trace tables)

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| trace code with while/for loop & list | S2 starter flowchart, S3 what-is-a-trace-table, S5 Russian-mult | starter: output MCQ; activity Task 1 MCQ (prints 77 / not infinite), Core explain b shrinking; Show-your-work = completed trace table screenshot |
| modulo (%) & integer division (//) | S4 Python maths | starter Core fill-blank (14%4, 28//5) |
| use a trace to find & fix a logic error | S6 you-do (lowest-number bug) | activity Task 2 MCQ (finds highest / fix = `items[current] < lowest`), Challenge explain why |

## Image gaps

| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1 | decomposition slide (S4) | a blank structure diagram + a worked "trip" decomposition | ⚠️ source diagrams are PPT shapes/animations — not raster-extractable; used five-sticks + Paris street-map + game town-map (all embedded, OGL) |
| L1 | abstraction | a Paris **Metro** map to contrast with the street map | ⚠️ only the street map extracted cleanly; Metro map was a PPT shape — soft gap |
| L2 | flowchart symbols (S5 + label task) | a flowchart showing every symbol type incl. **subroutine** | ✅ reused L3's clean count-loop flowchart (Start/Process/Decision/Output) for the label task; subroutine symbol not present in any raster — soft gap |
| L3 | Task 2 "lowest number" | a clean still of the Figure 2 code | ⚠️ none in source; written inline as a fenced `python` block instead (renders verbatim) |

## Wanted-but-unbuilt question type

| Lesson | Worksheet | Type wanted | Why / stop-gap used |
|---|---|---|---|
| L3 | activity (Task 1 & Task 2) | **interactive trace table** (a grid the pupil fills row-by-row; auto-checks each cell) | The core activity of the lesson is completing a trace table — no engine widget exists for a fillable/auto-marked trace grid. Stop-gap: pupils complete the trace in slides/on paper and upload a **screenshot** (Show-your-work), with targeted MCQ/fill-blank checking the key results (output=77, the bug, the fix). Not in WORKSHEET_QUESTION_TYPES.md §2 — this is a **new** type (trace-table / state-table). Logged here for the backlog. |

All other demand was met by built types (card-sort, order, label, multi-select, matching, fill-blank).
