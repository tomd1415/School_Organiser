# Conversion notes — KS1 Y1 Programming animations (Teach Computing — adapted)

- **Slug:** `ks1-y1-programming-animations-teach-computing-adapted`
- **Course / key stage:** KS1 Computing / KS1
- **Source:** TeachComputing KS1 Year 1 Unit 6 "Programming animations" (ScratchJr). 6 lessons converted.
- **Cohort:** SEND secondary working at primary level — content simple/concrete, framing age-respectful
  (no infant tone), reading load very low, leaning hard on drag/visual types (label, order, sort, scale,
  multi-select, screenshot). Objectives are the TCC "I can…" statements verbatim (cohort-level, no pupil PII).

## Question types used (variety, low writing)
label (drag onto image), order (sequence steps), sort (card-sort to categories), scale (1–5 self-rating),
multi-select (tick-all), single choice (recognition), text (short), screenshot (show-your-work), checklist.
No single-radio multi-correct. **No new type-gaps** — all demand covered by the built types.

## §7a Alignment — objective ↔ slide ↔ worksheet question

### L1 Comparing tools
| Objective | Slide | Worksheet Q |
|---|---|---|
| find the commands to move a sprite | S2 ScratchJr screen, S3 move blocks | starter: label the screen (Blocks); activity: label the 4 move blocks |
| use commands to move a sprite | S4 your turn | activity Support tick (which block goes right), Core (pick block to go up), show-your-work screenshot |
| compare different programming tools | S5 Bee-Bot or ScratchJr | activity Challenge (one same / one different) |

### L2 Joining blocks
| Objective | Slide | Worksheet Q |
|---|---|---|
| join more than one block | S3 join the blocks, S4 joined program | starter order (build steps); activity Support (which block starts), Core (count move-right) |
| use a Start block | S3 | starter Support (which block first = Start) |
| run my program | S5 green flag | starter Core (what green flag does); activity predict + show-your-work |

### L3 Make a change
| Objective | Slide | Worksheet Q |
|---|---|---|
| find blocks that have numbers | S3 the value (label) | starter: label the value + number pad; Support (where is the value) |
| change the value | S4 one block, S3 number pad | starter Core (how to change); activity scale (confidence) + show-your-work |
| say what happens when I change a value | S5 what happens | activity predict (5→2), Core (1→5 effect), Challenge (one block vs five) |

### L4 Adding sprites
| Objective | Slide | Worksheet Q |
|---|---|---|
| project can include more than one sprite | S3 many sprites | activity Support (more than one? y/n), Core (count sprites), sort (sprite↔background) |
| delete a sprite | S5 delete a sprite | activity Challenge multi-select ("you can delete a sprite") + show-your-work |
| add blocks to each sprite | S4 each sprite has own program | activity Challenge multi-select ("each sprite has its own program"); starter (choose matching sprite) |

### L5 Project design
| Objective | Slide | Worksheet Q |
|---|---|---|
| choose appropriate artwork | S3 background, S4 rockets | activity "my choices" (background + rocket colour) |
| decide how each sprite will move | S5 how will they move | activity Core (write the directions) |
| create an algorithm for each sprite | S6 what is an algorithm, S7 write it | starter (what is an algorithm); activity order (Start→Speed fast→Move up 6→Stop), Challenge (own algorithm) |

### L6 Following my design
| Objective | Slide | Worksheet Q |
|---|---|---|
| use sprites that match my design | S3 build artwork | starter Support (design+algorithm help build); activity order (add sprites step) |
| add blocks based on my algorithm | S4 add the blocks | activity order (add blocks step) + show-your-work |
| test the programs I created | S5 test | starter Core (what test means), Challenge (what to change); activity Support (did it work y/n), scale (how well matched) |

All objectives are taught on ≥1 slide and assessed by ≥1 worksheet question (or the make/show-your-work
artefact). No orphan questions. Levels coherent: Support = recognition (tick/label/sort), Core = recall/
short answer, Challenge = reason/apply — on the same task.

## Images embedded (all OGL — Teach Computing © Raspberry Pi Foundation, OGL v3.0)
| File | Source (lesson pptx) | Used for |
|---|---|---|
| l1-scratchjr-screen.jpg | L1 image12 | LABEL the ScratchJr screen (sprite/blocks/green flag) |
| l1-move-blocks.png | L1 image22 | LABEL the four move blocks (right/left/up/down) |
| l2-joined-program.png | L2 image38 | a joined Start→up×3→right×5→End program (predict/count) |
| l2-classroom-background.png | L2 image40 | cat on a classroom background (adding a background) |
| l3-change-value.png | L2 image29 | block + number pad (LABEL the value) |
| l3-value-program.png | L3 image26 | program with move-right value 5 (change a value) |
| l4-cat-on-moon.png | L4 image7 | cat-on-moon mismatch (starter "what's wrong") |
| l4-many-sprites.jpg | L4 image16 | underwater scene, several sprites (more than one sprite) |
| l5-space-race.jpg / l6-space-race.jpg | L5 image2 | three rockets Space race (design + build) |

GIF assets in every source deck were **excluded** (no-animation rule); clean rasters used instead.

## Image-gap log (candidates to source/shoot later)
| Lesson | Where | Wanted | Source had one? |
|---|---|---|---|
| L1 | activity | a real "cat moved right" stage still (drag-result) | ⚠️ source shows it only as an animated GIF (excluded) — re-shoot as a still |
| L4 | slides | a still showing two sprites each with its OWN program/area side-by-side | ⚠️ source is a GIF only — re-shoot as a still |
| L6 | slides/activity | a finished pupil Space-race still + a "matched plan vs not" comparison | ⚠️ source uses a video; no clean still — capture from a finished project |

## Self-verify (pure functions, no DB)
- renderWorksheet on every worksheet: support-slice keys ≠ challenge-slice keys; every *activity* worksheet
  has a `kind:'image'` screenshot field; no challenge field leaks into the support slice. **PASS**
- New drag types parse to real fields (label/order/sort/scale/multichoice) — confirmed. **PASS**
- sliceSlidesForLevel('core') ≥ 4 slides and splitTeacherNotes notes non-empty for all 6 decks. **PASS**
- All `{{res:…}}` placeholders resolve to a manifest file; all 10 image files present on disk. **PASS**
