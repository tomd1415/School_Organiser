# Conversion notes — KS2 Y6 Introduction to spreadsheets (Teach Computing — adapted)

**Slug:** `ks2-y6-introduction-to-spreadsheets-teach-computing-adapted`
**Course / key stage:** KS2 Computing · KS2
**Lessons:** 6 (every TCC lesson converted)
**Framing:** PRIMARY content, SEND-secondary cohort — simple/concrete, age-respectful (not babyish),
very low reading load, lean on visual/drag types (sort, order, label, multi-select, choice, screenshot).
Practical Google Sheets unit — every activity ends with a screenshot of the pupil's real spreadsheet.

## Question-type spread (variety, low writing)
- **sort** (card-sort) — L3 (can/cannot be calculated: number/currency vs text), L6 (use a table vs use a chart)
- **order** (sequence) — L1 (make a spreadsheet: collect→table→open→headings→data), L4 (SUM steps), L6 (make a chart: highlight→Insert→Chart→pie)
- **label** (image hotspot) — L2 starter (label the grid: column letter / row number / cell A1) on a clean cell-grid screenshot
- **fill-blank** — L3 (`=[[ ]]*[[ ]]`), L4 (`=SUM([[ ]])`) — both as prose gaps (table-cell + backtick gaps render as plain text, so kept in prose)
- **multi-select** — L1 starter (what is data), L2 (which are formats), L3 starter (which symbols), L5 starter (what a spreadsheet helps with)
- **matching grids** (single-correct pool) — L2 (data item→format), L4 starter (operation→symbol), L5 (total→formula)
- **single-choice** — every Support section + some Core/plenary (single-correct; not the multi-correct trap)
- **scale** — L6 activity (confidence with charts); **screenshot** — every activity worksheet (📷)

## Image use (all OGL, Teach Computing © Raspberry Pi Foundation)
| Lesson | Embedded | Used for |
|---|---|---|
| L1 | dice; spreadsheet grid (journey data) | roll-a-dice data collection; data in a grid with headings |
| L2 | toolbar; cell grid; formats list; Format menu | cells/cell references; **label-the-grid**; the format options; applying a format |
| L3 | calculator (operators); journey spreadsheet (empty Journey cost col) | + − * / symbols; building =D2*E2 with cell references |
| L4 | four-operations grid (Add/Subtract/Multiply/Divide tabs); scores with Total column filled | the four operations; SUM over a range + duplicate down |
| L5 | party planning table; completed party sheet + pie chart | organised data; subtotal/total/per-person formulas |
| L6 | clean "Party costs" pie chart; party sheet with chart | a chart is a picture of data; read a chart; table vs chart |

All real Google Sheets screenshots except the dice (L1) and calculator (L3), which are concrete-object
visuals that ARE the lesson hook (rolling for data; the maths operators). Skipped: the recurring NCCE/Raspberry
Pi banner, post-it/thumbs-up/thumbs-down/"Oops!"/clock/question-mark/balloons clipart, businessman+bar-chart
and 3D-pie/line-graph decorative clipart.

## §7a Alignment (objective → slide → worksheet Q)
**L1 Collecting data** — collect data (S-starter / starter multi-select + Support); structure in a table
(S-structure / activity Support+Core headings); enter into a spreadsheet (S-spreadsheet / activity order +
📷). 
**L2 Formatting** — what a data item is (S-data-item / activity multi-select + matching); choose a format
(S-formats / activity matching + Support); apply a format (S-apply / activity 📷). Cells/cell refs taught on
starter via **label** task.
**L3 What's the formula?** — which data can be calculated (S-numbers / activity sort + Support); build a formula
(S-build / activity fill-blank + Core + 📷); inputs→outputs (S-io / activity Challenge).
**L4 Calculate and duplicate** — operations (S-starter / starter matching + Support); range/SUM (S-functions /
activity fill-blank); duplicate (S-duplicate / activity order + Core + 📷).
**L5 Event planning** — answer questions (S-question / activity Core read-the-sheet + 📷); why organise
(S-why / starter Support + multi-select); formulas to calculate (S-costs / activity matching + Support).
**L6 Presenting data** — make a chart (S-make / activity order + Support + 📷); use a chart to answer
(S-read / starter choice + activity Core); table vs chart (S-tablechart / activity sort + Challenge).

## Image gaps (logged to WORKSHEET_QUESTION_TYPES.md §4)
- L4 — no AVERAGE-result screenshot embedded (source had a SUM/totals still; AVERAGE was a video only). SUM
  totals image carries the function idea; AVERAGE covered in prose + teacher video.
- L3/L4/L6 — source includes short demo videos (inputting formulas, numbers vs cell references, SUM, AVERAGE,
  creating charts). Not embedded (files-only conversion; motion/sound against low-arousal default) — flagged in
  the plan outlines as optional teacher-played clips.
- No conditional-formatting screenshot in this unit's source (that lives in the KS3 spreadsheets unit).

## Verified
`npx tsx _vfile.ts seed-content/lessons/ks2-y6-introduction-to-spreadsheets-teach-computing-adapted` →
**✅ file-level checks passed** (6 lessons, 32 resources = 18 worksheets/slides + 14 images; every activity has a 📷 field; every deck ends .md
with teacher notes and ≥5 slides; S/C/C slice; label/sort/order/fill-blank/matching all render to their types).
