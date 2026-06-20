# External resource sources — Teach Computing & CAS (investigation, 2026-06-20)

Can the system reuse the free computing resources from **teachcomputing.org** (NCCE Teach Computing
Curriculum) and **computingatschool.org.uk** (Computing At School)? Short answer: **Teach Computing is
already integrated and is the right primary source; CAS is best as a manual, link-and-curate source,
not an automated pipeline.**

## Verdict at a glance

| Source | Licence | Access | Fit with this system | Use it as |
|---|---|---|---|---|
| **Teach Computing Curriculum** (teachcomputing.org) | **Open Government Licence v3.0** — copy, adapt, even commercially, **with attribution**. Very permissive. | Free NCCE/STEM account; **downloads are login-gated** (manual, no API). 84 units / 535 lessons, KS1–4. PPTX slides, Word activity/worksheets, PDFs, per-lesson zips. | **Already built** — see below. | **Primary** — download → import → AI-convert into your lessons. |
| **Computing At School** (computingatschool.org.uk) | **Member-uploaded, mixed/unclear licensing** — no single open licence across resources. | Free CAS account; login-gated; **no API / bulk export**. | Poor fit for automated import (licence risk + no API). | **Reference/curate** — link out; import individual resources you've licence-checked. |

## 1. Teach Computing Curriculum — already integrated

The system was built to ingest exactly this. The relevant machinery already exists:

- **[docs/RESOURCE_INGEST.md](RESOURCE_INGEST.md)** — the documented workflow: download the unit zips
  (login-gated, manual), organise them, separate pristine downloads from your edits. The teacher
  already holds the KS3 set (116 lesson zips) and most KS4/GCSE units locally.
- **Bulk import** — `/resources/import` (`resourceImport` service: `extractArchive` / `extractFolder` /
  `commitImport`) imports a zip or a whole folder (nested zips + the Word unit descriptions) into the
  versioned resource store. A scheduled `jobs/importResources` exists too.
- **AI unit conversion** — `/schemes/course/:id/convert` (prompt `convert_unit@3`, service
  `convertUnit`) detects convertible units in a folder, reads the **extracted text** of the source
  PPTX/DOCX (via `docText` + the Gotenberg office→PDF sidecar), and rewrites each source lesson into
  one of *your* adapted master lessons — same sequence/coverage, re-pitched to your class context.
- **Pedagogy** — generated/adapted lessons are now grounded in the NCCE 12 principles
  ([PEDAGOGY.md](PEDAGOGY.md)), and worksheets can now use the **new question types** (code-reading,
  code-writing, Parson's Problems) that suit the TCC programming units.

So "can TCC be integrated?" — it is. The OGL v3.0 licence explicitly permits adapting and republishing
with attribution, which is what the convert pipeline does.

### Worth adding (small, high-value)

1. **Attribution, automatically.** OGL requires an attribution statement. Stamp imported/converted TCC
   resources with a standard credit ("Contains material from the NCCE Teach Computing Curriculum,
   © Crown copyright / Raspberry Pi Foundation, Open Government Licence v3.0") — a `source_attribution`
   field on the resource + a line on the resource/lesson view. Low effort, keeps reuse clean.
2. **TCC scheme templates (seed).** Pre-load the TCC **unit/lesson titles + spec-point mapping** (just
   structure, no copyrighted content) as ready-to-pick scheme skeletons per course, so a teacher can
   start from the TCC sequence and let the convert step fill the detail. Medium effort.
3. **Finish the KS4 import** — units 9–16 in [RESOURCE_INGEST.md](RESOURCE_INGEST.md) are still "to do".

## 2. Computing At School (CAS) — reference, not pipeline

CAS is the community (forums, CPD, events, regional hubs) with member-shared resources. Three blockers
to automated integration:

- **Licensing is not uniform.** Resources are uploaded by members with no single open licence, so they
  **cannot be bulk-imported or redistributed safely** — each needs an individual licence check. (This
  is the key difference from TCC's blanket OGL.)
- **No API / bulk export**, and downloads are **login-gated** behind a free CAS account.
- Content is heterogeneous (one-off activities, slide decks, discussion threads) rather than the
  structured unit packages the convert pipeline expects.

### Recommended use

- **Link, don't ingest.** Treat CAS as a discovery/reference source. Cheapest useful step: allow a
  lesson/unit to hold an external **reference link** (URL + note) — "CAS: Code-breaking transition
  activity" — surfaced on the lesson screen. No copying, no licence risk.
- **Manual, per-resource import** for anything the teacher *has* licence-cleared: the existing single-
  file upload (`/resources`) already handles it; just record the source + licence in the new
  `source_attribution` field.
- Do **not** build an automated CAS importer — the licensing and access model don't support it.

## Recommendation

1. **Primary source = Teach Computing.** It's integrated; the remaining work is finishing the KS4
   import and the two small enhancements above (auto-attribution, optional scheme templates).
2. **CAS = reference layer.** Add a lightweight external-link field to lessons/units; import individual
   CAS resources only after a manual licence check.
3. Track these in [NEXT_STEPS.md](NEXT_STEPS.md).

Sources: [teachcomputing.org/curriculum](https://teachcomputing.org/curriculum) ·
Teach Computing Curriculum licence = Open Government Licence v3.0 (Raspberry Pi Foundation for the NCCE) ·
[computingatschool.org.uk](https://www.computingatschool.org.uk).
