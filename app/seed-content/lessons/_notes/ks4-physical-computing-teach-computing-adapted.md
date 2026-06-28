# Conversion notes — KS4 Physical computing (Teach Computing — adapted)

Bundle: `app/seed-content/lessons/ks4-physical-computing-teach-computing-adapted/`
Source: `TeachComputing/KS4_non_GCSE/unit_4/` — "KS4 Physical computing programming project" (Raspberry Pi Pico
microcontroller, MicroPython in Thonny; a six-lesson build of a motorised robotic buggy: GPIO/LED → motors →
chassis → ultrasonic → line-following → lights + final challenge). Target course: KS4 IT & Digital Skills (KS4).
6 lessons converted (all of the unit). The unit has **no separate summative quiz docx** — only a project
**rubric** (`Rubric - Project assessment`) + plenary quizzes (L1 quick-fire, L5 GPIO quiz). Per the brief, the
recall content is folded into a new **end-of-unit quiz worksheet** on L6.

Self-verify: PASS — JSON valid; every manifest `file` on disk; every `{{res:…}}` resolves; all activity
worksheets have a 📷 screenshot field + a ✅ checklist; level worksheets slice (support ≠ challenge); all decks
parse (6–9 slides each) with non-empty `> 🧑‍🏫` notes; all slide resource titles end `.md`; no single-radio
multi-correct (tick-all uses multi-select).

Question-type variety used: label-a-diagram (L1 Pico board), card-sort (L1 embedded systems, L2 fwd/bwd,
L3 strong/weak chassis, L4 ultrasonic users, L5 sensor-state→action, L6 brake-light situations), order/sequence
non-code (L2 wiring, L3 build, L4 wiring, L6 final sequence), Parsons code (L1 blink, L2 motor test, L4 ultrasonic
test, L5 line test, L6 headlight flash), matching (L4 ultrasonic pins, L5 optical-sensor pins, quiz key-words),
multi-select (L3 what-it-holds, quiz outputs), fill-in-the-blank (quiz), code cells, single-choice + short text
throughout. No new type was needed.

## §7a Alignment tables

### L1 — Introduction to physical computing
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe physical computing | S3 "What is physical computing?" | starter Support MC "physical computing means…" |
| explain microcontroller + embedded system | S2 starter, S4 board | starter MC "a microcontroller is…", card-sort embedded systems; Core "device at home", "GPIO"; Challenge "washing machine" |
| input vs output | S3 | starter Support MC (LED/button in/out); Challenge "one input + one output" |
| build + test an LED circuit | S6 I-do, S7 you-do | activity Predict + Parsons (blink) + Support value(1)/value(0); Core pin/why output; Challenge button; show-your-work |

### L2 — Working with motors
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| why motors need a controller | S2 starter, S3 board | starter MC + Core "why can't the Pico"; Challenge "common ground rail" |
| name the wiring parts | S4 pinout, S5 wire-up | activity order (wiring steps); Support IN1/IN2 controls |
| drive a motor fwd/bwd | S6 test | activity Predict + Parsons (motor test) + card-sort fwd/bwd; Core 2nd motor code |
| work out left vs right | S6 | activity Core "wrong way fix"; Challenge both forwards; show-your-work |

### L3 — Chassis design and build
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| plan where parts sit | S2 starter, S3 plan | starter card-sort strong/weak; activity order (build steps) + "battery placement"; Support plan-before-fix |
| choose materials | S3 | starter Core "material + why"; Support heaviest-part |
| build a chassis that holds | S4 build | activity Core small-vs-floppy; Challenge wobble-fix; show-your-work (photo of chassis) |
| test fwd/bwd | S5 test | activity "did it stay together / change" + ✅ checklist |

### L4 — Going ultrasonic!
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| how ultrasonic senses distance | S2 starter, S5 we-do | starter MC + card-sort users; Core echolocation; Challenge vs camera; activity Core time→distance |
| name the four pins | S3 sensor | activity matching (VCC/GND/Trig/Echo) + Support Trig/Echo in/out |
| wire the sensor | S4 wire-up | activity order (wiring steps); Support "swap → not work" |
| run distance code | S6 you-do | activity Parsons (test) + Core print line; Challenge if<10cm; show-your-work |

### L5 — Follow me!
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| how an optical sensor works | S2 starter | starter MC "shines IR" + match pins (G/V+/S); Support black-line reflection; Core 0/1; Challenge potentiometer |
| wire two sensors | S3 I-do | activity Parsons (test code) + Support GP10/Pin.IN |
| read on/off-line values | S3 | starter Core 0/1; activity Core "both 0 → ?" |
| steer along the line | S4 rules, S5 you-do | activity card-sort situation→action + Core turn-right motor; Challenge curve; show-your-work |

### L6 — Time to shine!
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| wire headlights + brake lights | S2 starter, S3 I-do | starter MC anode-leg + card-sort brake on/off; Support white/red, short-leg→GND; activity Core brake-light pin code |
| switch lights at the right time | S3 | activity Parsons (flash ×3) + Support match light→when; Core after-wait step |
| combine motors+sensors+lights | S4 synergy, S5 you-do | starter Challenge synergy; activity order (final sequence) + Challenge add line-following; show-your-work |
| review the whole project | S6 quiz | end-of-unit quiz (key-word matching, multi-select outputs, code/pin MC, fill-blank, short answers) |

## Image gaps (logged for sourcing/creating later)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1 | activity — button circuit | a clean Pico + button + pull-down circuit still | ⚠️ Only the LED circuit raster was in the source decks; the button-circuit diagram is embedded in the worksheet docx as a low-res inline image. Embedded the LED circuit; the button task is text/code only. |
| L2 | activity — full motor+battery+rail wiring | the complete fritzing wiring (motors + IN pins + common rails + battery) | ⚠️ Source has it split across worksheet-docx inline images; embedded the two-motor controller fritzing (deck) + the L298N photo + the pinout. A single full-wiring raster would help. |
| L3 | build steps | step-by-step "assemble the chassis" photo strip (the unit's Information sheet describes 10 stages) | ⚠️ The 10-stage assembly photos live in the **Information sheet docx** as inline images, not in the deck `.pptx`. Embedded the finished-buggy layout photo; the stages are an `order` task. Worth extracting the docx photo strip on a later pass. |
| L4 | activity — sensor wiring on the buggy | a "Trig→GP20 / Echo→GP21" wiring still | ⚠️ Source wiring diagram is a worksheet-docx inline image; embedded the clean HC-SR04 pin photo + used an `order` task for the wiring. |
| L5 | activity — two sensors mounted underneath | underside photo of the two optical sensors fitted to the chassis | ⚠️ Source underside shot is a low-res worksheet-docx inline image. Embedded the sensor module (G/V+/S pins) + the line-follow cartoon. |
| L6 | starter — anode/cathode LED leg diagram | a clean labelled long-leg/short-leg LED diagram | ⚠️ Source recap is a PPT shape diagram. Embedded the white + red LED clipart; anode/cathode handled in prose + MC. |

Embedded OK (16 images, all OGL — Teach Computing © Raspberry Pi Foundation): L1 Pico board (deck `image5`,
used for the **label** task), microcontroller chip (`image1`), components scene (`image8`), LED-on-breadboard
circuit (from L2 deck `image4`); L2 L298N photo (`image9`), two-motor fritzing (`image3`), Pico pinout
(`image8`); L3 full-buggy layout (from L5 deck `image7`); L4 HC-SR04 sensor (`image9`), dolphin/echolocation
(`image4`); L5 optical sensor with G/V+/S pins (`image4`), line-following cartoon (`image8`); L6 finished buggy
front with headlights + ultrasonic (`image13`), finished buggy rear with brake lights (`image12`), white LED
(`image10`), red LED (`image11`).

## Video
No embeddable lesson video. L4's deck has a short **ultrasonic-ping audio clip** (sound only, used live by the
teacher — not embedded, and sound is against the low-arousal default). L5/L6 decks contain **animated GIFs**
(line-following / lights) — excluded per the no-animation / low-arousal default. Nothing to attach.

## Wanted-but-unbuilt question types
None. All demand met by existing/now-built types (label, card-sort, order, Parsons, matching, multi-select,
fill-blank, code, scale not needed here). Backlog (WORKSHEET_QUESTION_TYPES.md §2) unchanged.

## Other notes
- The unit is **Raspberry Pi Pico / MicroPython / Thonny**, not micro:bit — distinct from the KS3 Y9 physical
  computing bundle (which is micro:bit). Code in the worksheets is real MicroPython from the source worksheets
  (`Pin(15, Pin.OUT)`, `value(1)/value(0)`, the HC-SR04 timing function, the line-sensor read loop).
- Source `docxText` pulled the lesson plans and worksheets cleanly; many wiring diagrams are inline raster
  images **inside the worksheet/Information-sheet docx** (not the deck `.pptx`), so `extractOfficeImages` over the
  pptx did not surface them — see the image-gap table. The Information sheet's 10-stage chassis-assembly photo
  strip is the best candidate to extract next.
- The **project rubric** (LED timing, ultrasonic sensing, line-sensing, chassis design, structural integrity) is a
  unit-level assessment artefact, not a per-lesson worksheet; its criteria are reflected in the L6 activity +
  the end-of-unit quiz but the full rubric is not reproduced here. Flag for separate import if a native
  assessment is wanted.
