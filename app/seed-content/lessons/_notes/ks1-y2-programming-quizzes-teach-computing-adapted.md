# Conversion notes — KS1 Y2 Programming quizzes (Teach Computing — adapted)

- **Slug:** `ks1-y2-programming-quizzes-teach-computing-adapted`
- **Course / key stage:** KS1 Computing / KS1
- **Source:** TeachComputing KS1 Year 2 Unit 6 "Programming quizzes" (ScratchJr). 6 lessons converted.
- **Cohort:** SEND secondary working at primary level — content simple/concrete, framing age-respectful
  (no infant tone), reading load very low, leaning hard on drag/visual types (label, order, sort, multi-select,
  screenshot). Objectives are the TCC "I can…" statements (cohort-level, no pupil PII).

## Question types used (variety, low writing)
label (drag onto image), order (sequence steps), sort (card-sort to categories), multi-select (tick-all),
single choice (recognition), text (short), screenshot (show-your-work), checklist. No single-radio
multi-correct. **No new type-gaps** — all demand covered by the built types.

## §7a Alignment — objective ↔ slide ↔ worksheet question

### L1 ScratchJr recap
| Objective | Slide | Worksheet Q |
|---|---|---|
| find the parts of the ScratchJr screen | S2 screen | starter: LABEL the screen (stage/flag/blocks); Support (what starts a program), Core (what is the stage) |
| find the start of a sequence | S3 sequence | activity ORDER the school day; Support (first step) |
| see that a program needs to be started | S4 start | activity Core (why a program needs a start); starter Support (green flag) |
| run my program | S5 full screen | activity show-your-work (did it run?) + screenshot; Challenge (what to check) |

### L2 Outcomes
| Objective | Slide | Worksheet Q |
|---|---|---|
| predict the outcome of a sequence | S4 predict | starter Support/Core/Challenge (clap/juice/cake outcome); activity Core (what outcome means) |
| match two sequences with the same outcome | S5 same outcome, S6 match | activity SORT same/different outcome + the match-programs task; Support (same blocks) |
| change the outcome | S7 change | activity Challenge (what you changed) + show-your-work screenshot |

### L3 Using a design
| Objective | Slide | Worksheet Q |
|---|---|---|
| use the Start on tap block | S3 start block | starter Support/Core/Challenge (how Start on tap works) |
| work out the actions of a sprite in an algorithm | S4 design, S5 order | activity ORDER the algorithm (tap → say → change page) |
| decide which blocks to use to meet the design | S6 choose blocks | activity SORT block↔job; Core (which block changes background) |
| build the sequence I need | S7 build | activity show-your-work (how many backgrounds) + screenshot; Challenge (season order) |

### L4 Changing a design
| Objective | Slide | Worksheet Q |
|---|---|---|
| choose backgrounds for the design | S6 choose your own | activity "my choices" (background); Support (sprites live in background) |
| choose characters for the design | S6 | activity "my choices" (two sprites); starter LABEL cat/fish, Support (which lives in sea) |
| create a program based on the new design | S4/S5 yes/no codes, S7 build | activity multi-select (wrong-answer code) + show-your-work screenshot |

### L5 Designing and creating
| Objective | Slide | Worksheet Q |
|---|---|---|
| choose the images for my own design | S3 choose pictures | starter Support (sprites match background), Core (your background), Challenge (a fitting question) |
| create an algorithm | S4 write algorithm | activity ORDER the algorithm; Core (why order matters), Challenge (wrong-answer algorithm) |
| build sequences of blocks to match my design | S5 build, S6 save | activity SORT actions + show-your-work (project name) + screenshot |

### L6 Evaluating
| Objective | Slide | Worksheet Q |
|---|---|---|
| compare my project to my design | S3 two questions, S4 match | starter (what evaluate means); activity (dog code matches) Support/Core |
| improve my project by adding features | S6 sound block | activity Challenge (one feature to add) + the Sound-block visual |
| debug my program | S5 find the mistake | activity (cat says "hi" not "Yes") Support (what it says / does it match), Core (the fix, what debug means) + show-your-work |

All objectives are taught on ≥1 slide and assessed by ≥1 worksheet question (or the make/show-your-work
artefact). No orphan questions. Levels coherent: Support = recognition (tick/label/sort/order),
Core = recall/short answer, Challenge = reason/apply — on the same task. Each single-choice has exactly one
correct option; the L4 multi-select has 2 correct of 3.

## Images embedded (16, all OGL — Teach Computing © Raspberry Pi Foundation, OGL v3.0)
| File | Source (lesson pptx) | Used for |
|---|---|---|
| l1-scratchjr-screen.png | L1 image14 | LABEL the ScratchJr screen (stage / green flag / blocks) |
| l1-start-blocks.png | L1 image13 | the yellow trigger blocks (green flag = start) |
| l1-fullscreen.png | L1 image15 | running a program full screen |
| l2-match-programs.png | L2 image24 | the "match same-outcome programs" task |
| l2-program-a.png / l2-program-b.png | L2 image22 / image23 | two programs, same blocks reordered (same outcome) |
| l3-seasons-design.png | L3 image28 | the seasons design (background / sprite / algorithm) |
| l3-start-on-tap.png | L3 image27 | the Start on tap block |
| l4-quiz-who-lives-here.png | L4 image3 | LABEL the quiz screen (cat / fish / program) |
| l4-code-yes.png / l4-code-no.png | L4 image29 / image31 | right-answer (says Yes) vs wrong-answer (says No, stops) |
| l5-moon-aliens.jpg | L5 image2 | choosing artwork that matches a background (space) |
| l5-save.jpg | L5 image8 | saving a project in ScratchJr |
| l6-dog-correct.png | L6 image2 | code that matches the design (dog says "Yes!") |
| l6-cat-bug.png | L6 image10 | code with a bug to debug (cat says "hi" not "Yes!") |
| l6-sound-pop.png | L6 image9 | the green Sound block (a feature to improve a project) |

Animated GIFs in every source deck were **excluded** (no-animation rule); clean rasters/screenshots used.
Decorative clip-art (question marks, thumbs-up, infant cartoon kids, NCCE logo) was skipped.

## Image-gap log (candidates to source/shoot later)
| Lesson | Where | Wanted | Source had one? |
|---|---|---|---|
| L2 | slide/activity | a "different outcome" pair of programs to sit beside the same-outcome pair | ⚠️ source shows same-outcome pairs only; sort uses text |
| L4 | activity | the blank "Quiz backgrounds and characters" choice grid (for a label/sort of artwork) | ⚠️ source grid not cleanly rasterisable |
| L6 | activity | a side-by-side "design vs project" check still (ticks + the circled mismatch) | ⚠️ source is a build animation; used the dog-match + cat-bug stills instead |

## Self-verify (pure functions, no DB) — PASS
- renderWorksheet on every worksheet: support slice ≠ challenge slice (by prompt text); every *activity*
  worksheet has a `kind:'image'` screenshot field. **PASS**
- Drag types parse to real fields (label=3 zones, order, sort, multi-select=3 opts/2 correct). **PASS**
- sliceSlidesForLevel('core') ≥ 4 slides (7–9 each) and splitTeacherNotes notes non-empty for all 6 decks. **PASS**
- Every `{{res:…}}` placeholder resolves to a manifest file; all 16 image files present on disk and each
  referenced in the manifest. **PASS**
