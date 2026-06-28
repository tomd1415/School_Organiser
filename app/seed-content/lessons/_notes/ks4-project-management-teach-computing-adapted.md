# Conversion notes — KS4 Using IT in project management (Teach Computing — adapted)

- **Slug:** `ks4-project-management-teach-computing-adapted`
- **Course / scheme:** KS4 IT & Digital Skills · KS4
- **Source:** `TeachComputing/KS4_non_GCSE/unit_6` (Unit guide v1.2 + L1–L10 zips + Summative assessment docx)
- **Lessons:** 10 (every lesson converted). The summative (20 MCQs) is folded into the L10 end-of-unit quiz worksheet.
- **Self-verify:** PASS — 10 lessons. Every worksheet renders; each lesson has a screenshot (image) field; support ≠ challenge slices on every leveled worksheet; every deck ≥ 4 slides with non-empty teacher notes; every `{{res:…}}` resolves to a manifest file; all slide resource titles end `.md`.

## Question-type coverage (variety per brief)
order (lifecycle / waterfall stages / build steps), card-sort (methods, requirement-vs-constraint, SMART, testing-table headings, stage-sort, products-vs-docs), matching (methods, init vocab, SMART letters, planning vocab, formulas, key terms, evaluation terms, iteration/interaction), **label-a-diagram** (PERT chart, L4), single-choice, **multi-select** (init activities, non-methods, visual-product planning, testing-table headings, evaluation questions), fill-blank, **scale** (L9/L10 confidence), screenshot show-your-work on every activity/quiz worksheet.

## §7a alignment (objective → slide → worksheet question)
**L1 What is project management** — define PM → S3 → activity matching/choice; name 4 methods → S4–S7 → match-the-method; match method to description → S4–S7 → matching + support sort; choose a method → S7 → challenge single-choice + show-your-work.
**L2 Initiate** — analyse a brief → S4 → activity intro + core blank; user requirements → S5 → match-word + support sort; constraints/risk → S6 → match-word + challenge mitigate; feasibility report → S7 → show-your-work screenshot.
**L3 SMART goals** — aims→objectives → S3 → "from aims" prose; write a SMART goal → S4 → core text + support sort; SMART letters → S4 → matching; iteration/interaction → S5–S6 → core blank + starter challenge.
**L4 Tools for planning** — Gantt shows → S3–S4 → starter support + sort; PERT shows → S5 → starter core + sort; **label PERT parts → S5 → label block**; choose a tool → S6 → challenge + show-your-work.
**L5 Carry out pt1** — workbook → S3 → support + core blank; formula/function → S4 → starter matching + sort; build → S5 → show-your-work; house style → S5 → checklist.
**L6 Carry out pt2** — follow a plan → S4–S5 → order build steps; hierarchy diagram → S4 → core blank; build selector → S5 → show-your-work; visual media fits audience → S6 → support sort + challenge.
**L7 Evaluate** — recall lifecycle → S2 → order; testing table → S4 → sort + core blank; peer feedback → S5 → support choice; evaluate success → S6 → challenge.
**L8 Start your own** — user requirements → S4 → sort; constraints → S4 → sort; sort activities to stages → starter → card-sort; start planning docs → S4–S5 → show-your-work.
**L9 Execute your own** — finish planning → S3 → order; create products → S4 → order + sort; testing table → S5 → core blank + challenge; use feedback → S6 → show-your-work.
**L10 Evaluate + assessment** — evaluate a project → S3 → final-evaluation screenshot; iteration/interaction → S2 → starter matching; answer quiz → S4 → 20-Q quiz worksheet.

No orphan objectives; every multiple-choice cell is single-correct; multi-correct items use the multi-select `[ ]` type.

## Images embedded (all OGL — Teach Computing © Raspberry Pi Foundation, OGL v3.0)
- `l1-waterfall.png` (waterfall illustration), `l1-project-manager.png` (PM with project board), `l1-team.png` (team planning) — L1.
- `l2-delicious-desserts-logo.png` — L2 scenario.
- `l4-gantt-graphic.png` (stylised Gantt bars), `l4-gantt-photo.png` (real printed Gantt chart), `l4-pert-chart.png` (clean labelled PERT — used for the **label** task) — L4.

## Image-gap log (for docs/WORKSHEET_QUESTION_TYPES.md §4 — to be merged; shared doc left untouched as other agents run in parallel)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L2 Initiate | life-cycle slide | a clean 4-stage life-cycle wheel (initiate→plan→execute→evaluate) | ⚠️ source draws it as a PPT vector shape — not rasterisable; sketched on board |
| L3 SMART goals | SMART slide | a SMART acronym graphic | ⚠️ source = PPT shapes/clipart only |
| L4 Tools | Gantt slide | a CLEAN labelled Gantt chart (time axis + task bars) to unlock a second `label` task | ⚠️ source has only a stylised bar graphic + a tilted photo; PERT was the clean one |
| L5 Carry out pt1 | workbook slides | a real integrated-workbook screenshot (front page + sheets) | ⚠️ source = tiny clipart / template thumbnails |
| L6 Carry out pt2 | hierarchy / selector slides | a clean hierarchy diagram + a finished selector still | ⚠️ source = PPT shapes |
| L7 Evaluate | testing-table slide | a clean filled testing-table still | ⚠️ source = PPT table shapes |
| L8/L9 Own project | TOO brief / sales sheet | a TOO brand still + a sales-sheet screenshot | ⚠️ source = clipart only |

## Type-gap log
None. All demand was met by existing types (order, sort, matching, label, multi-select, fill-blank, scale, choice, screenshot). The recurring theme matches prior batches: TCC project-management diagrams (life-cycle wheel, Gantt, SMART, hierarchy) are **PPT vector shapes**, so `extractOfficeImages` (raster-only) cannot pull them — these need re-drawing to embed. The PERT chart was the one clean raster and drives the label-a-diagram task.
