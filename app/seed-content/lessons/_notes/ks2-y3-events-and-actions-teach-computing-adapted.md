# Conversion notes — KS2 Y3 Events and actions in programs (Teach Computing — adapted)

- **Slug:** `ks2-y3-events-and-actions-teach-computing-adapted`
- **Course:** KS2 Computing (keyStage KS2)
- **Source:** TCC KS2 Year 3 Unit 6 "Events and actions in programs" (Scratch). 6 lessons converted (L1 source was a `.7z`; extracted with `py7zr`).
- **Cohort:** SEND secondary working at primary level — content kept simple/concrete, framing age-respectful, low reading load, heavy on visual/drag types.

## Question-type variety used
- **sort** (card-sort): L1 starter (event vs action blocks).
- **order** (sequence): L2 activity (build-a-direction steps), L3 activity (setup order), L6 starter (5 build steps).
- **label** (image hotspot): L1 activity (event/action on a block stack), L5 starter (parts of the Scratch screen).
- **matching**: L4 starter (Pen block ↔ what it does — a 2-col choice grid over the same option pool).
- **multiple choice** (single-correct), **text**, **screenshot**, **checklist** throughout. No multi-select needed; no single-radio multi-correct traps.

## Images (all OGL, raster-extracted from the source `.pptx` decks)
| File | Used in | What |
|---|---|---|
| l1-event-action.png | L1 slides/worksheets | block stack: when r key → point dir 90 → move 10 (event+action) |
| l1-arrow-keys.png | L1 | photo of the four arrow keys |
| l2-maze.png | L2 | maze with sprite at Start, Finish corner |
| l2-four-direction-code.png | L2 | up + right arrow block stacks |
| l3-setup-blocks.png | L3 | setup: flag → go to x:0 y:0 → set pen colour → erase all |
| l4-pen-blocks.png | L4 | set pen colour / change pen size +1 / -1 |
| l4-penup-pendown.png | L4 | u key → pen up; d key → pen down |
| l5-scratch-screen.png | L5 | full Scratch screen (green flag, stop, stage, instructions) — used as label target |
| l5-buggy-code.png | L5 | buggy left-arrow stack (points dir 90 → goes right) |
| l6-blank-maze.png | L6 | clean blank maze (Start/Finish) for design |

## Alignment tables (§7a)

### L1 Moving a sprite
| Objective | Slide | Worksheet Q |
|---|---|---|
| an event makes an action happen | S3 event/action, S4 try keys | starter sort (event vs action); Support which-is-event; Core name-the-event; Challenge why nothing happens |
| name event & action in a stack | S3 | activity label (event/action on the image) |
| choose sensible keys + say why | S2, S5 | activity Support up-key, Core right-event, Challenge why-arrow-keys + show-your-work |

### L2 Maze movement
| Objective | Slide | Worksheet Q |
|---|---|---|
| choose & resize a character | S2 maze, S3 resize | starter resize MCQ + why; activity I-can |
| program movement in four directions | S4 one direction, S5 copy | activity order (build steps); Support which-event-right |
| copy a block stack & change it | S5 | activity Core what-to-change, Challenge why-copy + show-your-work |

### L3 Drawing lines
| Objective | Slide | Worksheet Q |
|---|---|---|
| use a programming extension (Pen) | S2 extension blocks | starter find-Pen, where-to-get |
| use pen down to draw a line | S3 pen down | starter which-block-draws, Challenge what-pen-down-means; show-your-work |
| choose blocks to set up my program | S4 setup, S5 you-do | activity order (setup); Support which-clears, Core why-clear, Challenge why-under-green-flag |

### L4 Adding features
| Objective | Slide | Worksheet Q |
|---|---|---|
| name extra Pen blocks & what they do | S2 pen blocks | starter matching (block↔meaning); Support thicker, Core set-colour, Challenge penup-vs-eraseall |
| choose a key to turn a feature on | S3 pen up/down, S4 add | activity Support u-key, plan-your-feature |
| join event & action to make it work | S4 | activity Core which-action, Challenge clear-screen + show-your-work |

### L5 Debugging movement
| Objective | Slide | Worksheet Q |
|---|---|---|
| test a program against a design | S3 test-against-design | starter what-is-debug; activity is-it-a-bug |
| match a piece of code to what it does | S4 find-the-bug | activity which-block-holds-bug |
| find & fix a bug | S5 fix-it | activity Challenge what-should-direction-be (-90) + show-your-work; starter label Scratch screen |

### L6 Making a project
| Objective | Slide | Worksheet Q |
|---|---|---|
| make design choices & say why | S3 design-first | starter order (5 steps); activity plan rows, Core name-a-choice |
| build my design into a project | S4 five steps | activity Support which-setup-block + show-your-work |
| test & evaluate my project | S5 test/evaluate | activity Challenge describe-the-bug, evaluate rows |

## Gaps
- **Type gaps:** none. All four newer drag types (order/sort/label/matching) covered the demand; no new type wanted.
- **Image gaps:** none blocking. Source decks were rich in clean Scratch block-stack rasters and screen stills (unlike the KS3 network/spreadsheet units). GIF screen-recordings in L2/L3 decks were **excluded per the no-animation rule** (resize / pen-down demos) — a still of "resize the sprite" and "access the Pen extension" would be a nice-to-have but the block images and full-screen still cover the teaching.

## Self-verify
`_ea_verify.ts`: every {{res:}} resolves to a manifest file; every slides title ends `.md`; every activity worksheet has a screenshot (kind image) field; support≠challenge slices for all worksheets; ≥4 slides + non-empty teacher notes per deck. **Result: ALL PASS** (throwaway script deleted).
