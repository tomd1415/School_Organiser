# Resource completeness sweep — planned (queued)

> **Status: PLANNED / not started.** Run **when the system is ready** — i.e. after the remaining conversion
> work (KS2 Years 3–6, ~25 units) and any in-flight editor/AI work is done, so the corpus is final.
>
> **Teacher decision (2026-06-28):** do **Step 1 (audit)** and **Step 2 (deterministic fixes)**. **Step 3
> (selective AI content rewrite) is DEFERRED** — revisit only after seeing the audit; do not run a blanket
> "Adjust with AI" over every lesson. (Rationale + full pros/cons were discussed; the headline reasons to
> defer 3: real API spend over ~700 artefacts, regression risk on already-good lessons, and AI text can't
> produce the *diagrams* that most image-gaps actually need.)

The goal: find and fill the **objective** gaps across all converted lessons ("some details are missing")
without rewriting good content. The per-unit `_notes/<slug>.md` files and `WORKSHEET_QUESTION_TYPES.md §4`
already log many gaps — they're the head-start worklist.

---

## Step 1 — Audit (read-only, no changes, ~free)

A pass over every converted unit/lesson that emits a **per-lesson report** ranked by severity. Changes
nothing. Checks (reuse the verify scripts already used after each conversion batch):

- **Plan:** has objectives (3–4 "I can…") + a routine outline.
- **Artefacts:** ≥1 worksheet (`kind='worksheet'`) and a slide deck (`kind='slides'` whose title ends `.md`);
  every document the plan references is present.
- **Worksheet renders:** `renderWorksheet().fields` has ≥1 answerable field **and** a `📷` screenshot field;
  Support/Core/Challenge slices differ.
- **Slides resolve:** `getLessonSlidesMarkdown` non-null, `> 🧑‍🏫` teacher notes present, ≥4 slides.
- **Media:** no unresolved `{{res:…}}`; every `/resources/<id>/view` link points to a linked resource (0 broken).
- **Marking:** a worksheet has a mark scheme (`getScheme`) — i.e. auto-marking is set up (most don't yet).
- **Logged gaps:** fold in the image-gaps + wanted-type notes from `_notes/` and §4.

**Output:** a CSV/markdown table (lesson · severity · what's missing) so the gaps become a precise, prioritised
list — and so Step 2 is scoped, not guessed. This alone is the highest-value, lowest-risk action.

## Step 2 — Deterministic fixes (mostly free; one optional AI part)

Targeted, validatable, reversible. Run only on what the audit flags.

1. **docx-image recovery (AI-free).** Several conversion agents noted the missing rasters live inside the
   **worksheet / information `.docx`**, not the deck `.pptx`, so `extractOfficeImages` (run over the pptx) never
   surfaced them. Re-run `extractOfficeImages` over each unit's `.docx` files, match recovered rasters to the
   lessons that logged an image gap (use the `_notes` pointers), embed where there's a clear fit, then
   re-export + re-seed the affected bundles. Biggest recovery of the logged image gaps. *(Note: a blank binary
   place-value grid and a few clean diagrams may still need re-drawing — those stay in the gap log.)*
2. **Structural repairs (AI-free).** Fix any `.md`-title issues, re-link any broken media, ensure each plan's
   referenced docs exist; re-seed + re-export so the committed bundles stay the source of truth.
3. **Mark-scheme derivation (uses AI — the one cost in Step 2, optional/targeted).** Run `deriveScheme` over
   worksheets that have no scheme so they auto-mark. Pair it with the now-free **choice/multi-select model
   answers** (editor Gap B) to minimise AI use. This is per-worksheet and cheap relative to a full rewrite.

## Prerequisites / when "ready"

- KS2 conversion complete (corpus final), so the sweep isn't chasing a moving target.
- A binary-asset plan if many images are re-embedded at once — turn on **git-LFS** for
  `seed-content/lessons/**/*.{png,jpg,jpeg,mp4,webm}` first (rule documented in
  `app/seed-content/lessons/README.md`; LFS not installed on the dev box yet).
- Run **Step 1 first** and read it before doing any of Step 2.

## Explicitly deferred

**Step 3 — selective AI content rewrite.** Not now. If, after the audit, a handful of lessons are genuinely
*thin* (not just missing an image), use the existing **"Adjust with AI"** feature on *those specific lessons*
with its confirm-gate — never a blanket auto-apply over the whole corpus — and re-export the bundles after.
