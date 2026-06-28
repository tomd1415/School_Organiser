# Conversion notes — KS2 Y3 Sequencing sounds (Teach Computing — adapted)

- **Slug:** `ks2-y3-sequencing-sounds-teach-computing-adapted`
- **Course / key stage:** KS2 Computing / KS2
- **Lessons:** 6 (L1 Introduction to Scratch · L2 Programming sprites · L3 Sequences · L4 Ordering commands · L5 Looking good · L6 Making an instrument)
- **Source:** `TeachComputing/KS2/Year_3/Unit 3 Sequencing Sounds` (6 lesson zips + Unit guide). OGL v3.0 media only carried over.
- **Cohort framing:** SEND secondary working at primary level — content kept simple/concrete, framing age-respectful (no "boys and girls"), very low reading load, leaning on label / sort / order / multi-select / matching / screenshot.

## Self-verify
PASS — 6/6 lessons: every slides resource titled `.md`; every `{{res:}}` resolves to a manifest file; each activity worksheet has a screenshot image field and a non-equal Support vs Challenge slice; each deck ≥4 slides (6–7 each) with non-empty teacher notes.

## Question-type variety used
matching (block↔action, event↔trigger, word↔meaning), multi-select (which blocks moved the cat), single-choice, fill/short-text, **order** (build steps, note order), **sort** (costume↔sprite / backdrop↔stage), **label-a-diagram** (the Scratch screen, L1), screenshot show-your-work, ✅ checklist. No new type-gaps — all demand met by built types.

## §7a alignment (objective → slide → worksheet)

**L1 Introduction to Scratch**
| Objective | Slide | Worksheet Q |
|---|---|---|
| find the three areas | S3 screen | activity: **label** the Scratch screen + Support locate-the-palette |
| name a sprite & stage | S3 | starter: match word↔meaning / "the cat is the…" |
| place a block & run it | S4 | activity Core: "what do you do to run a block" + show-your-work |
| add a sprite | S5 | activity show-your-work (screenshot + how many sprites) |

**L2 Programming sprites**
| Objective | Slide | Worksheet Q |
|---|---|---|
| choose blocks to move | S3 | activity: program two sprites (screenshot) |
| predict the block | S2/S5 | starter **multi-select** which blocks moved the cat; activity Core predict |
| match block↔action | S3 | activity: **matching** grid |
| program >1 sprite | S4 | activity Support/Challenge: a block controls only its own sprite |

**L3 Sequences**
| Objective | Slide | Worksheet Q |
|---|---|---|
| a program has a start | S2 joined | starter: joined vs not / why join |
| name event blocks | S3 events | activity: **matching** event↔trigger |
| join into a sequence | S2 | activity **order** (build a script) |
| build from a design | S4 | activity Core/Challenge plan + show-your-work; S5 real-world order |

**L4 Ordering commands**
| Objective | Slide | Worksheet Q |
|---|---|---|
| choose a sound block | S2 two blocks | starter: which block = tune / chord |
| order changes the tune | S3 order | activity Core "same notes different order?" |
| order blocks → tune | S3 | activity **order** the sound blocks (screenshot) |
| notes together → chord | S4 chord | starter/activity Challenge "which block for a chord, why" |

**L5 Looking good**
| Objective | Slide | Worksheet Q |
|---|---|---|
| sequence motion + sound | S2 | starter predict the mixed sequence |
| change sprite via costume | S3 | starter **sort** + Support costume/backdrop |
| change stage via backdrop | S3 | activity Core which backdrop |
| design choices | S4 | activity Challenge "explain one design choice" + show-your-work |

**L6 Making an instrument**
| Objective | Slide | Worksheet Q |
|---|---|---|
| name the objects | S2 | starter: each key = sprite + sound |
| task → design | S3 | starter useful names; activity Core algorithm |
| algorithm → code | S3/S4 | activity **order** build steps + write the algorithm |
| find & fix a bug | S4 bug | activity Core/Challenge "what kind of problem / describe a bug" + show-your-work |

## Images embedded (all OGL, extracted from source decks)
- `l1-scratch-screen.png` — clean full Scratch UI (drives the L1 **label** task)
- `l1-beebot-top.png` — Bee-Bot top (L1 starter "you already know this")
- `l2-which-blocks.png` — separate motion blocks (L2 which-blocks / L2 slides)
- `l3-joined-blocks.png` — three joined motion blocks = a sequence
- `l3-event-blocks.png` — the three event hats (when flag / sprite clicked / key pressed)
- `l4-sound-blocks.png` — start sound vs play sound until done (the key contrast)
- `l4-tune-sequence.png` — a tune built from play-sound-until-done blocks
- `l5-motion-blocks.png` — motion block bank (L5 starter/slides)
- `l6-block-bank.png` — block bank for designing the instrument
- `l6-bug.png` — a bug clipart (anchors the L6 debug idea)

## Image-gap log (for WORKSHEET_QUESTION_TYPES.md §4 next pass)
| Lesson | Where | Wanted | Source had one? |
|---|---|---|---|
| L1 | starter | a labelled "block / sprite / stage" annotated still | ⚠️ used the clean unlabelled screen for the label widget instead |
| L4 | starter/slides | a side-by-side "all notes at once (chord)" vs "one after another (tune)" timeline | ⚠️ source shows the two block stacks but not a sound-timeline graphic |
| L5 | activity | a before/after costume + backdrop change still | ⚠️ source costume/backdrop demos are animated GIFs (excluded per no-animation) |
| L6 | slides | a clean Scratch piano-keys layout still | ⚠️ source key layout only inside an animated GIF — omitted; used block bank + bug clipart |

## Notes
- Source decks' demo media are largely **animated GIFs** (Scratch screen recordings) — excluded per the no-animation default; static block/UI stills extracted instead.
- L4 deliberately keeps tune references generic ("a known tune" / "G, B, D") — no song lyrics reproduced.
- Sound is intrinsic to L4–L6; flagged on slides as part of the task with headphones optional (the low-arousal default otherwise bans sound).
