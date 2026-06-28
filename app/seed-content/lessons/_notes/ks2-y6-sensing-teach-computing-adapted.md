# Conversion notes — KS2 Y6 Sensing (Teach Computing — adapted)

**Slug:** `ks2-y6-sensing-teach-computing-adapted`
**Course / key stage:** KS2 Computing · KS2
**Lessons:** 6 (every TCC lesson converted)
**Framing:** PRIMARY content (micro:bit + MakeCode), SEND-secondary cohort — concrete, age-respectful
(not babyish), very low reading load, lean on visual/drag types (parsons, order, matching, multi-select,
choice, screenshot). Make/program objectives are evidenced by the MakeCode share link + screenshot.

## Question-type spread (variety, low writing)
- **parsons** (order CODE blocks) — L2 (fortune teller), L3 (button + shake counter), L4 (simple N/S compass),
  L6 (step counter)
- **order** (sequence, non-code) — L1 (the flash steps), L5 (the step-counter algorithm steps)
- **matching grid** — L4 activity (heading → direction; diagonal = correct: 30→N, 120→E, 200→S, 270→W)
- **multi-select** — L3 starter (which are inputs; LED screen is the odd one out)
- **single-choice / true-false** — every Support section (single-correct, correct option listed first; not the
  multi-correct trap); L3/L6 Core choices; L4 starter Challenge (true/false)
- **text** — Core/Challenge explain/reason cells
- **screenshot** — every activity worksheet (📷 show-your-work) + MakeCode share link (L5 = design screenshot)
- **scale** — not used (✅ checklist covers self-assessment)

## Image use (all OGL, Teach Computing © Raspberry Pi Foundation)
| Lesson | Embedded | Used for |
|---|---|---|
| L1 | labelled micro:bit board, MakeCode home (New Project), MakeCode screen, on start/forever blocks | parts; the environment; wrap-around blocks |
| L2 | pick random block, fortune-teller code, real micro:bit + battery photo | random; if/then/else; battery plenary |
| L3 | counter-with-buttons code, show-count-on-shake code, emulator (A/B/SHAKE), labelled board | button & movement inputs; variable |
| L4 | simple compass code, compass-heading<number block, algorithm+flow diagram, emulator showing heading | comparison operators; order; making the compass |
| L5 | step-counter algorithm+flow design, labelled board (accelerometer) | designing the algorithm/flow; the sensor |
| L6 | step-counter code blocks, sensitivity block (acceleration mg strength > 1500) | building; fixing sensitivity |

The labelled micro:bit board (source image5) is reused across L1/L3/L5 (copied as l1-/l3-/l5-microbit-parts.png).

## §7a Alignment (objective → slide → worksheet Q)
**L1 The micro:bit** — parts (S2/S3 · starter Support choice + Core); make+test on emulator (S4 · activity
Support "what is the emulator" + show-your-work); flash to device (S5 · activity order block + screenshot).
**L2 Go with the flow** — conditions in real life (S2 · starter choice + Core write-own); if/then/else controls
a program (S3/S5 · activity parsons + screenshot); random number (S4 · activity Support choice + image).
**L3 Sensing inputs** — button changes a variable (S4 · activity parsons + screenshot; starter multi-select);
movement/accelerometer changes a variable (S5 · activity Support + parsons + screenshot); checking doesn't
change value (S6 · activity Core choice + Challenge explain).
**L4 Finding your way** — comparison operator (S3 · starter Support symbol + activity Support; matching grid);
order of conditions (S5 · activity Core); change program to a compass (S6 · activity parsons + screenshot).
**L5 Designing a step counter** — choose the variable (S4 · starter Core + slide); design the algorithm (S5 ·
activity order + design screenshot); design the program flow (S6 · activity Challenge + flow screenshot).
**L6 Making a step counter** — build from design (S3 · activity parsons + screenshot); test & debug (S4 ·
starter Core/Challenge + slide); change sensitivity (S5 · activity Core choice + Challenge + image).

## Image gaps (logged to WORKSHEET_QUESTION_TYPES.md §4)
- **L1/L3 — no CLEAN unlabelled micro:bit board.** The source board diagram (image5) already has every part
  printed on it, so a `label`-the-parts drag widget would be trivial (answers visible). Used it as a reference
  image with a single-choice/multi-select instead. A clean unlabelled V2 board would unlock a real label task.
- **L4 — no clean unlabelled compass rose** (degrees→N/E/S/W). Built the heading→direction task as a matching
  grid + the source algorithm/flow diagram image instead.
- **Source flow diagrams** (L4, L5) are TCC slide artwork that DID raster-extract here (image15/image9), so they
  are embedded — no gap. The fortune-teller / counter / compass / step-counter code are all real MakeCode block
  screenshots from the decks (embedded).
- **Videos not included.** Source has L3 "checking variables", L4 "compass emulation", L5/L6 isolate/substitute
  + project emulation .mp4s. Per the low-arousal (no motion/sound) default these were NOT embedded; the concepts
  are carried by the block screenshots + parsons. Teacher can play the originals from the reference import.

## Verified
`npx tsx _vfile.ts seed-content/lessons/ks2-y6-sensing-teach-computing-adapted` → ✅ file-level checks passed
(every activity has a 📷 field; slides end .md with teacher notes; S/C/C slice; all {{res:…}} resolve).
