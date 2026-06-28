# Conversion notes — KS1 Y1 Moving a robot (Teach Computing — adapted)

- **Slug:** `ks1-y1-moving-a-robot-teach-computing-adapted`
- **Course / KS:** KS1 Computing · KS1
- **Source:** `TeachComputing/KS1/Year_1/Unit 3 Moving a robot` (Unit guide + L1–L6 zips). 6 lessons converted.
- **Cohort:** SEND secondary working at KS1 level — content concrete/simple, framing age-respectful (no infant tone), very low reading load, leaning on drag/visual types.
- **Robot:** source is Bee-Bot/Blue-Bot. Worksheets/slides say "the floor robot" so they fit whatever device the school owns.

## Images used (OGL — Teach Computing © Raspberry Pi Foundation)
| File | Source | Used on |
|---|---|---|
| `l1-beebot-buttons.png` | L1 slides `image3.png` — top-down photo of the seven buttons | L1 starter (label-a-diagram) + slides; L4 starter + slides (turn buttons) |
| `l3-beebot-side.png` | L3 slides `image4.png` — side-view photo of the robot | L3 starter + slides |

The button photo is a strong **label** fit: 6 zones set by viewing the 852×1080 image — Forwards (49,39), Left turn (29,56), Go (49,56), Right turn (70,56), Clear (29,75), Backwards (49,74).

## Question-type coverage
All demand met by existing types — **no new type-gaps**. Spread used:
- **label** (L1 button diagram), **order** (L2 act-out sequence, L3 run-a-program steps, L4 four-command program, L5 plan→program steps, L6 plan-and-test steps), **sort** (L2 act-out-able words, L3 forwards/backwards/no-move, L4 move-square vs turn-on-spot, L6 true/not-true about routes), **matching** (L1 button↔job, L5 algorithm/program/debug), **single-choice** predictions throughout, **multi-select** (L1 direction commands), **screenshot** (photo of robot/cards/mat — there is no MakeCode artefact in a floor-robot unit, so "Show your work" is a 📷 photo only), **checklist**.

## Image gaps (logged here — shared docs not edited, parallel agents)
| Lesson | Where | Wanted | Source had one? |
|---|---|---|---|
| L3–L6 | route/predict tasks | a CLEAN blank grid **mat** (numbered squares) — would unlock a stronger label/order-on-a-grid task | ⚠️ source mats are PowerPoint **vector shapes**, not rasters — `extractOfficeImages` returns none |
| L1, L5, L6 | command sequences | printable **command-card icons** (forwards/back/left/right arrows) to show next to the order/sort blocks | ⚠️ source command cards are PPT shapes/clip-art; used text + words instead |
| L2 | act-out instructions | a simple "child as robot" still | ⚠️ source decorative clip-art only |

(Other extractable source images were decorative — forest/castle/dragon story-mat art, thumbs-up, NCCE logos — not embedded.)

## §7a Alignment — objective ↔ slide ↔ worksheet (one story per lesson)

**L1 Buttons**
| Objective | Slide | Worksheet Q |
|---|---|---|
| predict the outcome of a command | S4 buttons, S5 clear/go | activity Predict (which button moved it away) |
| match a command to an outcome | S6 match-the-move | starter matching (button↔job); activity Support match move→button |
| run a command on a device | S5 clear→cmd→go, S6 your turn | activity Core (press Clear first / Go runs) + Show-your-work photo |

**L2 Directions** (unplugged)
| follow an instruction | S4 you-are-the-robot | activity Core (robot does only what told) + order the instructions |
| recall words that can be acted out | S5 words-we-can-act-out | starter sort (can/can't act out) |
| give directions | S6 giving-directions | activity Challenge (3 instructions door→chair) + Show-your-work |

**L3 Forwards and backwards**
| compare forward and backward movements | S4 move/start, S5 fwd/back | starter sort (fwd/back/no-move) |
| start a sequence from the same place | S5 start-same-square | starter Challenge (why same start) |
| predict a fwd/back sequence | S6 where-will-it-get-to | starter Core + activity Core predictions; activity order (run-a-program steps) |

**L4 Four directions**
| compare left and right turns | S4 in-a-spin, S5 left/right | starter Core (same amount) |
| experiment with turn and move commands | S4 try turns, S6 work-it-out | starter sort (move-square vs turn-on-spot); activity order (4-cmd program) |
| predict a sequence of up to four commands | S6 work-it-out | activity Core (facing after turn / how many moves) + Challenge |

**L5 Getting there**
| explain what my program should do | S4 point-out-route | activity Core (plan before pressing) |
| choose the order of commands | S5 plan-algorithm | starter matching (alg/prog/debug); activity order (make-a-program steps) |
| debug my program | S6 make-it-a-program-and-debug | starter Core/Challenge (fix it) + activity Challenge (find/fix bug) |

**L6 Routes**
| identify several possible solutions | S3 which-way, S4 this-way-and-that | starter sort (true/not-true) + starter Core choice |
| plan two programs | S5 design-your-programs | activity Core (second route) + order (plan-and-test) |
| use two different programs to the same place | S5–S6 | activity Challenge (final left-turns+forwards route) + Show-your-work |

No orphan objectives; every worksheet question maps to a slide/plan point; each single-choice has exactly one correct option (multi-correct uses multi-select).

## Self-verify
PASS — for all 6 lessons: every worksheet renders a screenshot (kind=image) field, support slice ≠ challenge slice; every deck slices to ≥7 slides with non-empty teacher notes; all slide resource titles end `.md`; every `{{res:}}` resolves to a declared manifest file.
