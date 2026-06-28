# Conversion notes — GCSE Computer systems (Teach Computing — adapted), Part 2 (lessons 8–13)

Bundle: `gcse-computer-systems-teach-computing-adapted__pt2`
Source: `TeachComputing/GCSE/unit_2` (L8–L13) + `Unit guide_2_Computer Systems_KS4_v1.2.docx`
Course / scheme: OCR J277 GCSE Computer Science (KS4). Pairs with Part 1 (`__pt1`, lessons 1–7).

Part 2 covers: computer specifications, a revision quiz project, logic gates / Boolean logic
(one- and three-input), and assembly language programming (LMC). Each lesson = starter worksheet +
activity worksheet + slide deck (resource title ends `.md`), plus carried-over OGL images.

## Question types used
- **Matching** (term ↔ meaning): factor↔effect (L8), code-line↔action (L9), gate↔rule (L10/L11),
  LMC command↔meaning (L12) — single-correct per row, auto-marked.
- **Multiple choice** (single tick) and **multi-select** (`[ ]`, L9 starter "tick all true").
- **Card-sort** (```sort```): hardware vs software build (L8); gate behaviours by everyday example (L10).
- **Order** (```order```, prose steps): the logic-problem method (L11); the decision steps (L13).
- **Parsons** (```parsons```, code): order the add program in LMC assembly (L12).
- **Code**: Python design (L9, L12), assembly programs (L12, L13).
- **Fill-blank** (`[[ ]]`): binary→denary (L10), binary carry (L11), Boolean expressions (L11).
- **Truth-table tick grids**: AND/OR/NOT and three-input rows done as tick-the-output (0/1) MCQ rows
  (auto-marked; binary-order inputs per the exam convention).
- **Screenshot** (`📷`) + link/code show-your-work on every activity worksheet.

No new type-gap. Verified with the render engine: all activity worksheets expose a screenshot field;
choices/matching/multi-select/blank auto-mark; sort/order/parsons/code parse; every deck slices for
support/core/challenge and has teacher notes.

## §7a alignment — objective ↔ slide ↔ worksheet

### L8 Computer specifications
| Objective | Slide | Worksheet Q |
|---|---|---|
| name the factors (clock/cache/cores) | S "Three things…" | activity: match factor→effect |
| describe what each factor does | S "Three things…", S "Compare two processors" | activity Core (cache), Support (faster CPU/cache) |
| say what the motherboard is for | S "The motherboard" | activity: card-sort + motherboard prose |
| build a computer to a budget | S "Build a computer" | activity: show-your-work (PCPartPicker build + screenshot) |
| (starter) the clock's role | S "Starter — the clock" | starter: single-correct clock MCQ |

### L9 Computer systems quiz
| Objective | Slide | Worksheet Q |
|---|---|---|
| predict what a program does (PRIMM) | S "Predict the program" | activity: predict text Q |
| explain read-file + split each line | S "How the questions are stored" | activity: divider Q, Support line-match, Core for-loop/split |
| add own questions + run | S "Make it your own", S "Extension" | activity: challenge code + show-your-work |
| (starter) embedded system recap | S "Starter" | starter: multi-select why embedded |

### L10 Logic gates
| Objective | Slide | Worksheet Q |
|---|---|---|
| recognise AND/OR/NOT + what they do | S "The three gates", S Boole/Shannon | activity: match gate→rule, card-sort examples |
| complete a truth table | S "Truth tables" | activity: tick-output rows (Support NOT / Core AND / Challenge OR+combined) |
| CPU built from gates (1s/0s) | S "A CPU is built from logic gates" | activity: prose + show-your-work (AND-gate circuit) |
| (starter) binary recall | S "Starter — remember binary" | starter: binary→denary tick + blank |

### L11 Logic problems
| Objective | Slide | Worksheet Q |
|---|---|---|
| three-input truth table | S "Build it methodically" | activity: tick-output rows for the camera circuit |
| Boolean expression for a circuit | S "Turn it into a Boolean expression" | activity: fill-blank Picture=(motion OR proximity) AND light; Challenge siren |
| gates combine to add binary | S "Gates do maths" (chips image) | activity: hardware prose + show-your-work |
| (starter) binary add + gate recall | S "Starter — recap and recall" | starter: binary-add tick + blank, gate match |

### L12 Assembly language programming I
| Objective | Slide | Worksheet Q |
|---|---|---|
| 1:1 with machine code | S "High level vs low level" | activity Challenge: explain 1:1 |
| describe INP/OUT/STA/LDA/ADD/SUB/BRP | S "The Little Man Computer" (opcode image) | activity: match command→meaning |
| translate Python→assembly | S "Translate together" | activity: Parsons order of the add program + show-your-work |
| (starter) high-level program | S "Starter" | starter: Python code design |

### L13 Assembly language programming II
| Objective | Slide | Worksheet Q |
|---|---|---|
| translate Python→assembly solo | S "Starter — you are the translator now" | starter: code translation |
| branching (BRP, BRA) | S "Branching makes decisions" (LMC image) | activity: order decision, Support BRA, starter Support/Core/Challenge on branch |
| design + write own assembly program | S "Final project" | activity: Python plan + assembly code + show-your-work |

## Image-gap log (also added to docs/WORKSHEET_QUESTION_TYPES.md §4)
- **L10 logic gates — gate SYMBOL diagrams (AND/OR/NOT shapes):** the brief wanted a label-a-diagram
  of the gate symbols, but the source `.pptx` draws the symbols as **PowerPoint vector shapes**, not
  rasters, so `extractOfficeImages` returns none. Stop-gapped with matching (gate↔rule) + card-sort +
  truth-table tick grids. **Wants:** a clean unlabelled AND/OR/NOT symbol image to unlock a
  `label` task (drag the gate name onto each symbol). Source had none extractable.
- **L8 — CPU spec comparison (1.5GHz vs 3GHz):** the only source visual is a worksheet screenshot;
  used the clock photo for the analogy and a PC-tower clipart for the build instead.
- Images embedded: L8 clock + PC tower; L10 George Boole + Claude Shannon; L11 logic-chips circuit
  board; L12 LMC opcode reference; L13 LMC branching program. All OGL v3.0 (Teach Computing).

## Not converted (out of scope / teacher-run)
- The summative unit assessment (`Summative assessment … KS4.docx`) and learning graphs — these are
  the reference-import half, not native lessons.
- L9 starter files (quiz.py / questions.txt) live at ncce.io/computer-systems-quiz; LMC simulator at
  peterhigginson.co.uk/lmc — referenced in the worksheets/slides, not bundled.

---

## Resource-completeness sweep (2026-06-28)

- **Note 1 — L10 Logic gates (the §4-logged gap, now RESOLVED).** The lesson taught "recognise the AND, OR and
  NOT gates" and the slide said "I-do each gate with the symbol", but the only images were **portraits of Boole
  and Shannon** — pupils never saw the gate symbols. Fixed by **rasterising the source deck** (Gotenberg →
  pdf-to-img) and cropping the **AND** (source slide 18), **OR** (slide 37) and **NOT** (slide 40) symbols;
  embedded as `l10-gate-{and,or,not}.png` on the "three gates" slide and the activity worksheet, with a plain-
  language note on telling them apart (flat back / curved back / triangle-and-circle). Added a visible
  "▶ Your turn" cue to the truth-tables slide.
- **Note 4 — already largely met** for this unit: most decks (L1/L2/L4/L5/L6/L7) already carry a visible
  "## Your turn" cue slide. Only L10 lacked one (added). L3/L8/L11 cue the activity in the we-do teacher note;
  a visible cue could be added on a later pass if wanted.
- Notes 2/3/5 needed nothing: every activity has the 📷 upload field; no separate documents handed out; the
  assembly lessons (L12/L13) already carry their LMC code as Parsons + code blocks.

Re-seeded + verified (file + DB). Gate-symbol images resolve in both the slide and the worksheet.
