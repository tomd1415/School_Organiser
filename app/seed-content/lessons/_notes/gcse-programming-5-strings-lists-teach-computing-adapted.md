# Conversion notes — GCSE Programming part 5 — strings and lists (Teach Computing — adapted)

Slug: `gcse-programming-5-strings-lists-teach-computing-adapted`
Course: OCR J277 GCSE Computer Science (keyStage **KS4**). Scheme mapping: GCSE → course 3.
Source: `TeachComputing/GCSE/unit_7/` lessons L25–L34/35 (the unit's 10 lesson zips, in folder order).
10 native lessons (L34/35 is one double lesson + project). Sibling `gcse-programming-4-subroutines-…`
used as the style template. Seeded onto the dev DB as unit 1041 (10 lessons, 35 resources).

This unit has **no separate summative exam docx** — its assessment is the L34/35 noughts-and-crosses
**project + rubric**. That is folded in as the final **`l10-strings-lists-unit-quiz-worksheet.md`** (whole-unit
quiz) on L10, with the project tasks/rubric reflected in the L10 activity worksheet + slide teacher-notes.

Question-type variety used: matching, multiple-choice, multi-select, fill-blank, **card-sort**, **order**,
**Parson's (code)**, **slider**, code, screenshot, checklist. No single-radio multi-correct cells.
Self-verify (render + S/C/C slice + slides notes + placeholder/manifest + DB resolution) **PASS**.

---

## L1 — GUIs: Tkinter & event-driven programming  [TCC L25]

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| describe GUI / event-driven | S2 starter, S3 | starter Support choice (×2); activity card-sort procedural/event-driven |
| build a Tkinter window with widgets | S3, S4 we-do | activity Key-words matching (widget/Tkinter/event loop); Core "why command=add not add()" |
| make a button call a subroutine | S4 | activity Support Parson's (the `add` subroutine); Core which line is last |
| make an app that adds two numbers | S4 you-do | activity Challenge Joke machine (code) + show-your-work |

Images: `l1-add-two-numbers-app` (real Tkinter app screenshot), `l1-joke-machine-app` (radio-button GUI).

## L2 — String handling I: length, indexing, iterating  [TCC L26]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| find length with len() | S3 | starter (predict len/index); activity Support choice |
| get a character by index | S2 starter, S3 | starter Support choice; activity fill-blank (word[0], word[?]) |
| iterate over a string (for loop) | S4 we-do | activity Support Parson's (count_e loop) |
| count matching characters | S5 you-do | activity Core (count a typed character) + Challenge guess-the-word (code) + show-your-work |

No image (code shown live; worksheet code screenshots reproduced as `python` blocks — clearer for SEND).

## L3 — String handling II: substrings, in, ASCII  [TCC L27]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| take a substring (slicing) | S2 starter, S3 | starter (predict word[1:4]); activity fill-blank (name[0:2], name[?:?]) |
| use the in operator | S4 | activity matching (technique ↔ effect) |
| use chr() and ord() (ASCII) | S4 | activity matching; fill-blank (chr(65)); Challenge decoder (code) |
| build a program with substrings | S5 you-do | activity Support Parson's (username) + Core year-group checker (code) + show-your-work |

Strongest **fill-blank string-slicing** lesson (per brief). No image (ASCII table reproduced inline).

## L4 — String handling III: secure password  [TCC L28]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| plan steps in order | S3 I-do | activity **order** block (6 steps of the algorithm) |
| join strings (concatenation) | S4 we-do | activity Core (join 3 words, lower-case) |
| randomise with chr() | S2 starter, S4 | starter (predict chr(randint(65,90))); activity Challenge generator |
| build a secure password generator | S5 you-do | activity Support Parson's (replace a letter) + Challenge full generator (code) + show-your-work |

Plenary = anagram key-words as a **matching** question. No image (build lesson).

## L5 — Arrays and lists: Simon says, append/remove  [TCC L29]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| array vs list | S3 | activity **card-sort** (static array facts vs dynamic list facts) |
| create a list / index | S2 starter, S3 | starter (predict words[2]); activity Key-words matching |
| append to a list | S4 we-do | activity fill-blank (append/remove/index) + Core shopping list (code) |
| remove from a list | S4 | activity Challenge add-or-remove (code) + Support Parson's (Simon says) + show-your-work |

## L6 — List methods: deck of cards  [TCC L30]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| traverse a list (for loop) | S2 starter | starter (predict the loop output) |
| use list methods | S3 I-do | activity **matching** (method ↔ effect — append/remove/sort/reverse/count) |
| build a deck with a nested loop | S4 we-do (deck image) | activity Support Parson's (nested loop) + Core (why str(x), expect 52) |
| write a function that returns a list | S5 you-do | activity Challenge `make_deck()` (code) + show-your-work |

Images: `l6-deck-of-cards` (the full 52-card pixabay deck from the worksheet, OGL).

## L7 — Sense HAT I: lists & the LED matrix  [TCC L31]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| start a Sense HAT program / show a message | S2 starter, S3 | starter Support choice (LED matrix / RGB) |
| use RGB values | S3 I-do | activity matching (RGB code ↔ colour) + fill-blank (blue, text_colour) |
| use a list to light the matrix | S4 we-do | activity Support Parson's (coloured message) + Core (green message) |
| make a pixel character | S4 you-do | activity Challenge own 8×8 character (code) + show-your-work |

No flashing/animation — output is the calm 8×8 LED grid; flagged in slide teacher-notes. No image (the
worked-example smiley is reproduced as a `python` 8-rows-of-8 list, clearer than the rendered LED still).

## L8 — Sense HAT II: random pixels, Magic 8-ball  [TCC L32]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| use choice() for a random item | S2 starter, S3 | starter (predict choice); activity fill-blank (choice/append) |
| append random items | S4 we-do | activity **order** (6 steps of the random grid) + Core (append 64 in a loop) |
| light the matrix with a random grid | S4 | activity Support Parson's (random pick) |
| build a Magic 8-ball | S5 you-do | activity Challenge 8-ball (code) + show-your-work |

## L9 — 2D lists: rows, columns, password manager  [TCC L33]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| describe a 2D list | S3 I-do | starter Support choice |
| access row / item (two indexes) | S2 starter, S3 | starter (predict scores[1][2]); activity fill-blank + matching (code ↔ output) |
| change and append in a 2D list | S4 we-do (2D-code image) | activity Support Parson's (access) + Core (change + print) |
| build a 2D-list program | S5 you-do | activity Challenge password manager (code) + show-your-work |

Images: `l9-2d-list-code` (real 2D-list code screenshot from the Password manager worksheet, OGL).
"Do NOT use real passwords" reminder carried into the slide + worksheet.

## L10 — 2D lists project: noughts and crosses (double lesson)  [TCC L34/35] + summative folded in

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| decompose using a structure chart | S3 | starter card-sort (testing) + activity **order** (build order) |
| use a 2D list for the board | S4 we-do | activity Core (place X/O pieces) |
| build and test the game | S5 you-do | activity Support Parson's (displayboard) + Challenge check_win (code) + test table + show-your-work |

Summative folded in as **`l10-strings-lists-unit-quiz-worksheet.md`** (whole-unit: key-word matching,
string-slicing fill-blank, list-methods **multi-select**, 2D-index fill-blank, write code, confidence
**slider**) — the unit's final assessment in place of the TCC noughts-and-crosses rubric. The rubric
criteria (instructions, places a piece, displays, switches players, plays to a win, announces winner,
validation, testing) are reflected in the L10 activity tasks + slide teacher-notes.

---

## Image gaps (for WORKSHEET_QUESTION_TYPES.md §4 — recorded here per the bundle convention)

| Lesson | Where | Wanted image | Source had one? |
|---|---|---|---|
| L2 String handling I | S3 indexing | a clean "boxes 0..n under the word" index diagram | ⚠️ PPT animation only — drew the boxes on the board instead (teacher-note) |
| L3 String handling II | S3 slicing | a slice diagram showing `[1:4]` highlighting index 1–3 | ⚠️ PPT shape/animation — reproduced as index prose + fill-blank |
| L4 String handling III | S2/S5 | the example secure-password output | ⚠️ source only shows it as text; reproduced inline |
| L5 Arrays and lists | S3 | a list-with-indexes visual (boxes 0,1,2,3) | ⚠️ PPT animation — board-drawn |
| L7 Sense HAT I | S3/S4 | a rendered smiley **LED matrix** still | ⚠️ the source smiley is drawn by the slide's `set_pixels` animation, not a raster — reproduced as a code grid |
| L8 Sense HAT II | S3 | a rendered random-colour LED grid + alien still | ⚠️ same — LED output is animated in the deck, not a still |
| L10 Noughts & crosses | S3 | the **structure chart** (boxes: identifier/parameters/return) | ⚠️ chart is a PPT shape diagram — not extractable; described in prose + the `order` build task |

Recurring theme (matches the Y7/Y8/GCSE batch note): TCC's index/slice/scope/structure-chart and LED-output
diagrams are **vector shapes or per-slide animations inside the .pptx**, so `extractOfficeImages`
(raster-only) can't pull them. The genuinely rasterised stills that DID come through were embedded: the two
**Tkinter app screenshots** (L1), the **52-card deck** (L6, pixabay/OGL), and a **2D-list code screenshot**
(L9). These diagram gaps want re-drawing or a render step.

## Wanted-but-unbuilt question type

| Lesson | Worksheet | Type wanted | Why | §2 category |
|---|---|---|---|---|
| L2 / L3 | activity (iterate / slice) | **Interactive trace table** (auto-marked grid) | tracing a string loop / slice char-by-char is a core OCR J277 skill | §2.7 (NOT BUILT) — stop-gapped with fill-blank/choice cells + show-your-work |

No other type-gaps — order/card-sort/matching/multi-select/slider/Parson's all covered the demand. (The
"label a diagram" type would suit an LED-matrix grid or a 2D-list grid once a clean unlabelled grid image
exists — logged in the image-gap table above rather than as a type gap.)

## Source-fidelity notes
- L25 Tkinter add-two-numbers + joke machine; L26 len/index/iterate (guess-the-word); L27 slice + in + ASCII
  (username, year-group, decoder); L28 secure-password generator; L29 Simon-says + shopping list; L30 deck of
  cards + list methods + return-a-list; L31 LED matrix smiley; L32 random pixels + Magic 8-ball; L33 word play
  + password manager; L34/35 noughts-and-crosses project — all preserved from the TCC plans/worksheets,
  re-authored to SEND low-load native format.
- TCC **live-coding demonstration videos** (L30 A3/A4 custom-built functions) were NOT bundled: large teacher
  demonstrations of on-screen typing, not pupil-facing hooks — reproduced as a worked example on the slide +
  worksheet (the `make_deck()` Challenge). Logged here as a deliberate omission.
- The `random` module (randint/choice/shuffle) and the Sense HAT emulator (Trinket) are referenced as the
  pupils encounter them; no pupil names anywhere (cohort-level prose only).
