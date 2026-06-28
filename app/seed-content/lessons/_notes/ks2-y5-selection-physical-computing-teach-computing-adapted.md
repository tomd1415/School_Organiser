# Conversion notes — KS2 Y5 Selection in physical computing (Teach Computing — adapted)

- **Slug:** `ks2-y5-selection-physical-computing-teach-computing-adapted`
- **Course / key stage:** KS2 Computing · **KS2**
- **Source:** TeachComputing KS2 Year 5 Unit 3 "Selection in physical computing" (Programming A, v1.5),
  Lessons 1–6 + the unit guide. Crumble controller / Sparkle / motor / push switch. © Raspberry Pi
  Foundation, OGL v3.0.
- **Lessons authored:** 6 (each: starter worksheet + activity worksheet + slide deck + media).
- **Primary content, SEND-secondary cohort:** content kept simple/concrete (Crumble physical computing,
  primary level) but framing is age-respectful — no "boys and girls" / infant tone. Very low reading load;
  heavy use of visual/drag types (label, sort, order, Parsons, matching, multi-select, screenshot, scale).
- **Self-verify:** PASS (every worksheet renders; activity worksheets each carry a screenshot image field;
  support vs challenge slices differ; all 6 decks ≥7 slides with non-empty teacher notes; all `{{res:}}`
  placeholders map to declared files; all declared images present on disk).
- **Question types used:** text, multiple-choice, multi-select, matching, fill-in-the-blank, Parsons (code),
  order (steps), card-sort, label-a-diagram, slider/scale, screenshot, checklist (12 interactive kinds —
  high variety).
- **Adaptation:** show-your-work uses "what colour/condition…" + a Crumble-software **screenshot** (this unit
  programs the Crumble, not MakeCode). Every activity has a `[scale 1-5]` confidence self-rating in place of a
  bare checklist plenary. SEND defaults throughout (low-arousal decks, I-do/we-do/you-do, S/C/C on the same
  task, TA fix-words on every activity).

> **Heading gotcha:** the word "challenge" only appears in the level dividers `## 🔴 Challenge` — the manifest
> lesson titles avoid it, so no slice was silently blanked. (No "Support/Core/Challenge" wording leaks into
> any other heading.)
>
> **Animation note:** the source decks include several **animated GIFs** (block-build animations, Crumble in
> use). Per the no-animation rule these were **excluded**; the equivalent **still** code images were embedded
> instead (the source provides clean PNG stills of every program), so no information is lost.

---

## §7a alignment — Lesson 1: Connecting Crumbles

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| build a circuit + connect to a microcontroller | S2 board, S3 Sparkle, S4 connect | starter: **label** the Crumble board (shared) · what is a microcontroller **choice** (Support) · what is a Sparkle (Core) · activity **order** the build steps (shared) |
| program a microcontroller to make an LED switch on | S5 program | activity: **Parsons** the flashing program (shared) · which block repeats / loop behaviour **choice** (Support) |
| explain what an infinite loop does | S6 infinite loop | activity: explain "do forever" (Core) · change colours/timings (Challenge) · multi-select what a microcontroller can do (starter Challenge) · show-your-work screenshot |

Media: Crumble board (used by the label task), infinite-loop program still.

## §7a alignment — Lesson 2: Combining output components

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| connect more than one output component | S2 outputs, S3 wiring | starter: **card-sort** output vs not (shared) · motor/Sparkle **choice** (Support) · name two outputs (Core) |
| use a count-controlled loop to control outputs | S4 count loop | activity: **Parsons** the "do 4 times" program (shared) · which loop **choice** (Support) · **fill-blank** the loop count (Core) |
| design a sequence using a count-controlled loop | S5 algorithms | activity: **order** the disco-dancer algorithm (shared) · design your own sequence (Challenge) · show-your-work screenshot |

Media: motor + Sparkle wiring diagram, count-controlled program still.

## §7a alignment — Lesson 3: Controlling with conditions

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| explain that a condition is true or false | S2 condition | starter: **card-sort** condition vs not (shared) · true/false **choice** (Support) · write a condition (Core) · why "what is the weather?" isn't a condition (Challenge) |
| design a conditional loop | S4 do until | activity: **Parsons** "do until A is HI" (shared) · **matching** loop words (shared) · **fill-blank** the condition (Core) · design a do-until (Challenge) |
| program a microcontroller to respond to an input | S3 switch | activity: switch-is-input prediction (shared) · input **choice** (Support) · show-your-work screenshot |

Media: push-switch wiring diagram, do-until program still.

## §7a alignment — Lesson 4: Starting with selection

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| explain that a condition being met can start an action | S2 condition/action, S3 selection | starter: **card-sort** condition vs action (shared) · which part is condition **choice** (Support) |
| identify a condition and an action | S2, S4 code | starter: condition/action **choice** (Support) · write an if…then (Core) |
| use selection (an if…then statement) | S4 if…then, S5 keep checking | activity: **Parsons** if…then in a forever loop (shared) · selection-words **choice** (Support) · **fill-blank** if/then (Core) · add a 2nd action (Challenge) · show-your-work screenshot |

Media: if…then selection program still, selection-inside-forever-loop still.

## §7a alignment — Lesson 5: Drawing designs

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| identify a real-world example of a condition starting an action | S2 selection around us, S3 project | starter: condition→action **choice** rows (shared) · selection **choice** (Support) · real-world if…then (Core) · **multi-select** everyday devices (Challenge) |
| describe what my project will do | S3 project, S4 model | activity: what will it do (shared text) · **fill-blank** input + 2 outputs (Core) · the if…then it uses (Challenge) |
| create a detailed, labelled drawing | S5 design | activity: **order** the design steps (shared) · **multi-select** parts to include (Support) · labelled diagram + wiring plan → photo (screenshot) |

Media: fairground carousel photo, cardboard carousel model with Crumble.

## §7a alignment — Lesson 6: Writing and testing algorithms

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| write an algorithm that describes what my model will do | S2 precise, S3 write | starter: **order** the algorithm (shared) · precise vs vague **choice** (Support) · add a detail (Core) · my-algorithm (activity shared text) |
| use selection to produce an intended outcome | S4 build from algorithm | activity: **Parsons** selection program for the carousel (shared) |
| test and debug my project | S5 test/debug, S6 evaluate | activity: most-likely-bug **choice** (Support) · **fill-blank** the fix "A is HI" (Core) · what you tested/changed (Challenge) · evaluate + show-your-work screenshot |

Media: selection-inside-forever-loop still (reused), cardboard carousel model (reused).

---

## Image notes / gaps
- Strong image coverage from the source decks: the Crumble board (drives the label task), full wiring
  diagrams (motor+Sparkle, push switch), every program as a clean still, and two real carousel photos
  (fairground + the cardboard model). No new image gap for this unit.
- **Excluded:** animated GIFs of block-builds and the Crumble-in-use clip (no-animation rule) — replaced by
  equivalent PNG stills, and the NCCE/Raspberry-Pi logo + decorative clip-art (thumbs-up, yes/no figure,
  glass of water) were skipped as non-content.

## Type gaps
- None. All demand met by the built types (label, sort, order, Parsons, matching, multi-select, fill-blank,
  scale, screenshot, checklist). No new entry needed in WORKSHEET_QUESTION_TYPES.md §2.
