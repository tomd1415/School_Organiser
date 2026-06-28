# Conversion notes — KS2 Y6 3D modelling (Teach Computing — adapted)

**Slug:** `ks2-y6-3d-modelling-teach-computing-adapted`
**Course / key stage:** KS2 Computing · KS2
**Lessons:** 6 (every TCC lesson converted)
**Framing:** PRIMARY content (TinkerCAD-style 3D modelling), SEND-secondary cohort — simple/concrete,
age-respectful (not babyish), very low reading load, lean on visual/drag types (sort, order, label,
multi-select, choice, screenshot). Each lesson is a hands-on Tinkercad task; the **screenshot is the
evidence** for the "make/create" objectives (badge, desk tidy, building).

## Question-type spread (variety, low writing)
- **label** — L1 (label the Tinkercad screen: workplane/shapes/view tools), L2 (label the resize handles)
- **sort** (card-sort) — L1 starter (2D vs 3D shapes)
- **order** (sequence) — L1 (move a shape), L2 (build a house), L3 (group shapes), L4 (hollow a cylinder)
- **multi-select** — L3 (what you can do to a copy), L4 starter (techniques used), L5 (shapes in the house), L6 starter (techniques to use)
- **matching grid** — L5 (building → main shape; single-correct per row)
- **fill-blank** `[[ ]]` — L4 (mm measurements)
- **single-choice** — every Support section (single-correct; not the multi-correct trap)
- **scale** `[scale 1-5]` — L6 (how happy with your model)
- **screenshot** — every activity worksheet (📷 show-your-work); L6 has two (built model + improved model)

## Image use (all OGL, Teach Computing © Raspberry Pi Foundation) — real Tinkercad screenshots
| Lesson | Embedded | Used for |
|---|---|---|
| L1 | Tinkercad interface, sign-in, cube+sphere, top view, exploded car, complete car | the screen (label); add shapes; perspective; plenary "which shapes make the car" |
| L2 | cube with handles, prism-on-cuboid house, colour picker, 3D-printed cube (layers) | handles (label); resize/lift to make a house; recolour; 3D-print plenary |
| L3 | name badge (Ben+stars), rotated text, duplicate button (Ctrl+D), 4 copies, grouped badge | rotate; duplicate; group; make-a-badge example |
| L4 | desk tidy, cylinder with mm size, cube-with-hole, hollow cylinder pot | accurate sizing; placeholders/holes; build a desk tidy |
| L5 | exploded house, architect CAD plan, round stadium, modern towers, Tinkercad house | analyse/explode; architects; shapes in real buildings; plan |
| L6 | exploded house (reused), example Tinkercad model | construct from a plan; evaluate/improve |

## §7a Alignment (objective → slide → worksheet Q)
**L1 Introduction** — 2D vs 3D (S "2D and 3D" / starter sort + Support); add shapes (S "Tinkercad screen" /
activity label + show-your-work); perspective (S "Looking from different sides" / activity Support+Core);
move shapes (S "Moving shapes" / activity order + screenshot).
**L2 Modifying** — handles (S "Handles" / starter + activity label); resize in 3D (S "Resizing" / activity
Support+Core); lift/lower (S "Lifting" / activity order + Challenge + screenshot); recolour (S "Changing
colour" / activity choice).
**L3 Name badge** — rotate (S "Rotating" / activity Support+Core); duplicate (S "Duplicating" / activity
multi-select); group (S "Grouping" / activity order + Challenge); make badge (S "Make your name badge" /
screenshot + checklist).
**L4 Desk tidy** — size accurately (S "Accurate measurements" / activity fill-blank + Support+Core); placeholder
holes (S "Making holes" / activity order + Challenge); combine + make desk tidy (S "Build your desk tidy" /
screenshot).
**L5 Planning** — analyse (S "Exploding a model" / activity multi-select + Support+Core); choose objects (S
"Shapes in real buildings" / activity matching); combine + plan (S "Plan your building" / sketch + screenshot).
**L6 Make your own** — construct (S "Build it" / activity screenshot 1); evaluate (S "Evaluate with a partner"
/ activity Support + proportion/detail + scale + partner feedback); explain improvement (Challenge); modify
(S "Improve your model" / activity screenshot 2).

## Image gaps (logged to WORKSHEET_QUESTION_TYPES.md §4)
- L1/L2 — the source "exploded car" and "3D printer" **videos** were NOT embedded (motion/sound; against the
  low-arousal default). Flagged on slides as optional teacher hooks; stills carry the content.
- L5 — no clean stills of the Pyramids / Taj Mahal / Burj Khalifa in the source (the lesson clicks through
  web photos); used the stadium + modern-towers photos and the matching grid is text-only for those buildings.
- L6 — source had **no clean standalone Tinkercad model screenshot** (the model shots are inside busy
  full-desktop captures, and the rest are clipart figures); reused the L5 exploded house + a Tinkercad scene
  as the example. A clean "finished pupil model" still would improve L6.
- Skipped throughout: the recurring TCC banner (image1), thumbs-up/builder/feedback clipart, and the NCCE logo.

## Verified
`_vfile.ts seed-content/lessons/ks2-y6-3d-modelling-teach-computing-adapted` → file-level checks passed
(every activity has a 📷 field; slides end .md with teacher notes; S/C/C slice; all {{res:}} placeholders
resolve to copied files). DB seed / `_verify.ts` not run per task scope.
