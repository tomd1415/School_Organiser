# Lesson conversion guide — Teach Computing → native School_Organiser lessons

> **Purpose.** A repeatable playbook for **hand-converting** a Teach Computing (TCC) lesson into a native
> lesson in this system — a lesson **plan + the documents it refers to (worksheets) + a slide deck** — adapted
> to the teacher's SEND/low-load teaching context, with real Support/Core/Challenge differentiation and a
> place for pupils to show their work. Written after the Y7 micro:bit pilot (scheme 1, plans 1209/1210).
> Follow this exactly so every converted lesson is consistent and renders correctly in the cockpit.
>
> **Two halves, kept separate (the teacher wants both):**
> 1. **Reference import** — the original TCC files imported *as-is*, linked to criteria (Phase 17,
>    `importReferenceFiles`). Untouched source, for searching/hosting.
> 2. **Native conversion** — *this guide*: re-author each lesson into the system's format.
>
> **No teacher AI spend:** I (the agent) author the content directly. This is *not* the in-app `convert_unit`
> AI feature (that runs on the teacher's key) — though it materialises onto the same schemes.

---

## 0. The source tree

`/home/duguid/School_Organiser/TeachComputing/TeachComputing/` → `KS{1-4}|GCSE|KS4_non_GCSE / year_N / unit_N /`.
Each unit folder holds a **`Unit guide …docx`** and one **`Lesson N …_v1.zip`** per lesson. Each lesson zip
contains the official **`L… Lesson plan ….docx`**, **`L… Slides ….pptx`**, and one or more
**`… worksheet.docx`** (starter / activity / solution). The lesson plan docx is the richest source.

`git`-ignored — read from disk, **never commit or copy** anything from `TeachComputing/`.

## 1. Read the source (no `unzip` on the box — use the app's `adm-zip` + `docxText`)

Run from `app/` so `node_modules` resolves. List + extract text of the lesson plan and worksheets:

```ts
import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';
const zip = new AdmZip('<abs path to Lesson N ….zip>');
for (const e of zip.getEntries()) console.log(e.entryName);              // list
const plan = zip.getEntries().find(x => x.entryName.includes('Lesson plan'))!;
console.log(docxText(plan.getData()));                                    // the plan's text
```

Pull from the plan: **learning objectives**, **key vocabulary**, **pedagogy** (PRIMM, pair programming),
**prep / "you will need"**, the **activity steps with timings**, and **assessment opportunities**. Read the
worksheet docx text too (starter + activity) so the native worksheets match the real tasks.

## 2. Author the native lesson PLAN

Shape = `{ title, objectives, outline }` (the only fields `materialiseUnit` stores). Rewrite — do **not** copy:

- **objectives**: 3–4 short **"I can…"** statements, one per line (these are the success criteria).
- **outline**: numbered steps with **rough minutes**, in the teacher's routine:
  *Routine recap → starter → I-do → we-do → you-do → plenary/self-assess.* On **every activity** spell out
  **Support / Core / Challenge on the SAME task** (low floor / high ceiling — "nobody's screen looks less
  done"), the **likely error + fix-words**, and **TA cues** ("prompt, do not do it for them"). Put key
  **vocabulary** in the recap line. Reference the documents by name (e.g. "the starter worksheet", "the
  activity worksheet") so the teacher knows which to open.

**Teaching context to apply** (the school default — see `app/src/config/teachingContext.ts`): UK special-ed
secondary; autistic/ADHD as the norm; low-arousal, low-cognitive-load; predictable identical routine; plain
literal language; **no flashing/animation/sound**; explicit chunked **I-do/we-do/you-do** with worked
examples; strong visuals; **minimal writing** (prefer drag/click/choose/tick/screenshot); regulation/movement
breaks as routine not reward; genuine S/C/C on the same task; usable by a non-specialist TA; **never name or
describe an individual pupil**.

## 3. Generate the DOCUMENTS the plan refers to (worksheets)

> **Use only the question types the engine supports** — the reference + the markdown for each is in
> [WORKSHEET_QUESTION_TYPES.md §1](WORKSHEET_QUESTION_TYPES.md). If a lesson really wants a type that isn't
> built (multi-select, match, order-non-code, label-a-diagram, card sort, …), **do not fake it badly**:
> reframe to a supported type *or* leave a text box, **and log it** under
> [WORKSHEET_QUESTION_TYPES.md §2](WORKSHEET_QUESTION_TYPES.md) (with the worksheet name) so it's fixed when
> the type lands. **Never use a single-radio `choice` for a multi-correct question** — it can't be answered
> (a `(  ) a (  ) b (  ) c` cell lets the pupil pick exactly one). For "tick all that apply", use the
> **multi-select** type (`[  ] a [  ] b`, now built). Prefer building a missing type over reducing variety.

Generate **every** worksheet the plan mentions (typically **starter** + **activity**; add others if named).
A worksheet is Markdown stored as a `kind='worksheet'` resource. Format (the renderer = `worksheetForm.ts`):

- **Name/date autofill row** at the top:
  ```
  | Name | Type your name here |
  |---|---|
  | Date | Type the date here |
  ```
- **Shared** sections (everyone sees them): a `## What we are learning`, the starter, a `## Predict` row, etc.
- **Differentiation = level sections**, auto-sliced per pupil and **never labelled to the pupil**:
  `## 🟢 Support`, `## 🟡 Core`, `## 🔴 Challenge`. A pupil at a level sees the **shared** blocks **+ their
  level's** blocks only. (A later `## ` heading that isn't a level heading — e.g. `## ✅ I can…` — resets to
  shared, so put shared content *after* the level sections.)
- **Question cells** (in a `| Question | Your answer |` table):
  - **Text answer** → cell text `Type your answer here`.
  - **Tick / multiple-choice** (best for Support, minimal writing) → cell with **≥2** `(  )` markers, options
    between them: `(  ) loop (  ) input (  ) button`.
  - **Fill-in-the-blank** → `______` in the question.
- **Show-your-work area (REQUIRED)** — a place to upload the program + a screenshot, shared:
  ```
  ## Show your work
  | Question | Your answer |
  |---|---|
  | Paste your MakeCode share link here | Type your answer here |
  | Show your finished program | 📷 Paste a screenshot of your work here |
  ```
  The **screenshot cell must match** `worksheetForm.SCREENSHOT` — use `📷` or "paste … screenshot/work …" or
  "screenshot … here". A cell that merely *mentions* a screenshot stays a text box, so use the marker.
- **Success checklist** (shared, last): `## ✅ I can…` then `- [ ] …` mirroring the objectives.
- *(Optional)* a teacher mark scheme for the objective (tick/short) questions via `upsertScheme` so they
  auto-mark — see `app/src/seed/testData.ts attachWorksheet` for the pattern.

## 4. Generate the SLIDE DECK  ⚠️ the `.md` gotcha

A deck is a `kind='slides'` resource. **The cockpit only recognises a deck whose RESOURCE TITLE ends in
`.md` (or `.markdown`)** (`getLessonSlidesMarkdown` → `isMdDeck`). If the title doesn't end `.md`, the slides
are **silently invisible** — this was the pilot's main bug. Format (`slideDeck.ts`):

- `# Deck title` on the first line (the deck name).
- **One `## ` heading per slide** (do **not** use `---` separators — they're unnecessary and add a junk
  slide). Keep slides sparse: a heading + a few bullets, following I-do → we-do → you-do.
- **Teacher notes** = a `> 🧑‍🏫 …` blockquote on the slide. These are **auto-stripped from the board/pupil
  view and shown only in the presenter view** (`splitTeacherNotes`) — so put all teacher talk there. Include
  the likely error/fix-words and the S/C/C cues.
- *(Level-specific slides, optional)*: divide with depth-1 `# Support` / `# Core` / `# Challenge` (NOT `## `,
  which is a slide). Usually leave the deck shared.

## 4a. Images & videos from the source — INCLUDE them

The teacher wants the source **videos included** and the **images carried over** where the lesson refers to
them (and is worried about a lack of images). Both become resources linked to the plan; images embed in
slides/worksheets, the renderer accepts the `/resources/:id/view` URL.

**Extract** (from `app/`, using the app's helpers — there's no `unzip` on the box):

```ts
import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages'; // ppt/media, word/media, …
const lessonZip = new AdmZip('<abs path Lesson N ….zip>');
const pptx = new AdmZip(lessonZip.getEntries().find(e => /Slides.*\.pptx$/i.test(e.entryName))!.getData());
const imgs = extractOfficeImages(pptx.getEntries().find(e => /\.pptx$/i.test(e.entryName))?.getData() ?? pptx.toBuffer(), 'slides.pptx');
// NOTE: extractOfficeImages gates on the .pptx/.docx EXTENSION — pass a filename that ends in it, or it
// returns []. If it still finds 0, read the inner zip's `ppt/media/*` entries directly.
const videos = lessonZip.getEntries().filter(e => /\.(mp4|webm|mov)$/i.test(e.entryName));
```

**Identify the right image** — extract the candidates to files and **view them** (the Read tool renders
images) to find the one the lesson refers to (e.g. the micro:bit board for an "inputs" slide). Don't embed
all 28 deck images — pick the ones the plan/slide actually points at.

**Materialise + embed:**
- Image → `createResourceWithVersion({ kind:'image', mimeType, source:'imported', sourceAttribution: OGL }, …)`
  then `linkResourceToPlan`. Embed in the slide/worksheet markdown: `![alt](/resources/<id>/view)`.
- Video → a resource (`kind:'document'`, `mimeType:'video/mp4'`, source `imported`, OGL attribution) +
  `linkResourceToPlan`. Reference it on a slide: `[▶ Play the … video](/resources/<id>/view)` with a `> 🧑‍🏫`
  note that it's a teacher-played hook. (Videos have motion/sound — flag it as the teacher's choice, given
  the low-arousal default; the teacher decides.)

**If no suitable image is found** but a slide/worksheet would benefit from one, **record it** in
[WORKSHEET_QUESTION_TYPES.md §4 (image-gap log)](WORKSHEET_QUESTION_TYPES.md) with lesson + where + what's
wanted — so it can be sourced/made later.

## 5. Materialise + link (idempotent-ish; run from `app/`)

```ts
import { materialiseUnit } from './src/repos/schemes';
import { createResourceWithVersion, linkResourceToPlan } from './src/repos/resources';
import { checksum } from './src/lib/resourceStore';

// 5a. the unit + its lessons onto the class's scheme (see §6 for scheme id)
const unitId = await materialiseUnit(SCHEME_ID, 'Y7 micro:bit transition (Teach Computing — adapted)', [
  { title, objectives, outline }, // …one per lesson, in order
]);
// → query lesson_plans WHERE unit_id = unitId to get the plan ids.

// 5b. each document → a resource linked to its plan. TITLE: slides MUST end '.md'.
const buf = Buffer.from(markdown, 'utf8');
const resId = await createResourceWithVersion(
  { title: 'micro:bit countdown — slides.md', kind: 'slides', mimeType: 'text/markdown', source: 'ai_generated' },
  { filename: 'slides.md', buf, checksum: checksum(buf), author: 'ai', changeNote: 'adapted from Teach Computing' },
);
await linkResourceToPlan(resId, planId);
```

**Env / store:** `DATABASE_URL='postgres://organiser:organiser@localhost:5434/organiser'` and
`RESOURCE_STORE_PATH='/home/duguid/School_Organiser/data/resources'` (the host bind-mount the container reads
as `/data/resources`). If the store isn't host-writable, run the script **inside the container**
(`docker exec school_organiser-app-1 npx tsx src/<script>.ts`, with the script under `src/` so it's mounted).
Throwaway scripts: prefix `_` and **delete after running** (don't commit them).

## 5a. Persist — export the bundle + commit (so it's in git AND transferable)

A converted unit is DB rows + resource files; to version-control it and move it to other instances, export
it to a committed **bundle** and commit (curriculum content, no pupil data — safe to commit):

```bash
cd app && DATABASE_URL=… RESOURCE_STORE_PATH=… npm run export-lesson-unit -- <unitId>   # → seed-content/lessons/<slug>/
git add app/seed-content/lessons/<slug>
```

Transfer / restore on any instance (idempotent — replaces a same-title unit on the target scheme):
`cd app && … npm run seed:lessons`. The export rewrites embedded `/resources/<id>/view` → `{{res:<file>}}`
placeholders and the seed re-resolves them, so images/videos survive the move. Round-trip is lossless. See
[../app/seed-content/lessons/README.md](../app/seed-content/lessons/README.md) (incl. the git-LFS-at-scale
note for the binary assets).

## 6. Map TCC unit → course / scheme

A converted unit materialises onto **one** course's active scheme. Current dev mapping (KS3):

| TCC | Course | Active scheme id |
|---|---|---|
| KS3 (programming/CS) | `1` Computing Curriculum | `1` |
| KS3 (digital skills) | `2` Computer Skills | `2` |
| GCSE (KS4) | `3` OCR J277 GCSE Computer Science | `3` |

Pick by the unit's topic/key-stage. (A cleaner long-term mapping can come from
`docs/TeachComputing_docs/` curriculum maps.)

## 7. Verify (always)

Run a check that the cockpit resolves everything (slides need the `.md` title; worksheets need `kind`):

```ts
import { getLessonWorksheets, getLessonSlidesMarkdown } from './src/services/worksheet';
import { renderWorksheet } from './src/lib/worksheetForm';
import { sliceSlidesForLevel, splitTeacherNotes } from './src/lib/slideDeck';
// for a real group_course gc of the course, and each plan id:
const ws = await getLessonWorksheets(gc, planId);           // expect every doc the plan refers to
const fields = renderWorksheet(ws.find(w=>/activity/.test(w.title))!.markdown, { mode:'preview', level:'core' }).fields;
// assert: fields has a kind==='image' (screenshot) AND a makecode-link text field
const md = await getLessonSlidesMarkdown(gc, planId);        // MUST be non-null
// assert: sliceSlidesForLevel(md,'core').length matches the slide count AND splitTeacherNotes(md).notes is non-empty
```
Also spot-check level slicing: a `support` render shows the Support questions and **not** Core/Challenge
(and never the labels). Then open the lesson in the app (Schemes → the unit → the lesson; and the cockpit /
lab) and eyeball the worksheet (S/C/C, screenshot box) and the slides + presenter notes.

### 7a. Alignment check — worksheet ↔ slides ↔ plan  (REQUIRED)

The three artefacts must tell **one** story. Build a quick mapping table per lesson and fix any gap:

| Plan objective ("I can…") | Taught on slide(s) | Asked on worksheet (which Q / level) |
|---|---|---|

- **Every objective** is on a slide **and** has at least one worksheet question (or the show-your-work
  artefact for a "make/create" objective). No orphan objective.
- **Every worksheet question** maps to something on a slide / in the plan — no question about a topic the
  lesson never teaches. The starter question matches the starter slide; the predict question matches the
  predict slide; the vocabulary matches the plan's key vocabulary.
- **Levels are coherent:** Support = recognition (tick/choose), Core = recall/explain, Challenge = reason/
  apply — on the **same** objective.
- **Type sanity:** each multiple-choice question has exactly **one** correct option (else it's the §3
  multi-correct trap → reframe + log to WORKSHEET_QUESTION_TYPES.md §2.1).

Record the table in the conversion notes / PR so the alignment is reviewable.

## 8. Checklist per lesson

- [ ] Read the lesson plan docx + worksheet docx text from the zip.
- [ ] Plan authored: 3–4 "I can…" objectives + a routine outline with S/C/C, vocab, likely error, TA cues.
- [ ] **Every** referenced worksheet generated (starter + activity + others), with level sections.
- [ ] Only supported question types used (WORKSHEET_QUESTION_TYPES.md §1); any missing type logged to §2; no single-radio multi-correct.
- [ ] **Alignment table built** (§7a): every objective is on a slide + a worksheet Q; no orphan question; choices are single-correct.
- [ ] Show-your-work area present (MakeCode link field + `📷` screenshot field).
- [ ] **Source videos included** (attached + referenced on a slide); **relevant source images embedded** (viewed to confirm); any **image gap logged** (WORKSHEET_QUESTION_TYPES.md §4).
- [ ] Slide deck: `# title`, one `## ` per slide, `> 🧑‍🏫` teacher notes — **resource title ends `.md`**.
- [ ] Materialised onto the right scheme; all resources linked to their plans.
- [ ] Verified: worksheets + slides resolve, screenshot field present, teacher notes present, levels slice.
- [ ] **Exported to a committed bundle** (`npm run export-lesson-unit -- <unitId>`) and `git add`ed.
- [ ] Throwaway scripts deleted; nothing from `TeachComputing/` committed.

---

## Appendix — worked example: the Y7 micro:bit pilot alignment (§7a)

**Lesson 1 — micro:bit countdown** (plan 1209)

| Objective | Slide | Worksheet question |
|---|---|---|
| name a micro:bit input | S2 starter | starter: "input / not an input" (×3, Support recall, Challenge: v2-only) |
| explain iteration (a loop) | S3 predict, S5 for-loop | activity: Support word-choice, Core "what does iteration mean / why a start value" |
| change a loop to count down | S4 | activity: Predict (the count-up code) → then *show your work* (the count-down artefact) |
| make a countdown program | S5–S6 | activity: *Show your work* (MakeCode link + screenshot) + ✅ checklist |

**Lesson 2 — basketball throw strength** (plan 1210)

| Objective | Slide | Worksheet question |
|---|---|---|
| explain what a function is | S3 | activity: Support "a function is / runs when", Challenge "why more efficient" |
| read accelerometer (strength) data | S4 | activity: Core "what does the accelerometer measure" |
| log and show data | S4–S5 | activity: Core "why do we log", *My data* (strongest value) |
| measure the strength of a throw | S5–S6 | activity: *My data* + *Show your work* + ✅ checklist |

**Defect found & fixed in this check:** L1 starter "*which of these are inputs?*" was multi-correct on a
single-radio control (unanswerable). Rather than reduce it, the **multi-select** question type was **built**
(`[  ] buttons [  ] light sensor [  ] microphone [  ] the LED screen`) and the starter now uses it, with the
**micro:bit v2 board image** embedded above it and the **countdown video** linked on a slide. L2 had no
type/alignment defects (its image is in the §4 gap log to source next pass).
