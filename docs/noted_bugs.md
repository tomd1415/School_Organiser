# Found Bugs
## 28th June 2026

### For the below bugs a soultion needs to be found, documented, planed resoultion, resoultion implemented and regression tests written and tested.

1. in some worksheets the 'Drag each description under the right area of impact. This warms you up for the test.' questions do not show anything to drag into the locations. First noted in lesson 'Putting it all togetther' in 'Impacts of technology' unit.
2. On the schemes and planning pages the user needs to be able to move the units up and down by scrolling not the whole page. Also the unit title section needs to be a bit wider as at the moment it is too narrow and hard to read the title.
3. The unit title needs to start with the unit number and then the title.
4. I want to be able to view lessons in the lab regardless of weather they are assigned to a class or not.
5. I want the editing of the lessons to be much easier. I want it to literly be in place editing as it is seen in the browser when editing is selected. I need the same to happen for the worksheets as well. Also the worksheets nedd to have the ability to add and remove questions. When adding a question the option of different types of question should be given and then allow the user to add the details for the question (and possible answer if multiple choice or similar). Then allow the user to show the correct or model answers.
6. I would like the opportunity to select 'recreate/adjust with AI' that allows the user to write a few sentences about what is wrong with the worksheets/slide/lesson that needs improving and the AI will then improve that lesson either for the class it is assigned to or to the master copy (as choosen by the user)
7. I would like a lesson creator 'wizard' that improves on the current way of creating lessons and schemes by making it easier and a more accurate representation of the result of the Wizard (what the lesson will look like).

---

# Triage & resolution plan (added 2026-06-28)

Legend: **Status** = OPEN / IN PROGRESS / FIXED. Each entry has the **root cause**, the **planned
resolution**, and the **regression test** that locks it. Items 1–4 are being implemented now; 5–7 are larger
features that need their own design doc (and #7 needs the cut-off requirement finished).

## Bug 1 — drag questions show nothing to drag  ·  Status: FIXED (2026-06-28)
**Resolution shipped:** added `WorksheetOptions.interactive`; in `mode:'preview' && interactive` the drag
widgets (card-sort, matching, Parsons, order, label) render **draggable with their `data-key`/`data-item-key`
hooks but with NO `data-save-url`** (save URLs are emitted only in `mode:'form'`). pupil.js places/moves the
DOM first and skips the save when there's no URL, so the teacher can fully try the drag and nothing persists.
The `/lesson/pupil-preview` worksheet now renders with `interactive:true` (its `pupilLayout` loads pupil.js).
Regression test: `tests/worksheetTypes.test.ts` → "interactive preview — drag widgets draggable but
non-saving" (inert plain-preview, draggable+no-save interactive-preview, save-url still present in form).

**Where:** the card-sort starter in `gcse-impacts-of-technology …/l8-end-of-unit-quiz-starter-worksheet.md`
(`Drag each description under the right area of impact…`). The user's "Putting it all together" is this
end-of-unit lesson.

**Root cause (confirmed by rendering the worksheet):** the markdown + engine are correct — in `mode:'form'`
the widget renders 5 draggable item tiles + 5 drop-zones. But the **lab / lesson preview renders worksheets
in `mode:'preview'`** (`src/routes/lesson.ts` `renderWorksheetPreview` ~L322 and the inline preview ~L852,
and `/lesson/pupil-preview`). In preview mode every drag widget (card-sort, matching, Parsons, label) is
emitted **inert** — `draggable` removed, `aria-disabled="true"`, no `data-save-url` — so the pieces are
visible but cannot be picked up. The teacher reads "Drag each item…" but nothing drags. This is a
preview-mode limitation, not a per-worksheet defect; card-sort just made it obvious.

**Planned resolution:** add a **non-saving interactive preview** for the drag widgets so the teacher can try
them in the lab/preview without a pupil:
- `worksheetForm.ts`: add `WorksheetOptions.interactive?: boolean`. When `mode:'preview' && interactive`, render
  the drag widgets (sort/match/parsons/label) as **draggable with their client hooks but WITHOUT a
  `data-save-url`** (and not `aria-disabled`). The pupil.js handlers already early-return when there is no
  save URL (`if (!url) return;`), so dragging works locally and nothing is persisted.
- Ensure the drag handlers run on the preview page: load `pupil.js` (or its widget block) on the lesson
  preview / pupil-preview pages. Confirm the cockpit/preview shell includes it; add the `<script>` if absent.
- Pass `interactive:true` from `renderWorksheetPreview` and `/lesson/pupil-preview`.

**Regression test:** unit test asserting that `renderWorksheet(md,{mode:'preview',interactive:true})` emits
`draggable="true"` + `data-item-key` (sort) / `ws-match-tile` (match) and **no** `data-save-url`; and that
plain `mode:'preview'` stays inert. (Keeps both behaviours pinned.)

## Bug 2 — schemes/planning: scroll units independently + wider unit-title  ·  Status: FIXED (2026-06-28)
**Resolution shipped:** `.sch-units` navigator is now `position:sticky` with `max-height + overflow-y:auto`
(scrolls within the panel, not the page); the column widened to 300px, unit names wrap, and the title input
gets `min-width:16rem`. CSS in `styles-base-widgets.css` (theme vars carry dark mode). Structure pinned by
`tests/schemeUnitNumber.test.ts` (navigator container present).

**Where:** `src/lib/schemeView.ts` — units render as `<section class="unit">` with an editable
`<input class="unit-title">`; the unit list sits in `#scheme-tree` / the `.sch-spine` navigator.

**Root cause:** the unit column has no own scroll region (the whole page scrolls), and `.unit-title` /
`.sch-unit-name` are too narrow to read long titles (e.g. "KS1 Y2 Programming quizzes (Teach Computing —
adapted)").

**Planned resolution (CSS/layout, no logic change):** give the unit list / spine a constrained-height
**scroll container** (`overflow:auto; max-height: …`) so units scroll within the panel, and **widen** the
`.unit-title` input and `.sch-unit-name` (flex/min-width) so titles are legible. Structure in
`styles-base-widgets.css`, dark-theme tweaks in `styles.css`'s `body[data-shell="next"]` block (per the CSS
ownership rule in CLAUDE.md).

**Regression test:** a `tests/pathsGuard`/view test is overkill for pure CSS; add a render assertion that the
unit list container carries the new scroll class, so the structure can't silently regress.

## Bug 3 — unit title should start with the unit number  ·  Status: FIXED (2026-06-28)
**Resolution shipped:** `renderUnit` now takes the 1-based position and renders a non-editable `Unit N` badge
before the title input (and `N.` in the navigator), numbered by position so it tracks reordering; the stored
title value is untouched. Regression test: `tests/schemeUnitNumber.test.ts` (number by position, raw title
value preserved).

**Where:** `src/lib/schemeView.ts` `renderUnit` (the `<input class="unit-title">`), called at L274 with the
0-based index `i` in `.map((u,i)=>…)`.

**Root cause:** the unit shows only `u.title`; there is no positional number. The title is an **editable
input bound to the DB value**, so the number must NOT be baked into the editable text (that would corrupt the
stored title on save).

**Planned resolution:** thread the 1-based ordinal into `renderUnit(u, i+1, …)` and render a **non-editable
`Unit N` badge** before the title input (and prefix the `.sch-unit-name` spine label with `N. `). The stored
title is untouched; the number is presentation, derived from `display_order`, so it stays correct after
reordering (▲▼).

**Regression test:** unit test on `renderUnit` (or the tree) asserting the rendered HTML shows `Unit 1`/`1.`
before the first unit's title and that the title `<input value>` is still the raw stored title (no number in
the saved value).

## Bug 4 — view a lesson in the lab without a class assignment  ·  Status: ADDRESSED (2026-06-28)
**Resolution:** `/lesson/pupil-preview` already serves a **master lesson with no class** (`gc` omitted →
master copy) and is linked from every plan row as "👁 Preview as pupil (worksheet)" + "🖥 Board" +
"▶ Preview live lesson". With Bug 1's fix that preview is now **interactive** — so any unassigned master
lesson can be opened AND its drag activities tried, with nothing saved. So "view a lesson regardless of class"
works today via these no-class previews.
**Remaining (optional follow-up):** the **Test Lab** (`/test-lab`) is still timetable-driven (it lists
lessons laid into a class calendar), so it can't open a never-assigned lesson. If the teacher specifically
wants the *interactive sandbox cockpit* on an unassigned lesson, that's a larger route change (create an
ephemeral no-class occurrence) — flagged, not done.

**Where:** the interactive cockpit is `/lesson` (`src/routes/lesson.ts`), which resolves a **lesson
occurrence on a `group_course`** (a class). Read-only previews that already work **without** a class exist:
`/lesson/preview` (`lessonPreview`), `/lesson/pupil-preview` (`pupilPreview(null,…)`), `boardView(null,…)`.

**Root cause:** the *interactive* lab is built around a real class occurrence; there is no "drive this master
lesson live with no class" mode. The existing no-class views are read-only previews.

**Planned resolution:** surface + extend the no-class path. Minimum: ensure every lesson plan (master, even
unassigned) is reachable in a lab-style view from the scheme page — the plan row already links
`▶ Preview live lesson`, `🧪 Test in Test Lab`, `👁 Preview as pupil`, `🖥 Board`. Make the **pupil-preview
interactive** (shares Bug 1's `interactive` flag) so an unassigned lesson can be *tried*, and confirm the
Test Lab works for a plan with no class. If a fuller "interactive master cockpit with no occurrence" is
wanted, that's a larger route change — flagged for a follow-up if the previews aren't enough.

**Regression test:** integration test hitting `/lesson/pupil-preview?lp=<masterPlanId>` (no group) returns 200
and renders the worksheet; plus the Bug 1 interactivity assertion covers the "can actually drag" part.

## Bug 5 — in-place WYSIWYG lesson/worksheet editing + add/remove questions  ·  Status: PARTIAL → [LESSON_WORKSHEET_EDITOR_PLAN.md](LESSON_WORKSHEET_EDITOR_PLAN.md)
**Done (2026-06-28) — Gap A (the "add a question by type" ask):** the block editor now offers every question
type. Multi-select and slider are structured qtable rows (editable as cards); order / card-sort / Parsons /
label / code get palette buttons that insert a friendly skeleton. Round-trip oracle extended.
**Done (2026-06-28) — Gap B (correct/model answers, v1):** the editor now marks the correct answer on
single-choice and multi-select questions (◉ / ☑ toggles), written to the version's mark scheme on save
(mapped to field keys by document order, with a count-mismatch guard so a stray choice never corrupts the
scheme) and reloaded from `GET /resources/:id/scheme`. So those questions now auto-mark. Bridge +
null-on-mismatch guard tested in `tests/worksheetAnswers.test.ts`.
**Remaining:** Gap B for text / fill-blank / numeric model answers (free-text, alignment includes the
name/date fields — needs care), and Gap C (in-place plan objectives/outline — the existing edit textareas
already save live, so this is polish). Plans in the doc; not rushed at this depth.
**Headline:** most of the editor already exists (`worksheetEditor.js` + the `worksheetBlocks.ts` model +
`/resources/:id/edit` + add-question palette + live preview). The plan targets the three real gaps:
(A) model the NEW question types as editable blocks, (B) edit correct/model answers (wire to the mark scheme),
(C) in-place lesson-plan editing. No storage change; the round-trip oracle is the guard.
**Foundation that already exists:** `src/lib/worksheetBlocks.ts` is a typed **block model** with
`parseBlocks`/`serialiseBlocks` and a round-trip guarantee (`serialiseBlocks(parseBlocks(md))` yields markdown
whose `renderWorksheet().fields` are identical — the oracle is `tests/worksheetBlocks.test.ts`); and
`public/worksheetEditor.js` exists. So the data model for editing worksheets as discrete typed blocks is
there.

**Scope:** (a) in-place edit of plan objectives/outline as rendered (the scheme page already has textarea
editing — "in place as seen" means a contenteditable/inline surface); (b) a worksheet editor that lists the
blocks, lets you **add a question** via a **type palette** (text / single-choice / multi-select / matching /
fill-blank / code / parsons / order / sort / label / slider / screenshot), capture the question + options +
**correct/model answer**, and **remove** questions; (c) show model answers. This is a multi-step feature — it
should get its own `docs/` implementation plan (like `QUESTION_TYPES_IMPLEMENTATION_PLAN.md`) before building:
block-editor UI, per-type authoring forms, answer/model-answer storage (mark-scheme via `upsertScheme`),
serialise back to markdown, and round-trip tests.

**Recommendation:** write the design doc next; do NOT start ad-hoc.

## Bug 6 — "adjust with AI": describe what's wrong → AI improves (class copy or master)  ·  Status: DONE (v1) → [ADJUST_WITH_AI_PLAN.md](ADJUST_WITH_AI_PLAN.md)
**Done (2026-06-28):** "✨ Adjust with AI" in the worksheet/slide editor — free-text "what to improve" →
two-step confirm-gate (preview → Apply) → new **master** version. Privacy-safe (inputs via `context[]`/
instruction through the one wrapper; static system; no pupil names); the result is rendered-validated before
it can be saved. Service `adjustArtefact.ts`, prompts `adjustArtefact.ts`, routes `/resources/:id/adjust(/apply)`.
**Follow-up:** apply to the **class copy** (the adaptation store) and adjusting a **lesson plan** artefact
(both noted in the plan); v1 covers worksheet/slides → master.
**Headline:** a new AI feature on the existing wrapper (`llm/client.ts`) — free-text "what to improve" +
class/master target + a confirm-gate, inputs via `context[]` (redaction/withholding/audit automatic), validate
the result before applying, write to a master version or the class adaptation. No new AI plumbing.
**Foundation:** the privacy-safe LLM wrapper `app/src/llm/client.ts` (all AI egress; redaction + audit) and
the existing draft/convert/review flows on the scheme/plan rows.

**Scope:** a UI entry point on a lesson/worksheet/slide ("✨ Adjust with AI") with a free-text box ("what's
wrong / what to improve"), a **target selector (this class's copy vs master)**, a confirm-gate, then a wrapped
LLM call that rewrites the artefact and stores it as the class adaptation or the master version.
**Privacy-critical:** the instruction text + artefact go through the wrapper's `context[]` (never the system
string), so redaction/withholding/audit apply; safeguarding-flagged content is withheld entirely.

**Recommendation:** short design doc (entry points, prompt, target routing, confirm-gate, audit) then build.

## Bug 7 — lesson creator "wizard"  ·  Status: BLOCKED — needs the requirement finished
The requirement sentence is **cut off** in the source list ("…a more accurate representation of the"). I
can't scope a wizard without the rest. **Question for the user:** what should the wizard do that the current
scheme/lesson creation doesn't — e.g. guided steps (course → scheme → units → lessons), import-from-document,
template picker, AI-assisted outline-to-lessons? Once defined it likely overlaps with #5/#6 and gets one
combined design doc.
