# Conversion notes — Y8 Introduction to Python programming (Teach Computing — adapted)

Slug: `y8-intro-python-programming-teach-computing-adapted` · Course: Computing Curriculum (KS3) · 6 lessons.
Source: TCC KS3 Year 8 Unit 6 (L1–L6 zips + unit guide v1.3 + summative assessment). Text-based Python unit:
first programs → arithmetic → selection → multi-branch + iteration → counters → flags/final project.

Self-verify: **PASS** (all worksheets render with a screenshot field on every activity sheet; level sections
slice; every slide deck parses ≥7 slides with teacher notes; slides resource titles end `.md`; all `{{res:}}`
placeholders map to manifest files; every MCQ is single-correct, the only multi-correct cell uses multi-select).

Question-type variety used: card-sort (`sort`), matching, Parsons (`parsons` — the headline type), order
(`order`, non-code), fill-in-the-blank (`[[ ]]`), single MCQ, multi-select (`[ ]`), code fields, predict/PRIMM,
slider (`[scale 1-5]`), screenshot, checklist. Source Python-code screenshots embedded in every lesson.

## §7a alignment tables

### L1 First steps
| Objective | Slide(s) | Worksheet question (level) |
|---|---|---|
| algorithm vs program | S "Starter — algorithm or program?" | starter card-sort (shared); Support MCQ; Core/Challenge text |
| print a message | S "Our first program — Hello world" (Hello-world image) | activity Predict; Support fill-blank `print`; Core code |
| variable + input to greet | S "From Scratch to Python — input" (Scratch image) | Support fill-blank `=`,`input`; Core code "ask name + hello" |
| find/fix a syntax error | S "Fixing mistakes — syntax errors" | Challenge multi-select "tick all the mistakes" + rewrite (code) |

### L2 Crunching numbers
| Objective | Slide(s) | Worksheet question (level) |
|---|---|---|
| arithmetic operators | S "Maths in Python — the operators" (Scratch expr image) | starter matching operators↔meaning; Core/Challenge code |
| assignment right-to-left | S "Starter — predict" | starter Predict MCQ (double); Support MCQ; Core text |
| int() on input | S "Numbers from the keyboard" (moon-code image) | activity Support fill-blank `int`; Challenge "why int()" |
| order lines (set before use) | S "Order matters" | activity Parsons (seconds→minutes) |

### L3 At a crossroads
| Objective | Slide(s) | Worksheet question (level) |
|---|---|---|
| comparison operators | S "Starter — something missing" | starter matching ==/!=/</> ↔ meaning |
| if/else two paths | S "The if/else statement" + "Worked example — film critic" (film-critic image) | activity Predict; Parsons order if/else; Support fill `==`+indent MCQ; Core code |
| randint() | S "Adding randomness" | Challenge code "make it random" |
| number guessing game | S "Your turn" | Core code (build game) + Show-your-work screenshot |

### L4 More branches
| Objective | Slide(s) | Worksheet question (level) |
|---|---|---|
| if/elif/else (>2 cases) | S "if / elif / else" + "Worked example — people in space" (people image) | starter matching weather→advice; Parsons if/elif/else; Support fill `elif`; Core code |
| choose right #branches | S "Starter — the weather" | starter Core/Challenge text; Challenge "why elif beats 3 ifs" |
| describe while repeating | S "How a while loop works" | activity order block (one loop pass) |
| predict output | S "Worked example — people in space" | activity Predict |

### L5 Round and round
| Objective | Slide(s) | Worksheet question (level) |
|---|---|---|
| while loop + counter | S "Worked example — times tables" (times-tables image) | activity Predict; Core/Challenge code |
| start/change/check a counter | S "A countdown loop" | starter trace MCQ; card-sort once-vs-every-round; Support condition MCQ |
| countdown stops correctly | S "Your turn — count and stop" | activity Parsons countdown; Core code |
| loop to ask several questions | S "Worked example — times tables" | Challenge code (3-question game) + slider |

### L6 Putting it all together
| Objective | Slide(s) | Worksheet question (level) |
|---|---|---|
| combine while + if/else | S "Your turn — finish the game" | starter card-sort once-vs-repeat; Core/Challenge code |
| Boolean flag controls loop | S "Flags — True and False" (lucky-number image) | activity matching True/False/flag/and; Support fill True/False |
| count + limit guesses | S "Your turn — finish the game" | Core code (count) + Challenge code (limit with `and`) |
| finish + test the game | S "Show what you built" + "Summative assessment" | Show-your-work screenshot; reflection slider; summative quiz (separate) |

## Image-gap log (per-unit; recurring theme also noted in WORKSHEET_QUESTION_TYPES.md §4)
Strong position overall: a genuine TCC **code screenshot** is embedded in every lesson (the unit's main visual
need is code, and those rasterise cleanly from the decks). Remaining soft gaps:

| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L2 | "Numbers from the keyboard" slide | a clean still of the TypeError message (input-gives-text) | ⚠️ only animated reveal in source deck — described in teacher notes instead |
| L3 | "The if/else statement" slide | a simple 2-path flow-chart of if/else | ⚠️ source flow charts are PowerPoint **shapes**, not extractable rasters |
| L4 | "How a while loop works" slide | a loop flow-chart (condition → block → back) | ⚠️ same — vector shapes only; used the `order` step task instead |
| L5/L6 | trace/flag slides | a sketched variable trace-table still | ⚠️ source traces are animated table builds; not a clean raster |

No image was invented. No source **videos** exist in this unit's zips (nothing attached/referenced — unlike the
Y7 micro:bit pilot which had an mp4).

## Wanted-but-unbuilt question types
**None.** Every question maps to a built type (all four former-backlog types — order, card-sort, label, slider —
are now live and four of them are used here: order, card-sort and slider). Label-a-diagram was considered for
"label the parts of an `if` statement" on a code screenshot, but the source screenshots pack text too tightly to
place reliable (x%,y%) zones, so matching/Parsons were used instead — not a type gap, an authoring-precision
choice. No new types required.

## Notes
- Pupil-name safety: example identifiers use neutral words (film titles, "weather", numbers); no individual
  pupil is named or described. The embedded `l1-hello-world` screenshot shows only `print("Hello world!")`.
- All embedded media are OGL-licensed TCC raster images copied byte-for-byte into the bundle; attribution set on
  every image resource in the manifest. Nothing else from `TeachComputing/` was copied.
