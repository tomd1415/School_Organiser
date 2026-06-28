# Resource completeness sweep — plan (v2)

> **Status: PLANNED / not started.** The TCC conversion corpus is now **final** (KS1 → KS2 → KS3 → KS4 →
> GCSE all converted, 2026-06-28), so the prerequisite is met and this is the next milestone.
>
> **Scope expanded (2026-06-28):** the teacher added [`NOTES_ON_SCANNING_LESSONS.md`](NOTES_ON_SCANNING_LESSONS.md)
> — six concrete things to check/add. Those notes are now the spine of this plan (mapped in §2). They push the
> sweep beyond "deterministic structural fixes" into **per-lesson completeness review** (missing concept
> visuals, missing code, activity-start cues), so the execution model in §6 is per-lesson, not a single script.
>
> **Standing teacher decisions (unchanged):** do the **audit** + the **fixes**; **DEFER the blanket "Adjust
> with AI" rewrite** (real API spend over ~700 artefacts, regression risk on good lessons, and AI text can't
> draw the *diagrams* most gaps need). The agent hand-authors any new prose/cues (no teacher-key spend), exactly
> as in the conversion batches.

---

## 1. The outcome — what "done" means (read this first)

After the sweep, **every converted lesson** in `app/seed-content/lessons/` satisfies all of:

1. **Concept coverage.** Every core concept named in the plan/objectives that the *source* illustrates has a
   supporting visual present in the native lesson — not just the few that happened to extract as rasters first
   time. (The motivating example: the Networks lesson had star + bus topologies but was missing ring + mesh,
   which exist in the source. Those get added.) Where the source genuinely has no usable visual, it stays a
   **logged** gap (`_notes` + §4) — nothing is invented.
2. **Tasks are real and submittable.** Every pupil task the plan expects is **stated on a worksheet**, and has a
   place to **do it or upload the work** (upload preferred — the `image` field already accepts a file). No
   "ghost" task that the slides mention but the worksheet never asks for, and no task with nowhere to record it.
3. **Provided documents are viewable.** Every document the lesson shows or hands out (fact files, info sheets,
   reference tables, exemplars, solution sheets where appropriate) is present in the system and **openable by
   the teacher and — where the pupils need it — by the pupils**, from the lesson.
4. **Slides cue the activities.** Each deck has explicit **"now start … on the worksheet"** slides at every
   you-do, so the slide on screen tells the teacher to set the pupils going on the right worksheet section.
5. **Programming lessons carry their code.** Every piece of code a programming lesson uses or that a worksheet
   depends on is present — as a code block, a `parsons` block, a screenshot, and/or a downloadable starter —
   and matches what the worksheet asks.
6. **Anything else useful is captured** (note 6's open brief): model answers/mark schemes where cheap, key
   vocabulary, links the plan relies on, and a clear show-your-work artefact per lesson.

Plus the corpus-level invariants stay green: all bundles re-seed cleanly, worksheets/slides resolve, no broken
media, `_notes` and the §4 image-gap log are updated to reflect reality (the log should *shrink* to only the
genuinely-irreproducible items).

**Definition of Done is the per-lesson checklist in §7** — a lesson is "swept" only when every box is ticked
or its gap is explicitly logged as unfixable-from-source.

---

## 2. The six teacher notes → concrete checks and fixes

| # | Teacher note | Audit check (Phase 1) | Fix (Phase 2) | Tier |
|---|---|---|---|---|
| 1 | Missing concept extracts (e.g. ring/mesh topologies) | For each core concept in the plan, is there a supporting visual? Cross-reference the **full source** (all slide images **and** rasterised slides — see §3) for visuals of concepts the native lesson lacks. | Extract/rasterise the missing source visual; embed it on the right slide + worksheet; caption it. | A (find) + B (place/caption) |
| 2 | Tasks not on the worksheet / nowhere to upload | Does every pupil task in the plan/outline appear as a worksheet question? Does each activity have an **upload/`image`** field? Is the task *stated* (not implied)? | Add the missing task statement + an upload field (`renderPasteOrUpload`-backed `image` cell, "📤 Upload your work here"); prefer upload over paste-screenshot wording. | A (field) + B (task wording) |
| 3 | Provided documents not viewable in-system | Is every document the lesson shows/hands out present as a resource, linked to the plan, and openable by teacher **and pupil** where needed? | Bring the document in (native markdown re-author **preferred**; else embed the source file as a `document` resource with Gotenberg PDF preview); link to the plan; confirm pupil visibility (small UI check/build — see §3.D). | A (link/import) + possible small build |
| 4 | Slides don't cue when/what pupils start | Does the deck have explicit "now do X on the worksheet" slides at each you-do transition? | Insert activity-start cue slides ("## ▶ Your turn — start the [activity] worksheet" + a `> 🧑‍🏫` instruction). Templatable wording. | B (author cues) |
| 5 | Programming lessons missing code | For programming lessons: is all code referenced in the plan/worksheet present (block/parsons/image/starter)? Does it match the worksheet? | Recover the code from source (MakeCode/Scratch screenshot via §3 rasterise; or transcribe faithfully into a code/`parsons` block; attach a starter file as a `document` if the lesson hands one out). | A (recover) + B (transcribe) |
| 6 | "Assess what else might be missing" | An open reviewer pass per lesson: missing model answers/mark scheme, missing key vocabulary on the recap line, dead/needed links, no clear show-your-work artefact, mismatch between plan↔slides↔worksheet. | Apply the matching deterministic/author fix; deriveScheme for marking (Tier C, optional). | A/B/C |

**Tiers:** **A = deterministic / mechanical** (AI-free: extract, rasterise, link, add a field). **B =
agent hand-authored** (the agent writes cue text, a task statement, a caption, or transcribes code — *no
teacher-key spend*, same model as the conversion). **C = teacher-key AI, optional/targeted** (deriveScheme;
the blanket rewrite stays deferred).

---

## 3. Phase 0 — capabilities to build first (one-time enablers)

These are the tools the sweep depends on. Build + smoke-test them **before** touching lessons.

**A. Deploy the Gotenberg sidecar (the key unlock for notes #1, #3, #5).**
`officePreview.convertToPdf` and `docText` already speak to a Gotenberg (headless-LibreOffice) sidecar, but
`GOTENBERG_URL` is empty and no container runs. Add Gotenberg to `docker-compose.yml`, set `GOTENBERG_URL`,
and confirm `convertToPdf` returns a PDF. This gives two things the raster-only `extractOfficeImages` can't:
- **`.pptx`/`.docx` → PDF → per-page PNG** = a raster of *any* slide, including the **vector-shape diagrams**
  (topologies, flowcharts, logic gates, binary grids) that have been the standing image-gap. One slide → one
  PNG; crop later if a slide is busy.
- **In-browser document preview** for note #3 (a provided `.docx`/`.pdf` becomes viewable, not just a download).

**B. Source-page rasteriser tool** (`scripts/` throwaway → promote if useful). Input: a source `.pptx`/`.docx`
+ a page/slide number (or "all"). Output: PNG(s). Implementation: Gotenberg `convertToPdf` → render the PDF
page to PNG (pdfjs + canvas, already a dependency via `docText`; or `pdf-to-img`). This is what captures
ring/mesh/etc. Pair it with the existing **docx-image recovery** (run `extractOfficeImages` over each unit's
**worksheet/info `.docx`** — several rasters live there, not in the deck `.pptx`).

**C. Per-lesson "alignment dump"** (extends the `_dump.ts` used in conversion). For one lesson, emit a single
review bundle: the full source **plan text**, the **slide text per slide**, the **list of every source visual**
(extracted rasters + rasterised slides as thumbnails), and the **current converted bundle** (manifest + md).
This is what a reviewer (human or agent) reads to judge concept coverage / missing code / missing tasks — both
sides side by side.

**D. Confirm/extend pupil document visibility (note #3).** Verify the pupil lesson view (`me.ts` / `pupilWork`
/ `homework.ts`) actually lists and opens documents linked to the plan (not just worksheets/slides). If pupils
can't currently open a linked `document`, that's a small, well-scoped UI addition — surface it as its own task,
don't assume it.

**E. git-LFS for binaries.** The sweep will add many images. Turn on git-LFS for
`seed-content/lessons/**/*.{png,jpg,jpeg,mp4,webm,pdf}` first (rule already documented in
`app/seed-content/lessons/README.md`; LFS not yet installed on the dev box).

**F. The fix→verify→reseed loop.** Bundles are now authored **file-first**: a fix = edit the bundle files
(add image, edit md, add a `document` resource to the manifest), then `npm run seed:lessons -- <slug>` +
re-verify. Re-create the conversion verifiers (`_vfile.ts` file-level, `_verify.ts` DB-level) and **add a new
"concept-coverage" check** (every objective keyword appears on a slide and a worksheet question; flag
objectives with no visual).

---

## 4. Phase 1 — Audit (read-only, per lesson, produces the worklist)

A per-lesson pass that **changes nothing** and emits a structured report. It runs the existing structural
checks **plus** the note-driven ones:

- **Structural (from v1):** plan has 3–4 "I can…" + outline; ≥1 worksheet + a `.md`-titled deck; worksheet has
  ≥1 answerable field **and** an upload/`image` field; S/C/C slices differ; slides have `> 🧑‍🏫` notes + ≥4
  slides; no unresolved `{{res:}}`; 0 broken `/resources/<id>/view`; mark scheme present? (most: no).
- **Concept coverage (note 1):** for each objective/core concept, is there a supporting visual? List concepts
  with **no** visual, and whether the source has one (raster / rasterisable slide / genuinely none).
- **Task completeness (note 2):** every plan task is on a worksheet; every activity has an upload field; tasks
  are stated, not implied.
- **Documents (note 3):** every referenced/handed-out document is present, linked, teacher-viewable, and
  pupil-viewable where needed.
- **Activity cues (note 4):** deck has explicit "start the activity" slides at each you-do.
- **Code (note 5):** programming lessons have all referenced code present and worksheet-matching.
- **Open (note 6):** missing answers/vocab/links; plan↔slides↔worksheet mismatch.

**Output:** one machine-readable report per lesson (e.g. `_audit/<slug>.json`) + a roll-up
`docs/SWEEP_AUDIT.md` table (lesson · severity · each note's status · the specific fix). Severity ranks the
worklist so Phase 2 is **scoped, not guessed**. The audit is the highest-value, lowest-risk step — read it
before any fix.

---

## 5. Phase 2 — Fixes (apply, validated, reversible)

Run **only** on what the audit flags, per lesson, in tier order. After each lesson: re-seed, re-run all three
verifiers (file, DB, concept-coverage), and update its `_notes`.

- **Tier A — deterministic:** docx-image recovery; rasterise + embed missing concept slides (note 1); add
  upload fields (note 2); link/import + expose provided documents (note 3); embed code that already exists as a
  source raster (note 5); structural repairs + relinking; shrink the §4 gap log.
- **Tier B — agent hand-authored (no teacher-key spend):** write the missing task statement (note 2); author
  activity-start cue slides (note 4); transcribe missing code faithfully into code/`parsons` blocks (note 5);
  caption added images; re-author a provided handout as a native markdown worksheet where that's better than
  embedding the doc (note 3). Same "I (the agent) author" rule as the conversion — verified, not invented.
- **Tier C — teacher-key AI, optional/targeted:** `deriveScheme` over worksheets with no scheme so they
  auto-mark (pair with the now-free choice/multi-select model answers to minimise spend). **Blanket "Adjust
  with AI" stays deferred** — only a genuinely *thin* lesson, individually, with the confirm-gate.

---

## 6. Execution model & sequencing

The corpus is ~**41 + KS1/KS2 units ≈ 49 units / ~330 lessons**. Notes 1/4/5/6 need per-lesson judgement, so
this is a per-lesson review, parallelised — the same shape as the conversion (one agent per unit, file-first,
self-verify, orchestrator re-seeds + verifies serially).

1. **Pilot one unit first (mandatory).** Take the **Networks unit** the teacher named (the ring/mesh example) as
   the pilot. Run Phase 0 tools on it end-to-end: rasterise the missing topology slides, add them, add upload
   fields, add activity-cue slides, recover any code, re-seed, verify, and **show the teacher the before/after**.
   This proves the Gotenberg-rasterise + concept-coverage workflow and calibrates quality before scaling.
2. **Approve the pilot, then roll out** unit-by-unit in parallel agents (audit → fix → verify per unit), with
   the orchestrator doing the authoritative seed + DB-verify serially (avoids concurrent-seed races, as in the
   conversion). Group by key stage so the cohort framing stays consistent.
3. **Commit per unit** (curriculum content, no pupil data) so progress is reviewable and reversible.

**Scale/cost note:** this is a large run (Gotenberg rasterising ~hundreds of slides; an agent reviewing each
lesson). It is **agent-authored, not teacher-key AI** for tiers A/B, so the only teacher-key cost is the
optional Tier C marking. If run as a multi-agent fan-out, it is opt-in (the user asks for the parallel/workflow
scale) — otherwise it proceeds serially.

---

## 7. Definition of Done — per-lesson checklist

A lesson is "swept" when, for that lesson:

- [ ] Every core concept in the objectives has a supporting visual **or** a logged "no source visual" gap.
- [ ] Every pupil task in the plan is stated on a worksheet and has a place to do/upload it (upload preferred).
- [ ] Every referenced/handed-out document is present, linked, and viewable by teacher (+ pupil where needed).
- [ ] The deck has an explicit activity-start cue slide at each you-do.
- [ ] (Programming) all referenced code is present and matches the worksheet.
- [ ] Show-your-work artefact present; key vocabulary on the recap line; needed links live.
- [ ] Re-seeds cleanly; file + DB + concept-coverage verifiers green; `_notes` + §4 updated.

**Corpus-level done:** all units swept and committed; `docs/SWEEP_AUDIT.md` shows zero open *fixable* gaps;
the §4 image-gap log contains only genuinely-irreproducible items; LFS carries the binaries.

---

## 8. Risks & guardrails

- **Don't overwrite good content.** Fixes are additive (add a visual, a field, a cue, code). Re-authoring is
  only for note-3 handouts and note-5 code, done faithfully from source and verified. Tier C blanket rewrite
  stays deferred.
- **Rasterised slides carry TCC styling/text** — fine as a teaching visual, but crop where a slide is busy;
  never embed a slide that names/【describes a pupil (none should, but check).
- **No pupil data, no name egress** — the sweep touches curriculum content only; nothing goes to an AI service
  except the optional Tier C marking, which already routes through the redacting wrapper.
- **Reversible:** file-first edits + per-unit commits; re-seed is idempotent (replace-by-title).
- **Honesty of the gap log:** a concept with no source visual is *logged*, never faked.

## 9. Explicitly deferred

**Step 3 — blanket AI content rewrite.** Not now. Only an individually-thin lesson, via the existing "Adjust
with AI" with its confirm-gate, re-exported after — never a corpus-wide auto-apply.
