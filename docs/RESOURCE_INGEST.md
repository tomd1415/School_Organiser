# Resource ingestion — Teach Computing + your own work

How to get the Teach Computing curriculum onto this machine and separate **your own
work** from the **pristine downloads**, ready to import into the resource store.

Working area: `~/Downloads/TeachComputing/`
- `KS3/` — pristine KS3 unit zips (one per lesson). Looks complete (116 lesson zips).
- `GCSE/` — pristine KS4 unit zips, organised `unit_1 … unit_16`. **In progress.**
- `old_lesson_plan/` — your hand-organised folder copied off the school PC (1,929 files,
  5.8 GB): extracted Teach Computing units **you have edited**, plus files **you created**.

---

## 1. KS4 / GCSE download checklist

Resources are **login-gated**: every lesson shows **"Log in to download"** and needs your
free NCCE/STEM account, so this can't be automated — but here's the exact list so nothing's
missed. Source: <https://teachcomputing.org/curriculum/key-stage-4>. On each unit page,
download every lesson zip plus the Unit guide / Learning graph / Summative assessment.

### GCSE units (J277-aligned) — 8 of 16 done

| # | Unit | Page | Status |
|---|------|------|--------|
| 1 | Programming part 1 — Sequence | `/curriculum/key-stage-4/programming-part-1-sequence` | ✅ `unit_1` |
| 2 | Computer systems | `/curriculum/key-stage-4/computer-systems` | ✅ `unit_2` |
| 3 | Programming part 2 — Selection | `/curriculum/key-stage-4/programming-part-2-selection` | ✅ `unit_3` |
| 4 | Programming part 3 — Iteration | `/curriculum/key-stage-4/programming-part-3-iteration` | ✅ `unit_4` |
| 5 | Programming part 4 — Subroutines | `/curriculum/key-stage-4/programming-part-4-subroutines` | ✅ `unit_5` |
| 6 | Algorithms part 1 — The essentials | `/curriculum/key-stage-4/algorithms-part-1` | ✅ `unit_6` |
| 7 | Programming part 5 — Strings and lists | `/curriculum/key-stage-4/programming-part-5-strings-and-lists` | ✅ `unit_7` |
| 8 | Data representations | `/curriculum/key-stage-4/data-representations` | ✅ `unit_8` |
| 9 | Algorithms part 2 — Searching and sorting | `/curriculum/key-stage-4/algorithms-part-2` | ⬜ **to do** |
| 10 | Programming part 6 — Dictionaries and data files | `/curriculum/key-stage-4/programming-part-6-dictionaries-and-datafiles` | ⬜ **to do** |
| 11 | Impacts of technology | `/curriculum/key-stage-4/impacts-of-technology` | ⬜ **to do** |
| 12 | Computer networks | `/curriculum/key-stage-4/networks` | ⬜ **to do** |
| 13 | Cyber security | `/curriculum/key-stage-4/cyber-security` | ⬜ **to do** |
| 14 | Databases and SQL | `/curriculum/key-stage-4/databases-and-sql` | ⬜ **to do** |
| 15 | HTML | `/curriculum/key-stage-4/html` | ⬜ **to do** |
| 16 | Object-oriented programming | `/curriculum/key-stage-4/object-oriented-programming` | ⬜ **to do** |

### Non-GCSE KS4 units — optional (not needed for J277)

Online safety · IT and the world of work · Media · Physical computing · Spreadsheets ·
Using IT in project management. Grab only if you teach them.

---

## 2. Reconcile your old folder against the pristine downloads

`npm run reconcile` (in `app/`) compares `old_lesson_plan/` against `KS3/` + `GCSE/` and
sorts every old file into buckets. It changes nothing — it only writes manifests to
`data/reconcile-report/`.

```bash
cd app && npm run reconcile
# or point it at other folders:
cd app && npm run reconcile -- <old-dir> <pristine-dir> [<pristine-dir> ...]
```

| Bucket | Manifest | Meaning |
|--------|----------|---------|
| **EXACT** | `exact-dup.tsv` | Byte-identical to a pristine file (incl. inside the unit zips). Superseded — the new download already has it. |
| **MODIFIED** | `modified.tsv` | Same filename, different bytes — a Teach Computing file **you edited**. Review; keep your version if you want it. |
| **UNIQUE** | `unique.tsv` | Filename appears nowhere in the pristine units. |
| **LIKELY-OWN** | `likely-own.tsv` | UNIQUE **and** not following Teach Computing's naming convention → **your own creation**. This is the list that matters. |

`summary.txt` also prints **per-unit coverage** — what % of each unit the pristine download
already covers.

### ⚠️ The match buckets are unreliable — trust the naming split

The new download is a **different version** of the curriculum from the one you extracted into
`old_lesson_plan/`: units renamed, a unit inserted at the start of KS3 Year 7, and a wholesale
file-rename — old `L1 Lesson plan - Computer Systems - KS4.docx` became new
`A1 Worksheet – Spot the Embedded Systems.docx` (note: named by activity not lesson, en-dashes,
Mac-zipped). Proof: the **Computer Systems unit is fully downloaded yet only ~3% of your old
copy matches it**.

So `EXACT`/`MODIFIED`/`UNIQUE` will **not** become clean even once everything is downloaded —
old TC files just don't match new ones. Don't rely on "UNIQUE will shrink to my own work" (that
was my earlier mistake). Instead trust the **download-independent split** at the top of
`summary.txt`:

- **YOUR OWN** (`own.tsv`) — files not following TC naming (~280). **Stable** — it does not
  change as more downloads land, because it never matches against the pristine set.
- **TC FILES** — everything TC-named. The new download supersedes these regardless of version;
  `EXACT` only tells you how many are *byte-identical* to what you've already re-fetched.

You can extract your own work **now** — it does not wait on the downloads. The downloads matter
for getting the *new* curriculum to teach from, not for this reconcile.

---

## 3. Then import

- **Your own work** — `data/reconcile-report/own.tsv` (~280 files). Drop the big `*Unedited.zip`
  backups (≈2.5 GB) unless you want them. This list is ready now and won't change as downloads
  finish.
- **New curriculum** — point the importer at the fresh `KS3/` and `GCSE/` once complete; it
  extracts the unit zips and dedups by checksum, so re-running as the download grows is safe.

```bash
cd app && npm run import-resources -- ~/Downloads/TeachComputing/GCSE   # new GCSE units
# A --filter mode to import only the files listed in own.tsv is a small follow-up — ask if wanted.
```

---

## 4. Web import (no CLI) — `/resources/import`

The CLI above needs shell access; the web importer does the same from the browser, plus AI-assisted
identification of the unit/year-group/lesson for the ambiguous naming (§2's "named by activity not
lesson" problem, and unit folders that are just opaque numbers).

**Upload.** Either **pick a whole folder** (the browser sends every file with its relative path —
`<input webkitdirectory>`, busboy `preservePath`) **or a single `.zip`**. Nested `.zip`s and the Word
docs that describe each unit are fine in both. Max **500 MB per file**, ~**400 MB / 3,000 files** per
import (stated on the page; larger is capped).

1. **Stage** — `services/resourceImport.ts` walks the upload **entry by entry** (never `extractAllTo`,
   to defeat zip-slip): each path is sanitised (no `..`, no absolute/drive paths,
   `__MACOSX`/dotfiles/`Thumbs.db` dropped). A nested `.zip` is unzipped **transparently** — `Lesson
   1.zip` becomes a `Lesson 1/` folder — and files are staged under `<resource store>/imports/<batchId>/`.
   Capped on file count, bytes, and nesting depth.
2. **Group into units** — a **unit folder** is a directory that directly holds a `.docx` (the unit
   description) and has lesson sub-folders. Each `.docx`'s `word/document.xml` text is the unit's
   description (a `.docx` is itself a zip — no Gotenberg).
3. **Identify (AI, optional)** — one `resource_import` call per unit gets {the Word description + the
   file paths} and returns the **unit name + number**, the **year group**, and a lesson-aware **title**
   per file — the folder number alone can't give the first two, and many units share a number. AI off /
   no description ⇒ filename defaults + the folder name. Cohort-level only, through the one wrapper.
4. **Review** — each unit shows its **year group** and **unit name** (editable), then its files with an
   editable title, an *import?* tick, and a checksum "duplicate" flag. Nothing is imported yet.
5. **Commit** — ticked files import into the store (checksum-dedup, like the CLI). Each file records the
   unit + year group (`resources.unit` / `year_group` — shown and searchable on Resources) and a
   **normalised `change_note` path** `imported from <Year group>/<Unit name>/<Lesson N>/<file>`. That
   path is what **Schemes → Convert a downloaded unit** reads ([getImportedPaths](../app/src/repos/resources.ts)
   → [unitCandidates](../app/src/services/convertUnit.ts)), so imported units are discoverable and stay
   distinct even when they share a number. The staging batch is then deleted.

Reuses the store + dedup the CLI importer already uses; the new parts are the folder/zip in-browser
extraction, the Word-doc reading, the unit/year-group/lesson identification, the review-before-commit
step, and the normalised path that makes imports convertible into schemes.
