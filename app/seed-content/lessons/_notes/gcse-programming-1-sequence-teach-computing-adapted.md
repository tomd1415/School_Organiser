# Conversion notes — GCSE Programming part 1 — sequence (Teach Computing — adapted)

Slug: `gcse-programming-1-sequence-teach-computing-adapted`
Course: OCR J277 GCSE Computer Science · **KS4**
Source: `TeachComputing/GCSE/unit_1/` (L1 Translators, L2 Sequence, L3 Variables, L4 Input, L5 Flowcharts).
No summative/rubric docx exists in this unit folder (the unit guide lists L6–L8 — Randomisation,
Arithmetic, Selection — but those zips are NOT in unit_1, so nothing to fold into a final quiz). 5 lessons converted.

Question-type variety used: order, card-sort, parsons (code), matching, fill-in-the-blank (prose),
single-choice, multi-step text, code field, screenshot. No single-radio multi-correct anywhere.

## §7a alignment tables

### L1 — Translators
| Objective ("I can…") | Slide(s) | Worksheet Q / level |
|---|---|---|
| computers need exact instructions | S Starter, S "Humans guess" | starter card-sort (Humans/Computers); starter Support tick; Challenge text (off-path sprite) |
| difference high- vs low-level | S "Machine code", S "high-level languages", S "today" | activity matching (Support: 4 terms↔meanings); activity order block (journey) |
| why a translator is needed | S "From machine code…" | activity Core fill-blank (CPU) + Core text "why translators?" |
| compiler vs interpreter | S "Compiler or interpreter?" (recipe) | activity Challenge text (advantage of compiler) |

### L2 — Sequence
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| tools an IDE gives | S "What is an IDE?" | (taught/recap; assessed via show-your-work using the IDE) |
| run a program of subroutines | S "I do welcome()", S video | activity Show your work (Trinket link + screenshot) |
| predict a sequence | S "We do — predict Twinkle" | activity Predict text; Core "what is shown / why rhyme stops" |
| spot syntax & logic errors | S "I do" (deliberate errors) | activity Support card-sort (syntax vs logic); Challenge Parsons (order the calls) |

### L3 — Variables
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| meaningful variable names | S "Naming conventions" | starter MC (best file name); activity Support card-sort (good/bad names) |
| why we need variables | S "A variable is a named box" | activity Predict; Core matching (declaration/initialisation/assignment) |
| explain assignment | S "We do — silly sentences" | activity Core fill-blank (noun = "Car"); Challenge text (one value at a time) |
| print a variable | S "I do" | activity Show your work (code field + Trinket link + screenshot) |

### L4 — Input
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| use input() | S "I do — input()", S video | activity Predict; Show your work (Trinket link + screenshot) |
| name the five data types | S "We do — five data types" | activity Support card-sort (integer/real/string/Boolean) + recall plenary |
| cast with int()/float() | S "We do — casting" | activity Core fill-blank (int); Core text (input() gives a string) |
| what a runtime error is | S "We do" (ValueError) | activity Challenge text (type "nine" for age) + validation text |

### L5 — Flowcharts
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| name flowchart symbols | S "The flowchart symbols" | activity Support matching (4 symbols↔use); starter Support tick |
| follow a flowchart → code | S "We do — follow the flowchart" (pair prog) | activity Challenge code field (first chatbot steps) |
| design a flowchart | S "Your turn — design", S Flowgorithm video | activity Core order block ("always 3" steps); Show your work (flowchart screenshot) |

## Image gaps (logged — none invented)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L5 Flowcharts | starter slide; symbols slide; activity (translate/design) | the actual flowcharts (Lesson-2 program flowchart, "Susan from Space" chatbot flowchart, symbol key) | ⚠️ source flowcharts are PowerPoint **shapes**, not rasterisable — `extractOfficeImages` returns only header screenshots. Used pair-programming illustration instead; a clean flowchart raster + a labelled-symbol image would unlock a **label-a-diagram** task here. |
| L1 Translators | "Machine code" slide | a machine-code / assembly side-by-side example | ⚠️ source examples are styled text boxes (PPT shapes), not images — left as taught text. |
| L4 Input | data-types slide | a "five data types" infographic | ⚠️ source uses clipart only; embedded the real code screenshot instead (stronger). |

Embedded code screenshots (the brief's steer): L2 welcome() program, L3 silly-sentences code, L4 mini-data-collection
code — all genuine source stills. Plus L1 Fortran manual + popular-languages chart; L5 pair-programming.
Videos included (teacher-played hooks, motion+sound flagged): L2 + L4 live-coding .webm, L5 Flowgorithm .webm.

## Wanted-but-unbuilt question types
None. All demand was met by built types (order, card-sort, parsons, matching, fill-blank, choice, code,
screenshot). A **label-a-diagram** task was *desirable* for L5 flowchart symbols but is blocked by the
missing flowchart raster (see image-gap log), not by a missing type — so it is logged as an image gap, not
a type gap. WORKSHEET_QUESTION_TYPES.md §2 backlog remains empty.
