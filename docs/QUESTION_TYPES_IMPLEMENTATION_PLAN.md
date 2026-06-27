# Implementation plan — the 4 unbuilt worksheet question types

> **STATUS: all four BUILT 2026-06-27** (order → card-sort → slider → label), each gate-green and live in
> §1 of `WORKSHEET_QUESTION_TYPES.md`. This doc is kept as the design+storage record; the build matched the
> plan except sort/label are **self-marked in the mark modal** (correct answer carried on the field, ✓/✗
> badge) rather than auto-scored via the AI scheme — `markObjective` is already kind-agnostic, so promoting
> them to deterministic `choice` auto-marking is a ready follow-up. Outstanding helper: a `/ui-gallery`
> click-to-capture coordinate picker before mass-authoring labels.
>
> **Why this doc.** Six Y7 units wanted four question types the engine can't render yet
> (`WORKSHEET_QUESTION_TYPES.md` §2). This plans building them **and** — the important half — pins the
> **storage spec** so lesson conversion can author them and every answer is stored in the correct, markable
> way. Read alongside the engine: `app/src/lib/worksheetForm.ts` (parse + render), `deterministicMarker.ts`
> (marking), `public/pupil.js` (client widgets), `src/repos/pupilWork.ts` (answer rows).

---

## 0. The storage invariant (this is the spec that lets conversion continue)

**Nothing about how answers are stored changes.** Today every answer — text, choice, multi-select, blank,
code, parsons, screenshot — is **one `TEXT` value under one stable `field_key`** in
`pupil_answers (pupil_id, occurrence_course_id, resource_id, version_no, field_key, value)`. Structured
answers are encoded into that one string:

| Existing type | `value` encoding | Marked by (`MarkKind`) | Expected lives in |
|---|---|---|---|
| text / code | the raw text | `keyword` / `exact` / `open` | mark scheme |
| choice | the chosen option's **text** | `choice` | mark scheme |
| multi-select | chosen options' text, **`, `-joined** | `multichoice` (set compare) | mark scheme |
| blank | the typed word | `exact` / `keyword` | mark scheme |
| matching | **N `choice` fields**, one per row | `choice` per row | mark scheme |
| parsons | the lines, **`\n`-joined** (pupil's order) | compared to `field.solution` in the marking modal | the worksheet markdown |
| screenshot | `img:<relpath>` | not auto-marked | — |

**The four new types are built entirely on these two precedents** — no new table, column, or value protocol:

- **Order / card-sort / label = "the matching/parsons pattern":** the answer is either a `\n`-joined order
  (like parsons) or **several `choice` sub-fields** (like matching), so it auto-marks with the existing
  `choice` marker and the existing AI scheme. A new *widget*, not a new *storage*.
- **Slider = "the numeric/text pattern":** one field, the value is a number string, marked `numeric` or left
  uncredited like a checklist.

**Field-key namespaces are reserved now** so adding a block type never renumbers existing keys (each is an
independent global counter over the whole document, exactly like `blank.{n}` / `task.{n}` / `parsons.{n}`):

```
order.{n}            one per ```order block         (sequence answer)
sort.{n}.i{m}        per ITEM m of card-sort block  (choice sub-field)
label.{n}.z{m}       per ZONE m of label block      (choice sub-field)
scale.{n}            one per scale field            (number)
```

Because an unrecognised fenced block renders today as an inert `<pre>` and emits **no** field, authoring the
new syntax before the engine ships is **forward-safe**: no keys exist to collide with, and the day the engine
learns the block, previously-authored lessons light up with zero migration. (Caveat: until built, a pupil
sees the block as a code box — so **author the new types only once built**; until then keep the
`WORKSHEET_QUESTION_TYPES.md` §3 stop-gaps. The syntax below is the contract conversion will use.)

---

## 1. Order / sequence — non-code  *(effort: S — a parsons twin)*

Drag plain-language **steps/events** into the right order (the packet's journey; the steps to make a chart;
order the algorithm in English). Parsons already does this for *code*; this is the same machinery with a prose
skin and a separate key namespace.

- **Authoring syntax** — a fenced block, **one step per line, in the CORRECT order** (an optional prompt line
  before it):
  ````markdown
  Put the journey of a data packet in order:

  ```order
  The message is split into packets
  Each packet is given the destination address
  The packets travel separately across the network
  The packets are reassembled in the right order
  ```
  ````
- **Parse / field:** add `'order'` to the `WorksheetField['kind']` union. Generalise the parsons extractor to
  accept ` ```order ` (tag → kind); carry the correct sequence on `field.solution` (never emitted to form
  HTML). Key `order.{n}`, a global counter beside `parsons.{n}`.
- **Stored value:** the pupil's lines **`\n`-joined** — identical to parsons.
- **Marking:** exact-sequence compare of `value.split('\n')` to `field.solution`, in the marking modal, beside
  the existing parsons check (factor out `markOrdering(saved, solution)`). Excluded from the AI scheme like
  parsons. (Optional later: partial credit = longest common subsequence.)
- **Render / client:** reuse `parsonsControl` (rename the shared core to `orderingControl(kind, …)`); render
  tiles as prose `<span>` not `<code>`; reuse `shuffleStable` and the existing `pupil.js` parsons drag + ▲▼
  + autosave (`data-save-url`) wholesale.
- **Touch list:** `worksheetForm.ts` (kind union; `extractOrdering`; render branch in `renderWorksheet`),
  `marking.ts` (already filters `parsons`; also filter/handle `order`), `public/pupil.js` (selector
  `.ws-parsons-wrap` → also `.ws-order-wrap`, or share a class), `assessmentReviewView.ts` `KIND_LABEL`,
  `styles*.css`. **No marker enum change** (scored against `solution`, not via `MarkPoint`).

## 2. Card sort / group into categories  *(effort: M — a matching twin)*

Drag items into named category columns (Input/Output; primary/secondary data; hardware/software). Matching is
already "N `choice` fields rendered as a drag widget" — card-sort is the same with **categories as the option
pool** and items as the prompts.

- **Authoring syntax** — a fenced block; **each line is `Category: item, item, …`**, which gives both the
  category columns *and* each item's correct column:
  ````markdown
  ```sort
  Input: button, microphone, light sensor
  Output: LED display, speaker
  ```
  ````
- **Parse / fields:** add `'sort'` to the kind union (widget marker). The block expands to **one `choice`
  sub-field per item**: key `sort.{n}.i{m}`, `options` = the category names (sorted/stable), `label` = the
  item text, and the item's correct category recorded as the field's expected. Items are pooled and
  `shuffleStable`-shuffled for display so position never reveals the answer.
- **Stored value:** per item, the **chosen category's text** — exactly a `choice` value.
- **Marking:** `MarkKind 'choice'`, expected = correct category, **one mark point per item** ⇒ natural partial
  credit, and the existing AI scheme + `deriveScheme` handle it unchanged (it already emits `choice` points
  for `options`-bearing fields). Optionally embed the solution in the block too (parsons-style) so it can
  auto-mark without a scheme; prefer the scheme path for consistency with matching.
- **Render / client:** a tray of shuffled item tiles + a labelled drop-zone per category. This is the matching
  widget with **slots = categories** and **many tiles per slot**; extend `renderMatching`/the `pupil.js`
  `.ws-match` engine to allow N tiles per slot (today it's one), or add a sibling `.ws-sort` reusing the same
  tile/slot pick-place/drag handlers. Each placement autosaves its item's `choice` field via `data-save-url`.
- **Touch list:** `worksheetForm.ts` (kind union; `extractSort`; emit per-item `choice` fields; `renderSort`),
  `public/pupil.js` (multi-tile-per-slot or `.ws-sort`), completion counter (count placed items),
  `assessmentReviewView.ts`, `styles*.css`. Marker + scheme: **unchanged** (`choice`).

## 3. Label a diagram / image hotspot  *(effort: L — biggest; needs coordinates)*

Drag labels onto positioned drop-zones on an image (label the micro:bit; label network hardware; label the
toolbar). Storage is again **matching twin** — per-zone `choice` fields — the cost is the **authoring of
zone coordinates** and the positioned-overlay render.

- **Authoring syntax** — a fenced block naming the image and, per line,
  `zoneId (xPercent, yPercent): correct label` (percent of image width/height, top-left origin):
  ````markdown
  ```label
  image: {{res:l1-microbit-board.png}}
  A  (16%, 64%): button A
  B  (84%, 64%): button B
  USB (50%,  4%): USB connector
  LED (50%, 50%): LED display
  ```
  ````
  The labels form a shuffled bank. `{{res:<file>}}` resolves to `/resources/<id>/view` at seed time exactly
  like an embedded image — so the bundle stays instance-independent.
- **Parse / fields:** add `'label'` to the kind union. Expand to **one `choice` sub-field per zone**: key
  `label.{n}.z{m}`, `options` = the label bank, `label` = the zoneId/aria text, expected = the correct label.
  Coordinates are **render-only** (carried on the field as `zones:[{id,x,y}]` or a parallel structure) and are
  **never stored in `pupil_answers`** — only the chosen label is.
- **Stored value / marking:** per zone, the chosen label text ⇒ `MarkKind 'choice'`, one point per zone,
  partial credit; AI scheme path unchanged. (Same as card-sort.)
- **Render / client:** an `<img>` in a positioned wrapper with an absolutely-placed drop-zone per `(x%,y%)`
  and a tray of shuffled labels; reuse the matching pick-place/drag/keyboard engine (slots just happen to be
  positioned over the image). Needs a focus-visible outline + large hit-areas (SEND).
- **Authoring cost:** coordinates must be set by **viewing the image** and reading off positions. For
  conversion, until an authoring helper exists, prefer the **matching** stop-gap (part ↔ label as a list) and
  log the lesson in §2.4. Build a tiny dev-only "click the image to capture x%,y%" helper in `/ui-gallery`
  before mass-authoring labels.
- **Touch list:** `worksheetForm.ts` (kind union; `extractLabel`; `renderLabel`), `public/pupil.js`
  (positioned slots), `markdown`/CSP image URL already supported, `assessmentReviewView.ts`, `styles*.css`,
  a `/ui-gallery` coordinate-picker. Marker + scheme: **unchanged** (`choice`).

## 4. Slider / rating scale  *(effort: S — a numeric twin; low priority)*

A drag slider on a scale (confidence 1–5; estimate a value). Lowest stakes, usually a plenary self-rating.

- **Authoring syntax** — an **answer-table cell** marker (sits in the existing `| Question | Your answer |`
  table machinery), `[scale MIN-MAX]` with optional end labels after a colon:
  ```markdown
  | How confident are you with loops now? | [scale 1-5: not sure … very confident] |
  ```
  (A discrete 1–5 *choice* is already expressible as a radio `(  ) 1 (  ) 2 …`; the slider is the nicer widget
  for the same data, and the better fit for estimation where the range is wide.)
- **Parse / field:** detect `^\[scale\s+(\d+)-(\d+)(?::(.*))?\]$` in a body answer cell (beside the
  `isChoiceCell` / `isMultiCell` checks). Add `'scale'` to the kind union; reuse the **table-cell key**
  `t{n}.r{n}.c{n}` (no new namespace — it's an ordinary cell), carry `{min,max,labels}` on the field.
- **Stored value:** the chosen **number as text** (e.g. `"4"`).
- **Marking:** default **uncredited** (self-assessment, like the `✅ I can…` checklist) — emit the field but
  give it no mark point. Optionally `MarkKind 'numeric'` against an expected/range when it's a real estimate
  question (the scheme already supports `numeric`).
- **Render / client:** `<input type="range" min max>` + a live value bubble; autosave the number on
  `change` via the same `/me/answer` path as a text cell (htmx, like the compact text input). Disabled/inert
  in preview/review (review shows the saved number on the scale).
- **Touch list:** `worksheetForm.ts` (kind union; cell detect; `scaleControl`; wire in `renderRow`),
  `assessmentReviewView.ts`, `styles*.css`. Marker: reuse `numeric` when credited; **no enum change**.

---

## 5. Cross-cutting change list (every type)

1. `WorksheetField['kind']` union in `worksheetForm.ts` — add `'order' | 'sort' | 'label' | 'scale'`.
2. `assessmentReviewView.ts` `KIND_LABEL` — add a human label for each (typecheck enforces exhaustiveness).
3. `services/marking.ts` — the scheme-derive filter already drops `parsons`/`image`; drop `order`/`label`
   zones appropriately and ensure `sort`/`label` `choice` sub-fields flow into the scheme normally.
4. `public/pupil.js` — widget wiring (order = reuse parsons; sort/label = reuse/extend matching; scale =
   reuse text autosave) + the completion counter (`fillable`/`done`) must count the new widgets.
5. CSS — structure in `styles-base-widgets.css`, dark theme in `styles.css`'s `body[data-shell="next"]`.
6. `src/lib/uiFixtures.ts` + `/ui-gallery` — a fixture worksheet exercising all four (preview in isolation).
7. **No migration. No `pupilWork.ts`/`marking.ts` storage change. No `MarkKind` enum change** (order/label
   scored vs `solution`; sort/scale reuse `choice`/`numeric`).

## 6. Build order (each shippable on its own, gate-green between)

1. **Order** — highest value (every networks/algorithms/process lesson), smallest build (parsons twin). Lands
   the "generalise parsons → ordering" refactor that nothing else depends on.
2. **Card-sort** — high value, medium build; lands the "N tiles per slot" matching extension.
3. **Slider** — small, independent; nice for every plenary.
4. **Label-a-diagram** — largest; do last, after the `/ui-gallery` coordinate-picker, then bulk-author labels.

## 7. Test plan (mirror `tests/worksheetTypes.test.ts` + `deterministicMarker.test.ts`)

Per type: a **parser** test (markdown → expected `fields[]` with right kind/keys/options/solution); a
**render** test (form has the widget + autosave hooks; preview is inert; review shows the saved value);
a **slice** test (the widget respects `## 🟢/🟡/🔴` level sections); a **key-stability** test (keys identical
in full vs sliced render — the invariant the whole engine rests on); and a **marking** test
(order/label sequence/zone compare; sort/scale via `choice`/`numeric`). Add one **bundle round-trip** case so
an authored lesson seeds + renders. Keep the existing 1156 green.

## 8. What conversion does in the meantime

Until a type ships, keep the `WORKSHEET_QUESTION_TYPES.md` §3 stop-gap (matching / radio / checklist / text)
and log the lesson under the relevant §2 item. **Once a type ships:** flip its §2 status to BUILT, move it to
§1 with the authoring syntax above, revisit the logged worksheets, and re-run the §7a alignment check. Then
resume conversion using the real type — stored exactly as specified here, so no re-work.
