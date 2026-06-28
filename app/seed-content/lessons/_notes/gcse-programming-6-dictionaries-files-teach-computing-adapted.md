# Conversion notes — GCSE Programming part 6 — dictionaries and data files (Teach Computing — adapted)

Slug: `gcse-programming-6-dictionaries-files-teach-computing-adapted`
Course: OCR J277 GCSE Computer Science (keyStage **KS4**). Scheme mapping: GCSE → course 3.
Source: `TeachComputing/GCSE/unit_10/` lessons L36–L50 (12 lesson zips, in folder order).
12 native lessons. **L45–48 ("Battle boats code") is one zip covering 4 coding lessons — converted as one
combined lesson (L10).** Sibling `gcse-programming-5-strings-lists-…` used as the style template.

This unit has **no separate summative exam docx** — its assessment is the **Battle Boats project + rubric**
(L43–L50). That is folded in: the project lessons (L8–L12) carry success-criteria / design / code-log /
testing-table / evaluation tasks, and the whole unit's final knowledge check is the
**`l12-dictionaries-files-unit-quiz-worksheet.md`** on L12. The Battle Boats rubric criteria (success
criteria, design, naming conventions, subroutines, commenting, validation, structured approach, user-
friendliness, scenario completed, testing, evaluation) are reflected in the L12 evaluation worksheet + slide
teacher-notes. The L37 Caesar-cipher rubric is reflected in the L2 activity tasks.

Question-type variety used: matching, multiple-choice, **multi-select**, fill-blank, **card-sort**,
**order**, **Parson's (code)**, **slider**, code, screenshot, checklist. No single-radio multi-correct cells.
Self-verify (manifest valid · all 28 files referenced, no orphans · every worksheet renders for S/C/C with
non-zero core fields · every activity/testing/evaluation worksheet has a 📷 screenshot field · slides end
`.md`, have teacher notes, and slice non-empty for support+core · S/C/C content genuinely differs) **PASS**.

> ⚠️ **Slicer gotcha hit & fixed:** `slideDeck.levelOfHeading` / the worksheet level-detector treat the bare
> word **"challenge"** (or support/core, or a 🟢🟡🔴 emoji) in ANY heading as a level divider. The lesson is
> "Dictionary **challenge**", so the L2 deck/worksheet H1 titles (`# Dictionary challenge — …`) made the whole
> document parse as a single "🔴 Challenge" section → core view rendered **zero** fields and the deck sliced to
> **0** slides. Fixed by renaming the three L2 in-file H1 titles to **`# Caesar cipher — …`** (the manifest
> `title` and resource titles keep "Dictionary challenge" — those aren't parsed by the slicer). Worth a guard:
> the level-word test should require the heading to be *only* a level label, not merely contain the word.

---

## L1 — Records and dictionaries  [TCC L36]

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| describe a record (entity + attributes) | S3 I-do (records image) | starter Support choice (row/index recap → bridge); activity Key-words **matching** (entity/attribute/key) |
| use a dictionary to make a record | S4 we-do | activity fill-blank (`player[…]`, key vs index) |
| get and change an attribute by key | S4 | activity fill-blank; Support **Parson's** (make a book record) |
| use a list of dictionaries (database) | S4 you-do | activity Challenge (list of dicts) + show-your-work |

Image: `l1-records-database` (a database table illustration from the L36 deck, OGL).

## L2 — Dictionary challenge: Caesar cipher  [TCC L37]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| describe a dictionary / key–value pair | S3 I-do | starter Support choice; activity Key-words **matching** |
| add a new key–value pair | S3 | activity fill-blank (`{}`, `caesar["C"]=…`) |
| use a dictionary as a Caesar cipher | S4 we-do | activity **order** (5 steps of the cipher); Support **Parson's** (tiny cipher) |
| build a Caesar cipher program | S5 you-do | activity Challenge (full program) + show-your-work |

Image: `l2-encryption-safe` (a locked-safe encryption illustration from the L37 deck, OGL). Starter = crack
`JCV` → HAT. TCC Caesar-cipher rubric reflected in the activity Challenge.

## L3 — Reading text files  [TCC L38]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| why programs use data files | S2 starter (save-progress image) | starter Support choice (data file keeps data) |
| open and read a text file | S3 I-do | activity fill-blank ("r", read, strip); Support **Parson's** (read program) |
| iterate a file and strip `\n` | S4 we-do | activity **order** (open→read→use→close) |
| read lines into a list | S4 | activity Core (lines→list); Challenge (sum of numbers.txt) + show-your-work |

Image: `l3-save-progress` (arcade "NEW HIGH SCORE!" illustration from the L38 deck, OGL).

## L4 — Writing to text files  [TCC L39]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| write to a new file ("w") | S3 I-do | activity **card-sort** (r/w/a modes); Support **Parson's** (write program) |
| "w" overwrites the whole file | S2 starter, S3 | starter predict (read after "w" → error); activity fill-blank |
| append with "a" | S4 we-do | activity Challenge (append a score) + show-your-work |
| use `\n` for new lines | S3–S4 | activity Core (four names, one per line) |

No image (TCC L39's only rasters are worksheet code screenshots — reproduced as `python` blocks; the live-
coding demo videos are described on the slide, not bundled — see source-fidelity notes).

## L5 — Reading CSV files  [TCC L40]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| describe a CSV file | S3 I-do | starter Support choice (CSV / commas) |
| read a CSV into a list | S3 | activity Core (look up a score by name) |
| use `split()` at the commas | S4 we-do | activity **matching** (strip/split/pop ↔ effect) + fill-blank |
| read into a 2D list, find data | S2 starter, S4 | starter predict `players[1][0]`; Support **Parson's**; Challenge (highest rainfall) + show-your-work |

No image (CSV-in-spreadsheet visuals only exist as worksheet screenshots — code reproduced inline; gap logged).

## L6 — Writing to CSV files  [TCC L41]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| data must be a string first | S3 I-do | activity fill-blank (string, `\n`) |
| use `join()` (the mirror of split) | S3 | activity **matching** (split ↔ join) |
| write a 1D list to a CSV | S3 we-do | starter predict; Support **Parson's**; Core (times table → CSV) |
| write a 2D list to a CSV | S4 you-do | activity Challenge (number grid, rows with `\n`) + show-your-work |

No image (same — worksheet code screenshots reproduced as `python` blocks).

## L7 — Being a programmer  [TCC L42]

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| good habits of a programmer | S2 starter, S3 | starter **multi-select** (tick the good habits) |
| meaningful identifiers / conventions | S3 I-do | activity **card-sort** (good vs poor practice) + fill-blank |
| rewrite code a cleaner way | S4 we-do | activity Core (rename + comment "guess the word") |
| append to a CSV | S5 you-do | activity Support **Parson's** (append); Challenge (spelling test) + show-your-work |

No image. "What's the alternative?" + "Append to a CSV" worksheets folded into the one activity sheet.

## L8 — Battle Boats: success criteria  [TCC L43]  (project lesson 1)

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| explain the rules of Battle Boats | S2 starter (unplugged play) | starter Support choice (H = hit, 5 boats) |
| describe success criteria | S3 I-do | activity **card-sort** (good vs vague criterion) + fill-blank |
| break the project into criteria | S3 we-do | activity **order** (the 7 project tasks); Core (write own criteria) |
| spot how an old program helps | S4 plenary | activity Challenge (reuse noughts & crosses) + show-your-work |

No image (the A0 paper grids are printed unplugged; the scenario's grid figures are .docx table shapes, not
rasters). Battle Boats is the unit's **summative project** — runs L8–L12.

## L9 — Battle Boats: design  [TCC L44]  (project lesson 2)

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| describe pseudocode / flowcharts | S3 I-do | starter Support choice (randint range) |
| read TCC pseudocode | S3 | activity **matching** (Python ↔ pseudocode `<-` / OUTPUT / WHILE) + fill-blank |
| design a task (pseudocode/flowchart) | S4 we-do | activity **order** (design steps); Core (design the menu) |
| use success criteria to guide design | S4 | activity Challenge (design the player's turn) + show-your-work |

No image (the TCC pseudocode reference + example flowchart are .docx tables — the pseudocode mapping is
reproduced as the matching question; gap logged).

## L10 — Battle Boats: code (four-lesson build)  [TCC L45–48]  (project lessons 3–6)

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| keep a code log | S2 starter | starter Support choice (build-as-you-go) |
| build one subroutine at a time | S3 I-do | activity **order** (build order of subroutines) + fill-blank (2D list) |
| test each part as you build | S4 we-do | activity Core (place a boat, check empty) |
| build Battle Boats (towards Task 7) | S5 you-do | Support **Parson's** (display-board); Challenge (player's turn) + code log + show-your-work |

One combined lesson (the zip covers TCC lessons 45–48, ~200 mins). No image. The **code log** is folded into
the activity worksheet (worked/challenging/next-steps prompts).

## L11 — Battle Boats: testing  [TCC L49]  (project lesson 7)

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| describe normal/boundary/erroneous data | S2 starter | starter **matching** (test type ↔ meaning) |
| write a test plan from success criteria | S3 I-do | activity **card-sort** (sort inputs into the 3 types) + fill-blank |
| record expected vs actual | S3 we-do | activity test-plan **grid** (description/input/expected/actual) + Core |
| find and fix a bug | S4 you-do | activity Challenge (a bug + the fix) + show-your-work |

No image. Testing-table grid reproduced as a markdown table (the interactive trace/grid is logged §2.7).

## L12 — Battle Boats: evaluate (+ unit quiz)  [TCC L50] + summative folded in  (project lesson 8)

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| explain why evaluation matters | S2 starter | starter Support choice (compare to criteria) |
| evaluate against success criteria | S3 I-do | evaluation worksheet (task-by-task yes/partly/no choice + reason) |
| describe strengths / what I'd change | S4 we-do | evaluation Core (strengths/weaknesses) + **slider** (confidence) |
| submit the finished project | S5 plenary | evaluation Challenge (which explorer task) + show-your-work |

Summative folded in as **`l12-dictionaries-files-unit-quiz-worksheet.md`** (whole-unit: key-word **matching**,
dictionary fill-blank, file-modes **multi-select**, reading-a-file **Parson's**, CSV split/join **matching**,
write code, confidence **slider**) — the unit's final knowledge check in place of a separate exam, alongside
the Battle Boats project + rubric.

---

## Image gaps (for WORKSHEET_QUESTION_TYPES.md §4 — recorded here per the bundle convention)

| Lesson | Where | Wanted image | Source had one? |
|---|---|---|---|
| L1 Records | S4 dictionary | a clean "dictionary = key→value boxes" diagram | ⚠️ PPT shape/animation — used the records table illustration instead |
| L4 Writing files | S3 modes | a "w wipes / a adds" before-after of a file | ⚠️ only worksheet code screenshots — card-sort + prose used |
| L5 Reading CSV | S3 | a CSV shown in a text editor **vs** a spreadsheet (the same data) | ⚠️ source has it only as worksheet screenshots — reproduced as prose + code |
| L6 Writing CSV | S3 | the resulting CSV opened in a spreadsheet grid | ⚠️ same — code reproduced inline |
| L8 Battle Boats | S2/scenario | the 8×8 fleet grid + target tracker (with H/M/B) | ⚠️ the grids are .docx **table shapes**, not rasters — printed as the A0 unplugged sheet |
| L9 Design | S3 | the example **flowchart** + pseudocode reference | ⚠️ .docx tables / shapes — pseudocode reproduced as the matching question |
| L10 Code | S3 | the structure chart of the Battle Boats subroutines | ⚠️ PPT shape diagram — described in prose + the `order` build task |

Recurring theme (matches the whole TCC batch): the index/CSV-grid/flowchart/structure-chart/board diagrams are
**vector shapes or per-slide animations inside the .pptx/.docx**, so `extractOfficeImages` (raster-only) can't
pull them. The genuine rasterised **illustrations** that DID come through were embedded: the **records
database table** (L1), the **encryption safe** (L2), and the **arcade high-score** (L3). The many code
screenshots in the worksheets were deliberately reproduced as `python` blocks (clearer for SEND than a
screenshot, and selectable text).

## Wanted-but-unbuilt question type

| Lesson | Worksheet | Type wanted | Why | §2 category |
|---|---|---|---|---|
| L11 | testing table | **Interactive trace/test grid** (auto-marked grid) | a Battle Boats test plan is exactly the grid in §2.7 (description/input/expected/actual) | §2.7 (NOT BUILT) — stop-gapped with a markdown table + text cells + show-your-work |

No other type-gaps — matching/MCQ/multi-select/fill-blank/card-sort/order/Parson's/slider/code/screenshot all
covered the demand. (A "label a diagram" task would suit the 8×8 battle-boats grid once a clean unlabelled grid
image exists — logged in the image-gap table above rather than as a type gap.)

## Source-fidelity notes
- L36 records-as-dictionaries (make a record / make a database); L37 Caesar cipher with a dictionary; L38
  read text files (read/readline/readlines/strip); L39 write + append (w/a, `\n`); L40 read CSV (split, 1D &
  2D list); L41 write CSV (str + join, 1D & 2D); L42 good habits + cleaner alternatives + append-to-CSV; L43–50
  the **Battle Boats** summative project (play → success criteria → design → code ×4 → test → evaluate) — all
  preserved from the TCC plans/worksheets, re-authored to SEND low-load native format.
- TCC **live-coding demonstration videos** (L39 A1/A2 "writing/appending to a file" .webm) were **not bundled**:
  they are large teacher demonstrations of on-screen typing, not pupil-facing hooks, and carry motion — against
  the low-arousal default. Reproduced as a worked example on the slide + worksheet and flagged in the L4 slide
  teacher-notes. Logged here as a deliberate omission.
- No `csv` module is used (the unit deliberately does manual split/join), matching the TCC approach. No pupil
  names anywhere — all examples are cohort-level (players, books, weather data); the L42 spelling-test and L43
  Battle Boats use the player-vs-computer framing, no real names.
- DB note: per the task brief this conversion **wrote bundle files only** — it did **not** materialise onto the
  dev DB. Run `npm run seed:lessons` to import (idempotent — replaces a same-title unit on course 3's scheme).
