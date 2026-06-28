# Conversion notes — KS2 Y4 Repetition in shapes (Teach Computing — adapted)

- **Slug:** `ks2-y4-repetition-in-shapes-teach-computing-adapted`
- **Course / KS:** KS2 Computing · KS2
- **Source:** TeachComputing/KS2/Year_4/Unit 3 Repetition in shapes (6 lesson zips + unit guide)
- **Topic:** Logo / turtle graphics — typing commands, algorithms, count-controlled loops (repeat), tracing, decomposition + procedures, a final loop-pattern project.
- **Cohort:** SEND secondary working at primary level. Primary content, age-respectful framing (no "boys and girls" / infant clip-art tone). Low reading load; leans on visual/drag types (label, sort, order, parsons, multi-select, scale, screenshot). Decorative TCC clip-art (cartoon children, ships, thumbs-up, 3D question-mark man) was deliberately NOT carried over — only the real, relevant screenshots/diagrams.

## Self-verify
- renderWorksheet (all 12 worksheets): screenshot (kind image) field present; support slice ≠ challenge slice. **PASS**
- slideDeck: every deck ≥ 7 `## ` slides; splitTeacherNotes returns non-empty notes on every deck. **PASS**
- All `{{res:…}}` placeholders resolve to a manifest `file`. **PASS** (0 missing)
- Slides resource titles all end `.md`. **PASS**
- Interactive types confirmed parsing into fields: `label`, `order`, `sort`, `parsons`, multi-select (`multichoice`), `scale`, `code`, single `choice`, `image` (screenshot), `check`.

## §7a Alignment tables (objective → slide → worksheet question)

### L1 Programming a screen turtle
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| type Logo commands to move the turtle | S3–S5 (Logo screen, FD/BK, turns) | starter: label the Logo screen; activity: Support match command→effect |
| explain what changing a number does | S4 (forwards, bigger = longer) | activity: Predict FD100 vs FD200; Core "change FD100→FD50" |
| write a code snippet to draw something | S7 we-do digit 7, S8 you-do | activity: Challenge order the 7; show-your-work code + screenshot |

### L2 Programming letters
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| plan an algorithm for a letter | S4 (algorithm is a plan), S5 squared letters | activity: Support order the L; Core match move→command |
| write my algorithm as Logo code | S5 we-do letter L | activity: Challenge write own initial code |
| test my code and debug it | S2 debug 7, S6 your turn | starter: choose the bug / multi-select bugs; activity: "what did you change to fix it" |

### L3 Patterns and repeats
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| spot the repeated part of a pattern | S2 bunting, S3 piano | starter: what comes next; Support tick repeating part |
| say how many times a pattern repeats | S2–S3 | starter: Core count repeats; Challenge sort repeats/no-pattern |
| use a count-controlled loop to draw a square | S4 long way, S5 short way, S6 we-do | activity: match long→loop; fill-blank repeat N; Challenge order/rewrite as loop |

### L4 Using loops to create shapes
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| say what changing the repeat number does | S2 (double tower→8) | starter: tower number; Core "FD200 bigger square" |
| trace a loop and predict the shape | S3 tracing, S5 we-do triangle | starter: Core "what shape"; Challenge order the trace |
| choose which numbers to change to draw a shape | S4 shapes table, S6 you-do | activity: match shape→loop; fill-blank pentagon; sort loops→shape; Challenge octagon loop |

### L5 Breaking things down
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| break a real task into smaller steps (decompose) | S3 decompose PE | starter: order PE steps; Core match big task→step; Challenge sort house chunks |
| make and use a procedure in Logo | S4 procedure editor, S6 you-do | activity: match procedure parts; Parsons build "to square…end"; Challenge triangle procedure |
| explain the computer can call a procedure many times | S5 we-do repeat 20 [square rt 18] | activity: Challenge "what does square do" |

### L6 Creating a program
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| design a program that uses count-controlled loops | S4 brief, S5 design | starter: match pattern→loop; activity Support tick shapes + one loop; Core full plan |
| use my design to write a program | S6 program it | activity: Core write code; show-your-work final code + screenshot |
| debug my program to improve it | S2 matching designs, S7 debug, S8 evaluate | starter: order program steps; activity Challenge "what was the bug"; evaluate + confidence scale |

No orphan objectives; no worksheet question about an untaught topic. Each single-choice has exactly one correct option (no multi-correct on a radio). Levels are coherent: Support = recognition (match/tick/order), Core = recall/apply, Challenge = reason/write code.

## Type gaps
None new. The unit was fully served by existing types (label ×1, order ×6, sort ×3, parsons ×1, multi-select ×3, scale ×1, plus choice/code/screenshot). No backlog additions needed.

## Image gaps (also logged in WORKSHEET_QUESTION_TYPES.md §4)
Embedded 7 OGL images (FMSLogo interface ×2, bunting, piano, shapes-angle table, procedure editor, rotated-squares pattern). Remaining soft gaps:
| Lesson | Where | Wanted | Source had one? |
|---|---|---|---|
| L2 Programming letters | starter/activity | a clean squared-off digit 7 / alphabet-on-grid still (the source shows it only via an animated GIF) | ⚠️ source stills were animated GIFs (excluded per no-animation) — reused the FMSLogo typing screenshot |
| L1/L4 | FD/RT demo, tracing | a step-by-step "line, turn, line, turn → square" still strip | ⚠️ source used animated GIFs only |
Most of this unit's demonstration visuals in the source decks are **animated GIFs**, which are excluded under the no-animation SEND rule; the static FMSLogo screenshots, the shapes/angle table, and the finished-pattern raster were the usable stills and are embedded.
