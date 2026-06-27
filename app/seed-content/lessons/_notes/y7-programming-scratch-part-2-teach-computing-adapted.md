# Conversion notes — Y7 Programming essentials in Scratch — part II (Teach Computing — adapted)

Slug: `y7-programming-scratch-part-2-teach-computing-adapted`
Source: `TeachComputing/KS3/year_7/unit_6` (lessons L7–L12 of the Scratch sequence).
Course: Computing Curriculum (KS3). 6 lessons, each: starter + activity worksheet + slides (+ embedded
Scratch screenshots; one order-code Parsons in L8/L10/L11).

Self-verify: PASS — every manifest `file` exists; every `{{res:…}}` resolves to a declared file; no orphan
files; slides titles end `.md`; teacher notes present on every deck; S/C/C slices differ by content (no
challenge field leaks into the support render); all choice cells are single-correct (no multi-correct trap);
the L9 starter matching renders as one single-select choice per row; Parsons solutions parse (4/6/3 lines).

## §7a alignment tables

### L7 — You've got the moves! (subroutines & decomposition)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| what a subroutine is | S2 starter, S3 unplugged | starter: choice (Support tick), Core "what twist does", Challenge "why own subroutine" |
| what decomposition means | S4 | activity Support choice "decomposition is…", Core "what does decompose mean" |
| use subroutines to split a dance | S4–S5, S6 | activity "Plan your moves" (4 rows), Challenge "call in any order" |
| make four subroutines | S6 | activity Show-your-work (link + screenshot) + ✅ checklist |

### L8 — Fly cat, fly! (condition-controlled iteration / PRIMM)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| where repeat until is useful | S2 predict, S6 stop | starter predict, activity Challenge "why repeat until beats forever" |
| predict a repeat until loop | S2–S3 | starter predict (building code image), Core "when does it restart" |
| use a repeat until loop | S5–S6, Parsons | activity Parsons (order the fall-and-stop code) + Show-your-work |
| make a sprite stop at the right place | S6 | activity Challenge "write the stopping condition" + screenshot + ✅ |

### L9 — Loop the loop! (choosing iteration)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe each loop | S2 starter | starter matching (Support), Core "count- or condition-controlled?" |
| count- vs condition-controlled | S2 | starter Core choice, Challenge "explain the difference" |
| evaluate which loop is best | S4 evaluate (3-option image) | activity Support "which draws one square", Core "ten-second countdown" |
| justify the choice | S5 | activity Challenge "invent a task for each loop" + show-your-work + ✅ |

### L10 — Treasure those lists! (lists)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| what a list is | S1, S3 demo | starter bridge Core, activity Support "a list is…" |
| why lists not variables | S3 shopping-list trace | activity Core "why a list beats a variable" |
| identify a list in use | S4 Legends game | activity predict, Support "what happens to the apple", Core "watermelon→monkey" |
| use a list (add/del/replace/check) | S4–S5, Parsons | activity Parsons (clear/add/replace order), Challenge "what the goblin checks", Show-your-work (add cake) + ✅ |

### L11 — Translate this! Part 1 (decompose)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| explain decomposition | S2 starter | starter choice + Core "everyday example", Challenge "how it helps when stuck" |
| break into subproblems | S3 scenario | activity predict "hardest task", Challenge "name two subproblems" |
| translate a word | S4 decompose-4a, Parsons | activity Support "which extension", Parsons (set word → say translate), Core "what translate does" |
| start the project | S5 | activity Show-your-work (link + screenshot) + ✅ |

### L12 — Translate this! Part 2 (build & assess)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| loop + list to test ten words | S3 build | starter Core "test ten without copying", activity Support "use a loop" |
| keep and show a score | S3 build | activity Core "when should the score go up", review MCQ (repeat until score=10) |
| use a subroutine to organise | S3 | starter Challenge "subroutine tidies start-up", review MCQ "decomposition" |
| check against the rubric | S4 peer | activity rubric self-check checklist + Show-your-work + ✅ |

Note: L12 review-quiz MCQs (decomposition / count-vs-condition / repeat-until termination) are drawn from the
unit's summative assessment to consolidate the whole Y7 programming arc; the formal 20-question summative
itself stays a separate teacher-run assessment (it is heavily Scratch-image based — not reproduced here).

## Image gaps (WORKSHEET_QUESTION_TYPES.md §4 candidates)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L11/L12 Translate this! | "translate a word" slide / Parsons | a Scratch screenshot of `set [word]` + `say (translate (word) to Spanish)` blocks | ❌ source decks only had a stock "hello in many languages" photo + a worksheet brief image — no clean translate-block code shot; reused the languages photo and wrote the code as a Parsons instead |
| L8 Fly cat, fly! | "stop at the bottom" slide | a screenshot of the cat with `repeat until <y position < -180>` (the finished modify) | ⚠️ not in deck; used the building-sprite repeat-until image + the up-arrow modify block, plus a Parsons |
| L9 Loop the loop! | starter | a side-by-side "forever vs repeat(n) vs repeat until" labelled diagram | ⚠️ partial — the evaluate-worksheet image shows all three options together (used); a cleaner labelled trio would help |

## Wanted-but-unbuilt question types (WORKSHEET_QUESTION_TYPES.md §2)
| Lesson | Worksheet | Type wanted | Stop-gap used |
|---|---|---|---|
| L9 | starter | **Card sort (§2.5)** — sort the three loops into *count-controlled* vs *condition-controlled* columns | used the built **matching** question (loop → behaviour) + a single-select "count vs condition" choice. Add L9 starter to §2.5 when card-sort lands. |
| L10 | activity plenary | **Card sort (§2.5)** — match list actions (add/delete/replace/check) to blocks; or order-non-code | covered the plenary intent with the built **Parsons** (order the list code) + Core/Challenge text. |
| all | plenaries | **Slider / confidence scale (§2.6, low priority)** — "how confident with loops/lists 1–5" | used the ✅ self-tick checklist instead. |

No new question types were built (per brief: this agent writes only its own bundle). All questions use
supported types only.
