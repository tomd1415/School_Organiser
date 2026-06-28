# Conversion notes — gcse-programming-3-iteration-teach-computing-adapted

**Source:** TeachComputing GCSE `unit_4` (Programming part 3: Iteration), lessons L12–L17.
**Target:** OCR J277 GCSE Computer Science · **KS4** · active scheme.
**Lessons authored:** 5 (L16 + L17 are one combined plan/zip → one double-lesson bundle entry).
**Folded summative:** the unit has no separate summative docx, so an **Iteration unit quiz** worksheet
(`l5-iteration-unit-quiz-worksheet.md`) was authored and attached to the final lesson as the unit review.

Self-verify (pure-function render, no DB): all worksheets render; every **activity** worksheet + the quiz
has a 📷 screenshot field, a ✅ checklist, and Support/Core/Challenge level slicing; all `parsons`/`order`/
`sort`/`multichoice`/`scale`/`blank`/`code`/`choice` fields parse in their level sections; all 5 decks parse
(≥4 slides) with `> 🧑‍🏫` teacher notes. Starter worksheets intentionally carry no screenshot field (no
"make" artefact), as in the Y7 pilot.

---

## §7a alignment — Lesson 1: While loops (L12)

| Objective ("I can…") | Slide(s) | Worksheet Q / level |
|---|---|---|
| explain what iteration (a loop) means | S2 starter (fish), S3 | starter: iteration MC (Support), define (Core), infinite-loop word (Challenge) |
| read a while loop and say when it stops | S4 predict | activity: predict, True/False fill-blank (shared) |
| change an if into a while loop | S4–S5 | activity: "why input inside the loop" (Core), guess-the-word **Parsons** (Support) |
| extend a guess the number game | S5 | activity: **code** field — add a guesses counter (Challenge) + 📷 show-your-work + ✅ |

## §7a alignment — Lesson 2: Trace tables (L13)

| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| use a trace table to walk through a while loop | S2 starter, S3 (code screenshot) | starter: predict outputs; **order** the loop steps (shared) |
| record the variable and condition at each step | S3–S4 | activity: fill-blank trace outputs (shared); condition-check MC (Support) |
| use a trace table to find a logic error | S5 | activity: "what is wrong" (Core); **code** rewrite the buggy 5× loop (Challenge) + 📷 + ✅ |

## §7a alignment — Lesson 3: For loops (L14)

| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe what a for loop does | S2 starter (code screenshot), S3 | starter: for-loop MC (Support); card-sort for-vs-while (Support) |
| read a for loop that uses range() | S3–S4 | starter: lines-printed (Core), why-stops-at-10 (Challenge); activity: range **matching** (shared) |
| modify the times table program | S5 | activity: **code** — add input()/int(), range 1–12 (Challenge) + 📷 + ✅ |
| compare a for loop and a while loop | S6 plenary | activity: **card-sort** definite vs indefinite (Support); Core investigate Qs |

## §7a alignment — Lesson 4: Data validation (L15)

| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| explain why programs need data validation | S2 starter, S3 | starter: validation MC (Support); "why a bad input crashes" (Core); robustness (Challenge) |
| sort inputs into Correct/Out of range/ValueError/Empty | S2 | starter: **card-sort** (shared) — 4 categories from the A1 "Sort the data entry" sheet |
| use a while loop with try/except to validate input | S4 live code | activity: True/False fill-blank (shared); validation **Parsons** (Support); try/except MC (Core) |
| add a range check | S5 | activity: **code** — add `if 1 <= number <= 10` (Challenge) + 📷 + ✅ |

## §7a alignment — Lesson 5: Pseudocode & FizzBuzz (L16/L17, double)

| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe what pseudocode is and why we use it | S2 starter, S3 | starter: will-it-run MC, pseudocode MC (Support), non-Python word (Core), planning (Challenge) |
| match pseudocode to Python code | S4 (code screenshot) | activity: pseudocode↔Python **matching** (shared) |
| translate pseudocode into Python | S4 | activity: **code** — translate the password program (Core) |
| design an algorithm in pseudocode (FizzBuzz) | S5 (FizzBuzz image) | activity: **order** the FizzBuzz rules (Support); **code** FizzBuzz (Challenge) + 📷 + ✅ |
| (unit review — folded summative) | n/a | **Iteration unit quiz**: matching, card-sort, multi-select, fill-blank, 2× code, **scale** confidence, 📷, ✅ |

Single-correct check: every `( )` choice cell has exactly one defensible answer; the only multi-correct
question (for-loop facts, quiz) uses the **multi-select `[ ]`** type. No single-radio multi-correct anywhere.

---

## Image gaps (WORKSHEET_QUESTION_TYPES.md §4)

| Lesson / where | What image is wanted | Source had one? |
|---|---|---|
| L1 While loops — embedded | infinite-loop concept | ✅ used the deck's "Do you enjoy fish?" robot illustration (`image8`) |
| L2 Trace tables — activity + slide | while loop + its trace table | ✅ used the deck's worksheet screenshot (`image2`) — real code + table |
| L3 For loops — starter + slide | a for loop using range() | ✅ used the deck's "Predict" worksheet screenshot (`image3`) — real code |
| L4 Data validation — activity/slide | a **try/except inside a while** code screenshot | ⚠️ **none in source** — deck images were icons + a Parson's-header title + a generic pupils-at-laptop photo. Code shown as worksheet text only. **Gap: source a clean validation-loop code still.** |
| L5 Pseudocode — activity + slide | pseudocode→Python translation | ✅ used the deck's worksheet screenshot (`image1`) — password pseudocode |
| L5 FizzBuzz — slide + (quiz design) | the FizzBuzz sequence/output | ✅ used the deck's scenario screenshot (`image2`) |

Recurring theme (matches the Y7/Y8 log): most code on the TCC slides is **live PowerPoint text/shapes**, not
rasters, so `extractOfficeImages` only pulls the few **worksheet-page screenshots** the decks embed (which is
exactly why L13/L14/L16 had usable code stills but L15 did not).

## Source videos — NOT embedded (logged decision)

Two source videos were found and deliberately **left out** of the bundle:
- `L12 Resource_ Teacher live code …webm` (**19.3 MB**)
- `L15 A2 Resource_ Live coding.webm` (**15.2 MB**)

Reasons: (1) both lesson plans state the video is **"for the teacher to prepare… not meant for learner
use"** — they are teacher-prep screen-recordings, not learner-facing hooks like the Y7 countdown clip;
(2) at 15–19 MB each they are far too heavy for plain-git bundles (the pilot's embedded clip was ~360 KB);
(3) they are continuous-motion screencasts, against the low-arousal SEND default. They remain available in
the git-ignored source tree if the teacher wants to play them while live-coding. If wanted later, transcode
to a short trimmed clip before embedding.

## Wanted-but-unbuilt question types

**None.** Every question landed on a built type. Heavy, well-fitting use of the four newer types:
- **order** (non-code): L2 starter (while-loop steps), L5 activity (FizzBuzz rules).
- **card-sort**: L3 (for vs while), L4 starter (the 4 validation categories), quiz (loop types).
- **slider/scale**: quiz confidence plenary.
- **parsons** (code): L1 (guess-the-word), L4 (validation loop).
- plus **matching** (L3 range→count, L5 pseudocode↔Python), **fill-blank**, **code**, **multi-select** (quiz).
No `label`-a-diagram used: no clean unlabelled diagram in source to set hotspot coordinates on (the code
stills are screenshots of full worksheet pages, not labellable parts).
