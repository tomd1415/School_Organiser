# Conversion notes — Y9 Applying programming skills with physical computing (Teach Computing — adapted)

Bundle: `app/seed-content/lessons/y9-physical-computing-teach-computing-adapted/`
Source: `TeachComputing/KS3/year_9/unit_6/` (BBC micro:bit, MicroPython on the Mu/online editor).
6 lessons converted (3 build-up + 3 project). Target course: Computing Curriculum (KS3).
Self-verify: PASS — JSON valid; every manifest `file` on disk; every `{{res:…}}` resolves; all activity
worksheets have a 📷 screenshot field; all decks parse (≥4 slides) with `> 🧑‍🏫` notes; slide titles end `.md`;
level sections slice (support shows support Q only, etc.); no single-radio multi-correct.

Question-type variety used: card-sort (L1, L2-match, L4, L6), label-a-diagram (L1 board), Parsons code
(L2, L3, L5), order/sequence non-code (L3 circuit, L4 design steps), multi-select (L3 pins), matching
(L1, L4, L6), fill-in-the-blank (L1, L2, L3, L5), code box (L1, L2), slider/rating (L5, L6 plenaries),
single-choice + text throughout.

## §7a Alignment tables

### L1 — Hello physical world
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe what the micro:bit is | S3 "Meet the micro:bit", S4 "Know your tools" | starter label-a-diagram (shared); activity "back of board" image |
| list input and output devices | S2 starter, S3–S4 | starter card-sort input/output (shared); Support MC "an input is…"; Core "phone output"; Challenge "display in/out?" |
| write and run a Python program | S5 "Hello there!" (I-do), S6 you-do | activity Predict; Support fill-blank (import/display/scroll) + match (flash/scroll); show-your-work |
| find and fix a syntax error | S5 notes, S6 | activity Challenge "what's wrong + correct line" (code) |

### L2 — Bare bones
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| use the LED display for output | S2 starter, S3 "Output" | starter match (display→shows…); Support fill-blank set_pixel |
| read a sensor or button for input | S2, S4 "Input" | starter match (light/accelerometer); Core read_light_level meaning |
| use a while True loop | S4 | activity Predict (counter) + Core "why while True" |
| change a program to respond to a button | S4 we-do, S5 you-do | activity Parsons (counter order) + Challenge bounds-check (code); show-your-work |

### L3 — Connections
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| use a pin to send output (LED/speaker) | S3 "The pins", S4 | starter order (close circuit); activity sort (output uses); Support fill-blank 3V |
| use a pin to read input (switch/touch) | S3, S4 | activity sort (input uses); Support fill-blank read_digital |
| send/receive a radio message | S4 radio, S5 you-do | activity Predict (ping receiver) + Parsons ("pass the love"); Core radio.config/group + str() |
| explain a closed circuit | S2 starter | starter order task + Support MC "circuit is closed"; Challenge "shake-on-one → heart-on-other" |

### L4 — Dream it up
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe a project for a problem + audience | S3 examples, S4 "How to design" | activity MC (pick idea) + Core problem/audience (text) |
| break a project into features | S4, S5 you-do | activity order (design steps) + Challenge decompose |
| list input/processing/output of a feature | S2 starter | starter card-sort I/P/O (shared); Support MC; Challenge I/P/O of a feature |
| choose hardware components | S5 | activity Support match (project→component); Challenge "components" |

### L5 — Build it up
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| build a prototype that follows the plan | S3 "journey", S4 you-do | activity show-your-work (prototype link + screenshot) + ✅ checklist |
| use a "wait for the button" pattern | S2 starter | starter Parsons (flag/while); activity Predict + Support fill-blank running_time; Core "why flag not while True"; Challenge elapsed time |
| give and use peer feedback | S5 pause | activity "Peer feedback" section (liked / improve / response) |
| record a problem and a fix in the diary | S5 | activity Core "one problem + fix"; plenary confidence slider |

### L6 — Wrap it up
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| finish + test against the plan | S3 "Finishing touches" | activity show-your-work (finished project) + ✅ checklist |
| document what I built | S4 "Document and reflect" | activity "Document your prototype" boxes (what/problem-audience/components) |
| reflect on a problem + what I'd change | S4 | activity Core "problem solved"; Challenge "do differently"; confidence slider |
| compare the micro:bit with another platform | S2 starter, S5 "Other platforms" | starter card-sort microcontroller vs full computer; Support match platform→description; Core micro/full diff; Challenge HD-video platform |

## Image gaps (logged for sourcing/creating later)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L3 Connections | "pins" slide + Pins worksheet | the makeshift-switch + speaker-jack wiring illustrations | ⚠️ Source wiring diagrams are PowerPoint **shapes**, not extractable rasters. Embedded the front board (pins 0/1/2/3V/GND visible) instead. Re-draw as stills to enable an order/label "build the circuit" task. |
| L4 Dream it up | "How to design" slide | the project design-process flow diagram (problem→…→components) | ⚠️ PPT shape diagram, not a raster. Rendered the steps as an `order` task instead. |
| L5 Build it up | "journey of a project" slide | design→build→feedback→refine→finish process visual | ⚠️ PPT shape diagram. Conveyed as a text list on the slide. |
| L6 Wrap it up | "Other platforms" slide | a clean Raspberry Pi + Arduino comparison photo/strip | ⚠️ Source decks reuse generic 3D-modelling clipart; no clean platform photo. Card-sort + matching cover the concept; a real photo strip would help. |

Embedded OK (all OGL, Teach Computing © Raspberry Pi Foundation): micro:bit front (L1 deck `image22`),
micro:bit back-labelled (L1 deck `image25`), micro:bit display/corners (L2 deck `image18`); front reused
for L3 to point at the GPIO pins.

## Video
No embeddable source video in any lesson zip — the only moving media were an external YouTube link
(input/output devices, `youtu.be/jzwa-HegLk4`) and decorative animated GIFs (excluded per the
no-animation / low-arousal default). Nothing to attach.

## Wanted-but-unbuilt question types
None. All demand was met by the now-built types (card-sort, order, label-a-diagram, slider) plus the
existing Parsons / matching / multi-select / fill-blank / code. Backlog stays empty
(WORKSHEET_QUESTION_TYPES.md §2).

## Other notes
- L1 lesson-plan docx text truncated at a table boundary under `docxText` (Activity 2 onward in a table);
  recovered the remaining flow from the unit guide + worksheets + slide structure — no content lost.
- The unit's individual **summative quiz** (`Summative assessment … Y9.docx`) and the **project rubric** are
  unit-level assessment artefacts, not per-lesson worksheets; not converted here. L6's activity worksheet
  carries a short platforms/microcontroller review that mirrors the quiz's recall items; flag the full quiz
  for separate import if a native assessment is wanted.
- The four L4 example proposals (clicker / guess-the-number / music keys / password) are summarised on L4's
  slides + the matching question rather than reproduced verbatim (they are teacher exemplars).
