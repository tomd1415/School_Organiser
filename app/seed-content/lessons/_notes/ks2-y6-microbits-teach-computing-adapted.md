# Conversion notes — KS2 Y6 Microbits (Teach Computing — adapted)

**Slug:** `ks2-y6-microbits-teach-computing-adapted`
**Course / key stage:** KS2 Computing · KS2
**Lessons:** 2 (both TCC lessons converted — L1 counter, L2 timer)
**Framing:** PRIMARY content (TCC KS2→KS3 transition unit), SEND-secondary cohort — concrete,
age-respectful, very low reading load, lean on visual/drag types (order, parsons, multi-select, choice,
screenshot). Both lessons are make/program lessons, so each activity worksheet carries a MakeCode-link
field + a 📷 screenshot show-your-work.

## Question-type spread (variety, low writing)
- **order** (sequence) — L1 (plan the counter algorithm)
- **parsons** (order code) — L1 (counter blocks: set/on button/change/show), L2 (timer if…else blocks)
- **multi-select** — L1 starter (which inputs/buttons we use; battery is the odd one out)
- **single-choice / Support** — every Support section (single-correct; not the multi-correct trap):
  micro:bit is, variable is, which block adds 1 / resets, where the bug is, what "true" means, forever loop
- **text** — Core/Challenge explain-and-reason (set count to 0; old value replaced; fix the bug; true/false vs 1/0)
- **screenshot + MakeCode link** — both activity worksheets (show-your-work)
- **scale** — not used (✅ checklist covers self-assessment)

## Image use (all OGL, Teach Computing © Raspberry Pi Foundation)
| Lesson | Embedded | Used for |
|---|---|---|
| L1 | MakeCode start screen; Variables panel (Make a Variable / set / change); finished counter program | open MakeCode + New Project; make the variable; the counter blocks to copy & test |
| L2 | buggy countdown (start 30 / graph up to 10); fixed countdown (graph up to 30); Boolean set true; Boolean set false; if…else if blocks; complete timer (start/stop/reset) | PRIMM debug (the two numbers must match); Boolean on/off; selection; the finished timer to make |

**Skipped source images:** TCC banner / NCCE logo (`L2-image1`), laptop clipart (`L1-image17`), sport
silhouettes (`L1-image4/5`), "Led" menu toggle (`L2-image14`). Single-block close-ups that duplicate the
full-program shots (`L1-image7/8/9/13/14/15`, `L2-image13/16/17`) were not all embedded — the composite
program images (`l1-counter-program`, `l2-timer-complete`) carry the same blocks more usefully.

## §7a Alignment (objective → slide → worksheet Q)
**L1 Making a micro:bit counter**
- variable holds one value (S "A variable holds one value" / starter Support choice + Core + Challenge)
- buttons/inputs change a variable (S "Inputs — the buttons" / starter multi-select; activity Support "which block adds 1")
- plan an algorithm (S "Plan first, then code" / activity order + parsons)
- make & test (S "Make and test your counter" / activity show-your-work: MakeCode link + 📷; Challenge reset)

**L2 Making a micro:bit timer**
- countdown + loop (S "Starter — why a timer?" / starter choices: change count, why a timer, forever loop)
- find & fix a bug (S "Find the bug — debug" / activity Support where-bug + Core write-the-fix)
- Boolean true/false + if…else (S "True or false — Boolean" & "if…else" / activity choice "true = on" + Challenge; parsons of the if…else blocks)
- make & test (S "Make and test your timer" / activity show-your-work: MakeCode link + 📷)

## Image gaps (logged to WORKSHEET_QUESTION_TYPES.md §4)
- L1 — no clean **photo of a physical micro:bit board** in the source deck (only MakeCode screenshots +
  clipart); a real labelled board photo would unlock a `label` drag-the-parts task (button A/B, LED display,
  USB, pins). Not sourced.
- L2 — no still of the **LED bar-graph mid-countdown** on the physical device; relied on the MakeCode
  program shots (bug/fixed/complete) instead.

## Verified
`npx tsx _vfile.ts seed-content/lessons/ks2-y6-microbits-teach-computing-adapted` → ✅ file-level checks
passed (both activity worksheets have a 📷 field + MakeCode link; slides end .md with teacher notes; S/C/C slice).
