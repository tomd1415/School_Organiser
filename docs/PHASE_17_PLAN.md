# Phase 17 — A reference-lesson library: import, link to objectives, drive activity variety, host & edit pupil files

> **Status (2026-06-27): planned.** The teacher has ~**4.8 GB** of Teach Computing lesson files (≈3.3 GB now
> + ≈1.5 GB to add) to bring in as **reference lessons** — searchable, **linked to the objectives / "I can…"
> criteria** they address (the [Stages & strands](PHASE_16_PLAN.md) model), and used to (a) **seed a bigger
> variety of activities**, (b) **host & display files pupils need**, and — ideally — (c) let **pupils edit
> worksheet/doc files online and save**. Plus: **simplify the copy-paste** feature and **add file uploads**
> wherever it appears. This builds **on top of the existing resource store** ([RESOURCE_INGEST.md](RESOURCE_INGEST.md),
> `resources`/`resource_versions`, [resourceStore.ts](../app/src/lib/resourceStore.ts),
> [resourceImport.ts](../app/src/services/resourceImport.ts)) — it extends it, not a rebuild.

**Confirmed scope (teacher answers, 2026-06-27):**
- **Editable online = worksheets/docs only** (reuse the existing Markdown/worksheet editor); slides/PDFs/images
  stay **view + download**.
- **Linking = auto from the Teach Computing structure** (filename/folder → unit → its `prog_criteria`),
  **no AI** — using the curriculum maps already parsed into [TeachComputing_docs/](TeachComputing_docs/);
  a manual fallback covers the hand-edited / created files that don't match cleanly.
- **Paste/upload = one reusable "paste-or-upload" component**, used everywhere it appears (email intake,
  worksheet screenshots, marking, and the new reference-file import).

**Standing constraints** (unchanged): single-teacher; **no pupil name to any AI service**; server-rendered
HTML + vendored HTMX; `routes → services (pure) → repos`; tests never call the real AI. Files live on the
filesystem under `RESOURCE_STORE_PATH` (relative paths in the DB, SHA-256 + versioned — the existing model),
so **4.8 GB is on disk, only metadata + links in Postgres**. A backup-size note belongs in the RUNBOOK
(the resource store is already in the backup set — confirm capacity).

---

## Why a phase of its own

This is four related but distinct bodies of work that all hang off one new idea — a **reference-lesson
library** — and all touch files at scale:

1. **Bulk import + DB the reference lessons**, linked to objectives / "I can…" criteria.
2. **Activity variety** — mine the reference lessons for a wider palette of activity types the generator
   and the teacher can draw on.
3. **Pupil file hosting + (worksheets/docs) online editing** — serve files pupils need; let them edit and
   save the editable kinds.
4. **Unify & simplify copy-paste + file upload** into one component.

It sits **after [Phase 16](PHASE_16_PLAN.md)** because the linking and activity-variety pieces lean on the
Stages & strands criteria; (4) is independent and can land any time (a good first slice).

---

## 17.1 — Bulk import the reference lessons *(M–L)*

Extend the existing importer rather than write a new one. Today `resources` already carries `unit`,
`year_group`, `source='imported'`, `source_attribution`, `kind`, versioning and `external_url`
([migrations 0006/0047/0055](../app/migrations/)); the bulk importer reads a unit's Word description to
stamp the unit/year on every file.

- **A "reference lesson" is a resource (or a small set) tagged `is_reference = true`** and grouped by
  **TCC unit + lesson**. Add the structured columns/links (see [§17.5 DB](#175--database)) so a reference
  lesson resolves to a `prog_unit` and (via §17.2) the `prog_criteria` it addresses — not just free-text.
- **Easy import paths** (pick by what the files look like):
  - **Folder / zip drop** — point the importer at a `KS3/` or `GCSE/unit_n/` folder (or drop the zips via
    the new upload component, §17.4); it walks the tree, creates a resource per file, infers
    `kind`/`mime_type`, and groups by unit/lesson from the folder + filename. Idempotent on
    (checksum) so re-running skips dupes and the **+1.5 GB later** just re-runs the same import.
  - **Manifest option** — for the hand-organised `old_lesson_plan/` (≈5.8 GB, edited + self-made files),
    a CSV/JSON manifest (path → unit, lesson, title, kind) drives a precise import where folder inference
    is unreliable.
- **Dedupe & integrity** reuse the store's SHA-256 (`checksum`) — identical files import once;
  re-import is safe. Big-file streaming (don't load a 200 MB pptx fully in memory if avoidable).
- **Attribution** auto-set `source_attribution` to the Teach Computing / OGL preset for the pristine
  downloads (the one-click preset already exists on the import screen).

## 17.2 — Link reference lessons to objectives & "I can…" criteria *(M)*

The point of the library: find "a reference lesson that teaches *this* criterion." Linking is **structure-
first** (deterministic, no AI), with an **AI overview pass that checks the links are right** before they're
trusted — advisory, never auto-applied.

- **Mapping table** `resource_criteria` (resource ↔ `prog_criteria`), and `resource_prog_unit`
  (resource ↔ `prog_unit`) — see §17.5.
- **Auto-link from structure.** The curriculum maps (already parsed) give, per **unit → lesson →
  objective → "I can…" criteria**, the exact statements. The TCC files are organised by the *same* unit /
  lesson, so match **(year/KS, unit title, lesson number)** from the file's folder+name to the
  `prog_units`/`prog_lessons` row, then attach **all that lesson's `prog_criteria`** to the resource. This
  is deterministic where the structure is clean.
- **AI overview / verification of the auto-link *(new)*.** Structure-matching is blind to *content* — a
  file in the right folder may be the unit guide, an answer sheet, a stray image, or an edited lesson whose
  focus has drifted from the original objectives. So after the structural pre-link, run an **AI overview
  pass** that **reads the lesson's extracted text** (the importer already extracts text for Markdown/Office
  docs) and, for each tentatively-linked criterion, judges **does this lesson actually address it?** — plus
  **does it look like it addresses any criteria the structure missed?** It returns, per resource, a
  **confidence** (`confirmed` / `partial` / `mismatch`) with a one-line reason and any **suggested
  add/remove** criteria.
  - **Advisory only.** The AI verdict is stored on the link, **never auto-applied**: high-confidence
    matches can be auto-confirmed, but anything `partial`/`mismatch` (and all the manual-fallback files) is
    **surfaced in a review queue** for the teacher to confirm/correct — same confirm-before-commit
    discipline as the marking auto-suggest and the baseline guard.
  - **Privacy & cost.** Reference-lesson content is **cohort curriculum material with no pupil data**, so it
    is safe to send — but it still goes **through the one wrapper** (`llm/client.ts`) in `context[]` (never
    the `system` string), with the redacted request audited, exactly like every other AI call. Send a
    **bounded excerpt** (title + objectives + a capped slice of the body), batch by lesson, and **skip
    binary-only files** (a raw image/zip with no extractable text — those stay structure-linked + manual).
    A cohort-content guard asserts no pupil token could appear. Runs **once at import** (and on demand for a
    re-check), not per page-view — cost is a one-off over the library.
  - **Degrade.** With AI off, the overview is simply skipped: every link keeps its structural verdict and is
    flagged `unverified` for the teacher to spot-check. The library still works; it's just unverified.
- **Manual fallback + override.** For files that don't match the structure (the hand-edited
  `old_lesson_plan/`, oddly named files), a tagging UI on the resource: search criteria by stage/strand and
  tick the ones it addresses. The auto-link (and the AI overview's suggestions) are just a pre-fill the
  teacher can correct.
- **Surfacing.** On a lesson/unit in the Schemes spine (and in the planner), show **"Reference lessons for
  these objectives"** — the resources linked to the same `prog_criteria` — so designing a lesson can start
  from real exemplars. Show the **verification state** (confirmed / needs-review / unverified) so you trust
  the links at a glance.

## 17.3 — Activity variety from the reference library *(M)*

Use the library to widen the **range of activity types**, not just reuse whole lessons.

- **Activity catalogue.** Extract/curate an **activity-type taxonomy** (e.g. *unplugged*, *Parsons problem*,
  *code trace*, *predict-run-investigate*, *worksheet*, *quiz*, *card sort*, *debugging challenge*,
  *project*…). Seed it from the reference lessons (their structure/headings hint the type) plus the
  worksheet block types Phase 12 already supports.
- **Feed the generator.** When generating a lesson/worksheet for given criteria, pass the **activity types
  seen in reference lessons that teach those criteria** as options, and **rotate** them so a class doesn't
  get the same shape every time (a "vary the activities" nudge). Generation stays cohort/criteria-level —
  **no pupil name to AI**; reference *content* used as a style/example exemplar is cohort material.
- **Teacher pick.** On the lesson card, a "swap activity" affordance that offers alternative activity types
  for the same objective, drawn from the catalogue + linked references.

## 17.4 — Host & display files for pupils; edit worksheets/docs online *(M–L)*

- **Host & display (all kinds).** Serve any reference/attached file to pupils who need it, behind the pupil
  gate, with **in-browser display** where possible (the store already previews Markdown/PDF/images and
  presents slides — `/resources/:id/view`). A pupil lesson can **attach the files they need** (reusing the
  existing resource-attach to a plan), shown on the pupil `/me` surface.
- **Pupil online editing — worksheets/docs only** (confirmed scope). Reuse the **existing worksheet/Markdown
  editor** and the pupil work-save path (Phase 8/12: pupils already fill in worksheets sliced to their
  level and it autosaves). Extend it so a pupil can open an **editable doc/worksheet** file, edit, and
  **save their own copy** (a per-pupil version, not the master — same "local copy" discipline as the
  class adaptation). **Slides/PDFs/images stay view + download** (no online editor for those in this phase).
- **Storage.** A pupil edit is a **per-pupil resource version / work record** keyed to (pupil, resource,
  lesson) — PII, covered by the Phase-10 erasure path. Autosave robustness + the 200 k-char cap reuse the
  Phase 13 pupil-preview autosave work.

## 17.5 — Database

Extends the existing `resources`/`resource_versions` store and the Phase 16 `prog_*` tables. No rebuild.

```sql
-- Mark a resource as a reference lesson + where it sits in the Teach Computing structure (beyond the
-- existing free-text resources.unit / resources.year_group, which stay for display/search).
ALTER TABLE resources
  ADD COLUMN is_reference   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN tcc_unit_key   TEXT,        -- normalised unit key from the import (e.g. 'KS3:Y7:programming-essentials-1')
  ADD COLUMN tcc_lesson_no  INTEGER,     -- lesson number within the unit, where known
  ADD COLUMN activity_type  TEXT;        -- catalogued activity type (17.3), nullable
CREATE INDEX idx_resources_reference ON resources (is_reference) WHERE is_reference;
CREATE INDEX idx_resources_tcc_unit ON resources (tcc_unit_key);

-- A reference lesson ↔ the progression UNIT it belongs to (structured, vs the free-text resources.unit).
CREATE TABLE resource_prog_unit (
  resource_id  BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  prog_unit_id BIGINT NOT NULL REFERENCES prog_units(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, prog_unit_id)
);
CREATE INDEX idx_rpu_unit ON resource_prog_unit (prog_unit_id);

-- A resource ↔ the "I can…" CRITERIA it addresses. `origin` records how the link was made; `verify_*`
-- records the AI overview pass's advisory verdict (17.2). THE table that answers "a reference lesson that
-- teaches criterion X". A link is trusted once confirmed (auto-confirm only on high AI confidence, else
-- teacher review).
CREATE TABLE resource_criteria (
  resource_id    BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  criterion_id   BIGINT NOT NULL REFERENCES prog_criteria(id) ON DELETE CASCADE,
  origin         TEXT NOT NULL DEFAULT 'structure'
                   CHECK (origin IN ('structure','ai_suggested','manual')),   -- how the link was created
  verify_state   TEXT NOT NULL DEFAULT 'unverified'
                   CHECK (verify_state IN ('unverified','confirmed','needs_review','mismatch')),
  verify_note    TEXT,                                 -- the AI overview's one-line reason (advisory)
  confirmed_by   TEXT,                                 -- teacher who confirmed/corrected (NULL = not yet)
  PRIMARY KEY (resource_id, criterion_id)
);
CREATE INDEX idx_rc_criterion ON resource_criteria (criterion_id);
CREATE INDEX idx_rc_review ON resource_criteria (verify_state) WHERE verify_state IN ('needs_review','mismatch');

-- The activity-type catalogue (17.3). Small reference table.
CREATE TABLE activity_types (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,                 -- 'parsons','code_trace','unplugged','card_sort',…
  name          TEXT NOT NULL,
  description   TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- A pupil's saved edit of an editable (worksheet/doc) file = PII. The master resource is untouched;
-- this is the pupil's own copy, like a class adaptation but per-pupil. Reuses resource_versions for the
-- body where practical, or stores the edited text inline. Cleared on pupil erasure.
CREATE TABLE pupil_resource_edits (
  id            BIGSERIAL PRIMARY KEY,
  pupil_id      BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,                    -- PII
  resource_id   BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  lesson_plan_id BIGINT,                              -- the lesson context (soft ref), nullable
  body          TEXT,                                 -- the pupil's edited content (or a version pointer)
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, resource_id, lesson_plan_id)
);
CREATE INDEX idx_pre_pupil ON pupil_resource_edits (pupil_id);
```

**Worked queries:**

```sql
-- (a) Reference lessons that teach a given criterion (the core library lookup). Trust confirmed links
-- first; exclude ones the AI overview flagged as a mismatch.
SELECT r.id, r.title, r.kind, r.activity_type, rc.verify_state
FROM resource_criteria rc JOIN resources r ON r.id = rc.resource_id
WHERE rc.criterion_id = $1 AND r.is_reference AND r.active
  AND rc.verify_state <> 'mismatch'
ORDER BY (rc.verify_state = 'confirmed') DESC, r.title;

-- (b) For a unit's lesson, all reference material + the activity types available for its objectives.
SELECT DISTINCT r.id, r.title, r.kind, r.activity_type
FROM prog_lessons l
JOIN prog_criteria c     ON c.lesson_id = l.id
JOIN resource_criteria rc ON rc.criterion_id = c.id
JOIN resources r          ON r.id = rc.resource_id AND r.is_reference AND r.active
WHERE l.unit_id = $1 AND rc.verify_state <> 'mismatch'
ORDER BY r.activity_type NULLS LAST, r.title;

-- (c) Activity-type variety check — which activity types has THIS class already had recently
-- (so the generator can rotate to under-used ones). Joins delivery → plan resources → activity_type.
-- (sketch; exact join uses the existing occurrence_courses ↔ resources link.)

-- (d) AI-overview REVIEW QUEUE — links the teacher needs to confirm/correct after import (mismatches and
-- partials the AI couldn't auto-confirm, plus structural links left unverified when AI was off).
SELECT r.id AS resource_id, r.title, c.descriptor AS criterion,
       rc.origin, rc.verify_state, rc.verify_note
FROM resource_criteria rc
JOIN resources r     ON r.id = rc.resource_id
JOIN prog_criteria c ON c.id = rc.criterion_id
WHERE rc.confirmed_by IS NULL
  AND rc.verify_state IN ('needs_review','mismatch','unverified')
ORDER BY (rc.verify_state = 'mismatch') DESC, r.title;
```

## 17.6 — Simplify copy-paste + add file upload (one component) *(M)*

The current "✉ Paste an email" box ([tasksView.ts](../app/src/lib/tasksView.ts)) and the pasted-screenshot
inputs (worksheets, marking) are inconsistent and fiddly. Build **one reusable surface**:

- **`pasteOrUpload` component** — a single drop zone that accepts **paste** (text or image from clipboard)
  **and drag-drop / file-pick upload**, with a clear, consistent affordance. Vendored-HTMX friendly; no new
  npm deps (matches the project's no-extra-deps stance).
- **Use it everywhere it appears** (confirmed scope): **email intake** (simplify the paste box), **worksheet
  screenshot paste** (pupil + preview), **marking** (annotate/evidence images), and the **reference-lesson
  import** (drop zips/folders/files — feeds §17.1).
- **Behaviour:** paste an image → stored as a resource/screenshot exactly as today, but via the shared path;
  paste text → the text box; drop files → upload + (for the importer) ingest. One code path, one set of
  size/type guards, one set of tests. Pupil-pasted images remain PII (erasure path unchanged).

---

## Sequencing & risk

**17.6 first** if you want a quick, visible win — it's independent and improves daily use immediately. Then
the library spine: **17.1 (import)** → **17.2 (link to criteria)** → **17.3 (activity variety)** in order
(each needs the previous). **17.4 (pupil hosting/editing)** is the biggest and can come last; its "host &
display" half is low-risk and could ship before the "online editing" half. Everything reuses the existing
resource store, the Phase 12 worksheet editor, and the Phase 16 `prog_*` tables — the new code is the
structured links, the activity catalogue, and the unified component.

**Risks / notes:**
- **Disk & backups.** 4.8 GB+ on the resource store — confirm the host/Proxmox volume and the backup target
  have headroom; note it in [RUNBOOK.md](RUNBOOK.md). Files are on disk, not in Postgres.
- **Auto-link accuracy** depends on the TCC folder/zip structure being clean; the hand-edited
  `old_lesson_plan/` will need the manifest path or manual tagging. The **AI overview pass (17.2)** is the
  safety net — it reads each lesson's content and flags links that don't match for review — but it's
  **advisory**: don't silently mislink, leave low-confidence/unmatched links in the review queue and
  surface them for tagging.
- **17.2 introduces an AI path.** It's the only AI in this phase. Content is cohort curriculum material (no
  pupil data), so it's safe to send — but it must go **through the one wrapper** (`llm/client.ts`) in
  `context[]`, audited, with the cohort-content guard; tests must not call the real provider. It runs
  **once at import** (bounded excerpts, batched, binary-only files skipped), so cost is a one-off, and the
  whole phase **degrades cleanly with AI off** (links stay `unverified` for manual spot-check).
- **Licensing.** Teach Computing content is OGL — fine to host **internally** for the school; the
  `source_attribution` preset records it. Don't expose it publicly.

## Out of scope (this phase)
Online editing of **slides/PDFs/images** (worksheets/docs only here); a public-facing resource portal;
AI-based auto-linking (we chose structure-based); importing non-Computing subjects. Multi-provider LLM and
the parked multi-teacher v2 remain parked.
