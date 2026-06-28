# Conversion notes — KS2 Y6 Variables in games (Teach Computing — adapted)

**Slug:** `ks2-y6-variables-in-games-teach-computing-adapted`
**Course / key stage:** KS2 Computing · KS2
**Lessons:** 6 (every TCC lesson converted)
**Framing:** PRIMARY content (Scratch variables), SEND-secondary cohort — concrete, age-respectful (not
babyish), very low reading load, lean on visual/drag types. This unit is Scratch-heavy, so **Parsons**
(order real Scratch blocks) carries the code-ordering tasks; **order** carries plain-language process steps.

## Question-type spread (variety, low writing)
- **parsons** (order Scratch blocks) — L2 (when sprite clicked → change Score_A), L3 (green flag → set score to 0),
  L5 (ask → set name → say), L6 (if touching bottom → change lives by -1 → hide)
- **order** (sequence, plain steps) — L1 (make-a-variable steps), L3 (set vs change covered by sort), L4 (falling-sprite
  algorithm), L5 (build → run → test → debug), L6 (save → Share → copy URL → give to friend)
- **sort** (card-sort) — L1 (number vs letters), L2 (name vs value), L3 (set vs change blocks), L4 (sprites vs background)
- **matching grid** — L3 (where the change-score block goes → what happens), L5 (variable_a/variable_b → age/name)
- **multi-select** — L1 starter (what changes), L2 starter (which are variables), L3 starter (variables to add),
  L4 starter (what's in the game), L5 starter (where variables are used), L6 starter (ways to improve)
- **fill-blank** — L4 (the falling-star algorithm: "moves [[ ]] the screen … changes the [[ ]]")
- **label** — L2 (label the score + timer on the game stage, l2-score-timer.png)
- **scale** — L6 (self-rate confidence with variables, plenary)
- **single-choice** — every Support section + L6 helpful-feedback (all single-correct; no multi-correct trap)
- **screenshot** — every activity worksheet (📷 show-your-work; the make/build objective is evidenced here)

## Image use (all OGL, Teach Computing © Raspberry Pi Foundation)
| Lesson | Embedded | Used for |
|---|---|---|
| L1 | Scratch editor; change score by 2; change score by -2 | the editor; up/down score changes |
| L2 | game stage (score+timer); scoreboard (USA/Japan flags); change Score_A by 1 | starter variables; scoreboard build; making a variable |
| L3 | Pong code (set score to 0 + repeat loop); change by 1 then 2; change by 1 then -1 | set at green flag; where to change; up vs down |
| L4 | game controllers (photo); Fruit catcher stage; hand-drawn star→bowl algorithm sketch | games-designer hook; analyse the game; algorithm example |
| L5 | chatbot code with variable_a/variable_b; same code renamed name/age; controllers (photo) | poor vs good names; games-designer hook |
| L6 | grid of 4 fruit-catcher remixes; lives/missed variable code | are all games the same; add a lives variable |

Real Scratch screenshots throughout (variable blocks, score/timer display, full editor, working game stages) —
this unit's source deck was image-rich, so no analogy-only substitutes were needed.

## §7a Alignment (objective → slide → worksheet Q)
**L1 Introducing variables** — variable can change (S2/S3, starter multi-select + Support); things that change
(starter multi-select + Core); change a score in Scratch (S4, activity Support + screenshot); number/letters
(S6, activity sort + Challenge).
**L2 Variables in programming** — one value at a time (S3, starter choice + Core); name & value (S4, activity sort
+ Support); clear name (S5, activity choice + Core); make & change in Scratch (S6, activity parsons + label + screenshot).
**L3 Improving a game** — choose variables (S2, starter multi-select + Support); set at green flag (S3, activity
parsons + Support); where to change (S4, activity matching grid + sort); improve with variables (activity Core +
screenshot).
**L4 Becoming a games designer** — what a designer does (S2, starter Support); choose artwork (S4, activity sort +
Support); write an algorithm (S5, activity fill-blank + order); explain choices (activity Challenge + design screenshot).
**L5 Design to code** — add artwork (S4, slides + screenshot); name a variable (S2/S3, starter + activity matching +
Support); build from design (S4, activity parsons + screenshot); test & debug (S5, activity order + Challenge).
**L6 Improving and sharing** — improve the game (S2, starter multi-select + Support); add lives (S3, activity parsons +
Support + Core); share (S4, activity order); helpful feedback (S5, activity choice); + confidence scale + screenshot.

## Image gaps (logged to WORKSHEET_QUESTION_TYPES.md §4)
- None critical — the source deck supplied genuine Scratch screenshots for every lesson. Soft note: L4/L5 reuse the
  same game-controllers photo as the "games designer" hook (no second clean designer-context photo in source); the
  hand-drawn algorithm sketch (L4) is rough but is the authentic TCC design artefact.
- Decorative/skipped from source: NCCE banner (image1/image2), national-flag clipart, thumbs-up / speech-bubble /
  lego / question-mark / star / magic-wand clipart, animated GIFs (L2-image4/6, excluded per no-animation), sticky-note
  and URL-bar fragments.

## Verified
`npx tsx _vfile.ts seed-content/lessons/ks2-y6-variables-in-games-teach-computing-adapted` →
**✅ file-level checks passed** (6 lessons; every activity has a 📷 field; all slide decks end .md with teacher
notes and ≥7 slides; S/C/C slice on every worksheet; no multi-correct-on-single-radio traps).
