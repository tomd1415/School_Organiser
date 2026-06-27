# Conversion notes — Y7 Modelling data with spreadsheets (Teach Computing — adapted)

Slug: `y7-modelling-data-spreadsheets-teach-computing-adapted`
Source: `TeachComputing/KS3/year_7/unit_5` (6 lessons + unit guide). Target course: Computing Curriculum (KS3).
6 lessons converted; each has a starter worksheet + activity worksheet + slides (L6 activity = an assessment-style
worksheet). Show-your-work link field reworded to "link to your spreadsheet" (this is a spreadsheets unit, not MakeCode).

## §7a Alignment tables (objective → slide(s) → worksheet Q / level)

### L1 — Getting to know a spreadsheet
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| name rows, columns and cells | S3 rows & columns | activity Support (columns / rows tick) |
| write a cell reference like B3 | S4 cell references, S5 bingo | activity "D5/5D/DD" choice (core); core "ref for C9" |
| select a range like A1:F5 | S6 pixel art | activity Core "what does A1:F5 mean"; Challenge "range for a row" |
| change fill colour and borders | S6 pixel art | activity Show-your-work (flag screenshot) + ✅ checklist |
| starter (data is awkward as a list) | S2 Olympic medals | starter "who won most gold" choice + Support "this is data" |

### L2 — Quick calculations
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| write a formula that starts with = | S3 formula starts with = | starter "what does a formula start with"; activity Support "always starts with =" |
| use cell references in a formula | S5 references follow a pattern | activity Predict "= C2*D2"; Core "write =A1*C1" |
| use + - * / | S4 four operators | starter Support (* and /); starter Core blanks (operator) |
| use autofill | S6 autofill drag handle | activity Support "autofill is…"; Challenge "how autofill saves time"; Show-your-work screenshot |

### L3 — Collecting data
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| write a formula (recap) | S2 formulas recap | starter blanks (= A1 * C1); Core "add A3 and C3" |
| data vs information | S3 data vs information | activity "27,46,12 is data" choice + matching; Core "explain difference" |
| primary vs secondary source | S4 primary & secondary | activity Support "your survey is a…"; Challenge "website table primary/secondary"; matching |
| help collect data with a survey | S5 design a survey | activity Survey "write one question"; Show-your-work screenshot |

### L4 — Become a data master
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| use SUM | S4 SUM | activity "which adds a range" (SUM); Core "write =SUM(B2:B10)" |
| use MAX and MIN | S5 MAX & MIN | activity "largest"(MAX)/"smallest"(MIN) choices; Challenge total/biggest/smallest |
| use COUNTA | S6 COUNTA | starter Challenge "counts non-blank"; activity "counts non-blank" choice; Core "what does COUNTA tell you" |
| create a chart | S2 starter pie chart, S7 make a chart | starter "a pie chart helps…"; Show-your-work (chart screenshot) |

### L5 — Level up your data skills
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| sort and filter | S3 sort, S4 filter | activity "show only…" (filter) / "put in order" (sort) choices |
| use COUNTIF | S5 COUNTIF | activity Support "COUNTIF counts…"; Core "what COUNTIF does that COUNTA doesn't" |
| use AVERAGE | S6 AVERAGE | starter recap; activity Support "AVERAGE finds…"; Core "write =AVERAGE(B2:B20)" |
| use IF | S7 IF | activity Challenge "write IF(B2>10,…)"; Show-your-work screenshot |

### L6 — Assessment (conditional formatting + summative)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| use conditional formatting | S2 highlight by hand, S3 conditional formatting | starter "this is called…" (cond. fmt); assessment "rule = greater than 10,000" |
| sort and filter | S4 assessment overview | assessment worksheet (forestry sort/filter) + Show-your-work screenshot |
| use functions to analyse data | S4 assessment overview | Support MAX/SUM/COUNTA choices; Core write AVERAGE & COUNTIF |
| make a chart | S4 assessment overview | "best chart is a pie chart" choice |

All multiple-choice cells are single-correct (`(  )`); the L3 word-match uses the **matching** type (4 terms ↔ 4
meanings, renders as a drag widget). Fill-in-the-blank (`[[ ]]`) used for formula operators (L2/L3) and a
cell-range (L5). No multi-select needed (no multi-correct questions). Screenshot + ✅ checklist present on every
activity/assessment worksheet.

## Image gaps (Image-gap log — to source/make later)
The TCC source decks for this unit are mostly **clipart/stock photos**, not real spreadsheet screenshots. The one
genuine spreadsheet screenshot embedded is the **L2 times-table sheet** (image8). Embedded analogy/visuals: L1
Olympic rings (starter), L1 stadium seats (rows/columns analogy), L1 bingo card (cell-ref game), L4 pie-chart
clipart, L6 conditional-formatting clipart. Real spreadsheet screenshots still wanted:

| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1 | cell-references slide / activity | a real cell grid with column letters + row numbers, B3 highlighted | ❌ deck has only clipart/photos |
| L2 | formula slide | a real formula in the formula bar (e.g. =C20*D20) with the result | ⚠️ only the times-table result sheet (used); no formula-bar shot |
| L3 | starter / data-vs-info slides | a "list vs spreadsheet table" before/after of the same data | ❌ deck has only clipart |
| L4 | SUM/MAX/MIN/COUNTA slides | real screenshots of each function typed + its result on a data range | ❌ deck shows clipart; functions are live-demoed |
| L4 | make-a-chart slide | a real spreadsheet bar/pie chart built from a data range (not clipart) | ❌ only clipart pie chart |
| L5 | sort/filter + COUNTIF/AVERAGE/IF slides | real screenshots of a sorted/filtered table and each function | ❌ deck shows clipart/photos |
| L6 | conditional-formatting slide | a real sheet with conditional formatting applied (cells coloured by a rule) | ❌ only stylised clipart |

## Wanted-but-unbuilt question types (WORKSHEET_QUESTION_TYPES.md §2)
- **§2.3 Order / sequence (non-code)** — wanted in L4/L6 to order the steps of "make a chart" (select data →
  insert chart → choose chart type → set labels) and in L2 to order the autofill steps. Used plain text /
  single-choice instead (stop-gap). Not built.
- **§2.5 Card sort / group into categories** — wanted in L3 to sort examples into *primary vs secondary source*
  (drag items into two columns). Reframed as the **matching** widget + a single-choice question (stop-gap). Card
  sort not built.
- No other gaps: matching, fill-in-the-blank, single-choice, screenshot, checklist all available and used.

## Self-verify
Ran renderWorksheet / sliceSlidesForLevel / splitTeacherNotes over all files: every worksheet renders with fields;
every activity/assessment worksheet has a `kind:'image'` screenshot field; level slicing is content-correct
(Support render shows only Support content, Challenge only Challenge, no level labels leak); all slides parse
(6–9 slides each, ≥4) with non-empty teacher notes; all slides resource titles end `.md`; every `{{res:…}}`
placeholder resolves to a manifest `file`. PASS. (The naive "support≠challenge field-count" check tripped on equal
question counts — confirmed a false alarm via the content-level slice check.)

## Notes / decisions
- No source videos exist in this unit's zips (no mp4/webm/mov entries) — none to attach.
- L1 has many printable resources (bingo, pixel-art flags, homework); converted the core teaching arc (cell
  references + ranges + formatting) and pointed at the flag activity via the show-your-work screenshot.
- Survey lesson (L3) kept anonymous by design — worksheet explicitly says do not ask for names/personal details
  (matches the TCC guidance and the project's no-PII rule).
