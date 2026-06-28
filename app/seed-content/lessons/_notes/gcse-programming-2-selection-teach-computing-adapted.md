# Conversion notes — GCSE Programming part 2 — selection (Teach Computing — adapted)

Slug: `gcse-programming-2-selection-teach-computing-adapted`
Course: OCR J277 GCSE Computer Science · keyStage **KS4** · target scheme `3` (GCSE) per LESSON_CONVERSION_GUIDE §6.
Source: TeachComputing GCSE unit_3 (Programming part 2 — Selection), lessons L6–L11. No summative/rubric docx in
the unit folder, so no final-quiz worksheet was folded in. Python (if/elif/else, comparison + Boolean operators).

All source media embedded are OGL v3.0 (Teach Computing Curriculum © Raspberry Pi Foundation). No videos in this unit.

Question types used across the unit (variety): multiple-choice, multi-select, **matching**, fill-in-the-blank,
**code**, **Parson's**, **order/sequence**, **card-sort**, trace tables (Q&A + grid), screenshot, checklist.
**No single-radio cell is multi-correct** (every multi-correct prompt uses the `[ ]` multi-select).

---

## §7a Alignment — objective → slide(s) → worksheet Q / level

### L6 Randomisation
| Objective ("I can…") | Slide(s) | Worksheet question / level |
|---|---|---|
| import a module | S4 import, S3 randint | activity: gap-fill "import"; Support match module/import |
| generate a random number with randint | S3 randint (code img) | activity: Predict MCQ (output of randint); Challenge code box (import + roll) |
| predict the possible outputs | S3 predict | activity: Predict MCQ; Core "randint(5,10) range"; order (dice steps) |
| find info in the documentation | S5 Python docs (img) | activity: Core "where to look things up" |
| (recognition starter) | S2 dice | starter: multi-select "where a game uses randomness"; card-sort true/pseudo (S7) |

### L7 Arithmetic expressions
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| use BIDMAS | S2 starter, S3 BIDMAS | starter MCQ (18); Support `2+3*4`; Core "why * before +" |
| use Python operators | S4 operators | activity: **matching** operator↔meaning (6 rows) |
| integer division // and modulo % | S5 // and % | activity: gap-fill `7//3`, `7%3`; Support `10%3` choice; Core "why // and %" |
| store result in a variable | S6 split my bill (code img), S7 modify | activity: Challenge code box (one bracketed expression); Show-your-work (pizza) |

### L8 Selection
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| say what a condition is (True/False) | S2 starter, S4 condition | starter: **card-sort** True/False; Support "always True/False" |
| read a flowchart with a decision | S3 decision symbol | (taught on slide; image-gap logged — drawn on board) |
| explain how selection chooses code | S5 if/elif/else (code img) | activity: **order** (how an if runs); **matching** if/elif/else |
| trace if / elif / else | S5 trace img, S6 chatterbot (code img) | activity: Harry trace (input→output); Predict (chatterbot); Core ".lower()"; Challenge code (elif leia) |

### L9 Selection challenge (joke machine)
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| name the comparison operators | S2 keys img | starter: **matching** operator↔meaning (6 rows) |
| choose the right comparison operator | S3 less-than | starter: Support "!="; Challenge "score ≥ 10" |
| use selection in my own program | S5–S7 build | activity: **order** (build steps); Core code (if line); Challenge code (elif) |
| build & test a joke machine in a pair | S4 pair img | activity: pair-roles choice; Show-your-work (joke machine) + checklist |

### L10 Logical expressions (and/or)
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| put scrambled code in order | S2 Parson's | starter: **Parson's** (password checker); Support/Core/Challenge on the same code |
| use and / or | S3 and/or | activity: gap-fill (both / at least one) |
| work out an and/or condition | S4 cards (card img) | activity: **card-sort** True/False (5 of spades); Support `True and False`; Core sugar-tax |
| write conditions using and / or | S5 sandwich (code img), S6 | activity: Challenge code (sauce AND salad); plenary **multi-select** spot-5-errors; Show-your-work (pizza) |

### L11 Nested selection
| Objective | Slide(s) | Worksheet question / level |
|---|---|---|
| say what nested selection means | S3 nest img | starter: Support "if inside an if"; S3 metaphor |
| trace a nested-selection program | S5 animal (code img) | activity: Predict; **trace grid** (first/second answer → output) |
| explain why the inner runs only when first True | S4 username/password, S6 flow | activity: **order** (the flow); Support "when 2nd Q is asked"; Core "why first must be True" |
| make a "guess the…" game | S7 vegetable | activity: Challenge code (nested if); Show-your-work (vegetable game) + checklist; starter card-sort recaps logic |

---

## Image-gap log (per-unit; mirror into WORKSHEET_QUESTION_TYPES.md §4 next shared-edit pass)

| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L8 Selection | S3 decision-symbol slide | a clean flowchart with a decision **diamond** (input→condition→two arrows) | ⚠️ source diagram is a PowerPoint **shape**, not a rasterisable image — `extractOfficeImages` can't pull it; teacher draws it on the board |
| L11 Nested selection | activity "make" / S7 | the **guess-the-vegetable tree diagram** | ⚠️ source tree is built from docx text/shapes, not a raster — written out as text steps instead |
| L9 Joke machine | S8 plenary (anagrams) | a keyword-anagram graphic | ⚠️ minor; plenary handled as text — not embedded |

Embedded OK (genuine code screenshots / photos from source, all used by a slide AND/or worksheet):
randint code, Python docs, dice (L6); Split-my-bill code (L7); chatterbot code, "what will be the output" code,
True/False game-show (L8); comparison keys, pair-programming (L9); sandwich code, 5-of-spades (L10);
guess-the-animal code, nest+eggs (L11). 13 images total.

## Wanted-but-unbuilt question types
**None.** All four newer types are built; this unit used order, card-sort and Parson's heavily. **Label-a-diagram**
and **slider/scale** were available but not the best pedagogical fit here (no source diagram with clean hotspots;
selection is better self-checked by sort/order than a confidence slider), so they are intentionally unused — not gaps.

## Verify
Self-verify scripts (manifest+placeholder integrity, render, level-slice, widget detection) ran green:
SELF-VERIFY PASS + WIDGET/SLICE PASS. Slides titles end `.md`; teacher notes present on every slide; level
sections slice and never leak labels; every activity worksheet has a screenshot field + ✅ checklist.

Gotcha fixed during conversion: the L9 H1 title originally read "Selection **challenge** …" — the word *challenge*
in a heading collides with the `## 🔴 Challenge` level-section detector (`segment()` picks the shallowest heading
containing a level word as `levelDepth`), which forced the whole sheet/deck to the challenge level (core slice = 0
slides/fields). Renamed the in-file H1s to "Joke machine …" / "The joke machine"; the manifest lesson title keeps
"Selection challenge".
