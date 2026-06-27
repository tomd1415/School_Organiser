# Conversion notes — Y7 Programming essentials in Scratch — part I (Teach Computing — adapted)

Slug: `y7-programming-scratch-part-1-teach-computing-adapted`
Source: `TeachComputing/.../KS3/year_7/unit_4/Unit 4` (the **nested** "Unit 4" — the top-level unit_4 is a
misfiled copy of unit 3 (Networks) and was ignored).
Course: Computing Curriculum (KS3). 6 lessons, all converted. Each lesson = starter worksheet + activity
worksheet + slides; relevant source Scratch-block screenshots embedded; L1 also has the commands video +
Frère Jacques audio.

Self-verify: PASS (manifest files all present; every `{{res:}}` placeholder resolves to a manifest `file`;
no orphan files; slide resource titles end `.md`; every activity worksheet has a `📷` screenshot field;
Parsons render in L1/L3/L5; slides parse 7–8 slides each with teacher notes; level sections slice by content
— support/core/challenge each show shared + their own questions). All multiple-choice cells follow the
pilot's correct-answer-first convention; multi-correct questions use the multi-select `[ ]` type, never a
single radio.

## §7a Alignment tables (objective → slide(s) → worksheet Q/level)

### L1 — Sequencing (Frère Jacques)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| computers need precise instructions | S2 starter, S3 commands video | starter: "a computer needs every step" (Core S/C/C) |
| say what a sequence is | S4 (music/recipe/furniture) | activity: "what does sequence mean" Core; "in order" Support |
| predict what a sequence will do | S5 predict | activity: Predict cell |
| put music blocks in the right order | S6 your-turn | activity: **Parsons** (order the 8 song lines) + Show-your-work + ✅ |

### L2 — Variables (Chat with Big Ed)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| explain what a variable is | S2 storytime | starter: "old word replaced" Core; "variable = stored data" Support |
| input → process → output | S3 | activity: input/output choice cells |
| predict a program with a variable | S4 predict | activity: Predict cell |
| trace the value of a variable | S6 trace | activity: **Trace the temperature** table + ✅ |

### L3 — Selection (If statements)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| condition true/false | S2 starter | starter: 7>6 / heart-on-spade choices |
| what selection (If) does | S3 if/else image, S4 predict | activity: "else runs when false", If vs If/else Core |
| where an If is needed | S5 your-turn | activity: Easter-egg Challenge (single If, no else) |
| change a program to use selection | S6 build-it | activity: **Parsons** (Madrid quiz If/else) + Show-your-work + ✅ |

### L4 — Operators (comparison & logic)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| comparison operators >,<,= | S2 starter, S3 | starter: 42>30; "> means greater than" Support |
| logic operators and/or/not | S4 (King AND hearts image) | activity: "and true only when both", "or" Support, "not" Core |
| decide true/false | — (applies S2–S4) | activity: **True/false table** (6 single-correct rows) |
| add a quiz question using operators | S5 worked, S6 your-turn | activity: "why or not and" Challenge + Show-your-work + ✅ |

### L5 — Count-controlled iteration & debugging
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| what iteration is | S2 spot-the-pattern, S3 | starter: same/changes choices; "iteration means" Core |
| why loops are useful | S3, S4 worked | activity: "why a loop beats ten blocks" Core |
| count-controlled loop to shorten | S4 worked, S5 your-turn | activity: **Parsons** (order the repeat loop) + count-down Challenge |
| find/fix a bug by tracing | S6 debugging | activity: **trace table** (times-table) + "what is the bug" + ✅ |

### L6 — Problem-solving (Moves like Jim)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| remember the key words | S2 beat-the-teacher | starter: **multi-select** key-words (distractor: "sandwich") |
| pick the right block | S5 pick-the-construct | activity: loop/selection choice cells; "and" Support |
| combine sequence/selection/loops/operators | S3 Moves like Jim, S5 | activity: countdown-loop Core, "1 or 9" operator Core, feedback Challenge + Show-your-work |
| rate confidence honestly | S6 You're hired | activity: **multi-select** confident-skills + "practise next" + ✅ |

## Image gaps (log)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1 | starter slide | robots/precise-instructions hero | ✅ used source `image2` |
| L1 | "a sequence is order" slide | everyday sequences (music/recipe/furniture) | ✅ used source `image12` |
| L1 | order-the-song task | the actual Scratch music-block stack for Frère Jacques | ⚠️ source deck had a looping **GIF** only (animated) — deliberately NOT embedded (low-arousal/no-animation rule). A static screenshot of the block stack would help — none suitable found. |
| L2 | predict slide | Chat with Big Ed variable blocks | ✅ used source `image17` |
| L3 | if/else slide | If/else birthday blocks | ✅ used source `image11` |
| L4 | logic-operators slide | a condition using = and AND | ✅ used source `image7` (value=King and suit=hearts) |
| L5 | starter + debug slides | inefficient say-1..10 stack; repeat-loop times-table | ✅ used source `image3` and `image6` |
| L5 | "what is iteration" slide | Grace Hopper moth / logbook (the bug story) | ⚠️ source had a photo (`image10`) but it's incidental — not embedded; could source a clearer one later |
| L6 | Moves like Jim slide | the Dance Battle / game screen | ✅ used source `image1` |

## Wanted-but-unbuilt question types (log → WORKSHEET_QUESTION_TYPES.md §2)
| Lesson | Worksheet | Wanted type | Why / stop-gap used |
|---|---|---|---|
| L6 | Problem-solving activity ("You're hired") | **§2.6 Slider / rating scale** (3-point: don't know / need help / confident, per skill) | The source is a 3-level self-rating grid. Matching (`detectMatching`) can't model it (it forces one-to-one pairing, so a rating can't be reused across skills). Stop-gap: a **multi-select** "tick the skills you feel confident using" + a text "which to practise next". Build a `scale` field to restore the 3-point grid. |
| L1, L3, L5 | starter "spot the steps" / plenary ordering | **§2.3 Order / sequence (non-code)** | Used the built **Parsons** (order-CODE) instead — the items here are genuine Scratch program lines, so Parsons fits well. No gap, but if a future task needs plain-English step ordering, §2.3 still applies. |

## Source videos / audio
- Embedded: L1 `A1 commands.mp4` (545 KB) and `A3 Frère Jacques.mp3` (309 KB) — both small and directly used.
- **Not embedded (too large for git):** L4 `A4 video demonstration.mpg` (~230 MB) and L5 `A2 live coding.mpg`
  (~176 MB) are teacher-facing demo videos; L1 `A4 video.mp4` (21 MB) / `video2.mov` (7.4 MB). These stay in
  the reference import only. If wanted in-bundle later, transcode to a compressed mp4 first (and consider
  git-LFS per the bundle README).
