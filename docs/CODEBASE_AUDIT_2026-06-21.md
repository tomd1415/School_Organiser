# Codebase audit & refactor plan — 2026-06-21

Scope: the whole `app/` (≈34k LOC TypeScript, plus `public/` assets). Produced by four parallel
read-only audits — (1) UI render-path duplication, (2) CSS, (3) dead/stale code & duplication,
(4) structural smells. This is the **record**; the **plan** is at the end.

---

## TL;DR — the headline correction

The brief was "everything should be on the new dark mode and there should be **none of the previous
one left**." The audit shows the opposite of "almost done":

- **The UI migration is only partly complete (~40%).** `ui_shell` still **defaults to `classic`**
  (`src/lib/nav.ts:101`). Of ~33 screens, roughly **13 have no next-shell view at all** and ~13 more
  carry **both** a classic body and a `*View.ts` body (duplicated).
- **"Removing the old UI" is a real multi-phase project, not a cleanup.** You cannot delete
  `styles.css` / `app.js` today — the classic shell is the default and many pages have no dark
  equivalent.
- **Concrete "old UI bleeding through" in `next` mode** (what you're seeing):
  1. **Four standalone pages hardcode the light `styles.css` with no branch** — they render light
     even when the flag is `next`: `pupils.ts:381` (login cards), `pupilWork.ts:645` (answer pack),
     `resources.ts:630` (slide-deck projector), `lesson.ts:1629` (`printPage` — lesson/cover print).
  2. **~13 "classic-only" pages emit classic `.card` markup into the dark shell** — they inherit the
     dark chrome but their bodies were never restyled (coverage, focus, map, planner, oversee, atl,
     groupHistory, rollover, welcome, pedagogy, lesson `/present`, plus the main bodies of events,
     recurring, time, notes, pupils, resources, pupilWork).
  3. **A stale premise inside `styles-overhaul.css`.** A 266-line "Legacy-widget compatibility layer"
     (`public/styles-overhaul.css:2712–2978`) whose own comment says *"the next shell deliberately
     imports the classic stylesheet"* — **this is false now**; `nextShell()` loads only
     `styles-overhaul.css`. So those `!important` patches are papering over *browser-default* widgets,
     not light surfaces.

The good news: **the two CSS files are not copy-paste duplicates** — `styles-overhaul.css` is 99.5%
scoped to `body[data-shell="next"]`, token-driven, and well-organised. The job is to *finish the
migration and delete classic*, not to de-duplicate two parallel skins.

---

## 1. UI dual-system (the big one)

**Dispatch.** `layout()` (`src/lib/html.ts`) is the unified entry: it returns `nextShell()` (loads
`styles-overhaul.css` + `app-overhaul.js`) when `getUiShell()==='next'`, else the classic chrome
(`styles.css` + `app.js`). `renderRail()` (`src/lib/nav.ts:146`) branches the nav the same way. Each
route *additionally* branches its **body** between classic inline HTML and a `*View.ts` builder.

**Screen classification** (full matrix in the agent run; summary here):

| Class | Count | Screens |
|---|---|---|
| **both** (classic body **and** a next `*View.ts` — duplicated) | ~13 | now, lesson (teacher), board, schemes, me, timetable, tasks, captured, concepts, safeguarding, kit, setup, settings, marking, markModal, ta, pupilAuth |
| **classic-only** (no next body — old UI in dark chrome) | ~13 | coverage, focus, map, planner, oversee, atl, groupHistory, rollover, welcome, pedagogy, lesson `/present`; + main bodies of events, recurring, time, notes, pupils, resources, pupilWork (their `*View.ts` only supplies HTMX fragments) |
| **next-only / fragments** | — | the `*View.ts` fragment exports (list rows, save status) used by both shells |

**Biggest duplicated bodies** (classic inline ↔ `*View.ts`), highest payoff to collapse:
- `settingsPage.ts:131–349` (~219 lines) ↔ `settingsView.ts` — the largest single duplication.
- `setup.ts:88–338` ↔ `setupView.ts:34–350` — **fully forked tab renderers** (`yearTab`…`timetableTab`
  exist twice; route copies are `async` + self-fetching, view copies take pre-fetched data).
- `me.ts:293–350` ↔ `meView.ts`; `kit.ts:69–109` ↔ `kitView.ts`; `schemes.ts:256–289` ↔
  `schemeView.ts`; `now.ts:208–238` ↔ `nowView.ts`; `lesson.ts` cockpit branch ↔ classic lesson body.

**Light-mode leftovers actually rendering in `styles-overhaul.css`** (the only *live* ones — most
"white" hits are dead `var(--token, #fff)` fallbacks where the token is dark):
- `:1137` `border-left:6px solid #e5e7eb` (light-grey bar on dark card) → `var(--line)`.
- `:474` `.chip:hover{border-color:#fff}` → `var(--line-strong)`.
- `:806`, `:948` white text on `--accent` (light teal) — low contrast → `color:var(--bg)`.

**Dead-once-classic-removed** (the prize): `layout()` classic branch (`html.ts` ~134–243),
`renderRail()` classic branch (`nav.ts` ~208–227), every route's classic body, the `ui_shell`
flag machinery (`getUiShell`/`setUiShell`/`UiShell` + the Settings "preview" toggle + the `server.ts`
boot prime), and the assets `public/styles.css` (1773 lines) + `public/app.js` (396 lines). `app.js`
and `app-overhaul.js` are **not** interchangeable (different nav DOM), so app.js dies only with classic.

---

## 2. CSS (`styles-overhaul.css`)

- **No cross-file selector duplication** with `styles.css` (intersection = 3 keyframe stops). Token
  usage is strong (522 `var(--…)` vs 209 hex). Well-sectioned (~40 labelled blocks).
- **Stale "Legacy-widget compatibility layer"** (`:2712–2978`, ~266 lines, drives most of the 318
  `!important`): premise is obsolete (next shell no longer imports classic). **Rewrite as primary dark
  rules or trim** — biggest correctness+cleanliness win in CSS.
- **Duplicate implementations:** two `.agenda-timeline`/`.timeline-slot` blocks (`:1476–1520` and
  `:1811–1818`); `.pupil-results .rc-fb` defined 3× (`:1073`, `:1275`, `:2854`); ~8 top-level scatter
  dups total.
- **Dead rules (~2–3%):** `.quick-capture-dock` (`:526–571`, +2945), `.phase-card` (+children),
  `.fact-when/who/money/deadline`, `.check-item/.checklist-items`, `.sg-new`, `.ex-cancelled`,
  `.group-footer`.
- **Hex debt:** map semantic hardcodes (`#16a34a`/`#f59e0b`/`#22c55e`/`#dc2626`…) to
  `--green/--amber/--red`; strip dead `, #fff` fallbacks so the file stops *reading* as light.
- **Missing base layer:** the overhaul has no reset / `box-sizing` / `@font-face` / base `font-family`
  (it leaned on `styles.css`). When classic goes, a small base block must be **added**.
- **Theme-toggle mismatch:** teacher shell reads `a11y-theme` (hyphen); `public/pupil.js` writes
  `a11y.theme` (dot). The pupil `[data-theme="dark"]` skin (`:1232–1287`) layers dark-on-dark — decide
  if it's meaningful.

---

## 3. Dead / stale code & duplication (backend)

The backend is **unusually clean** otherwise: **1** marker total (one justified `eslint-disable`),
**no** TODO/FIXME/HACK, **no** commented-out code blocks, **no** orphaned files, **no** scratch/`.bak`
files, **all** `package.json` deps used.

**Confirmed-dead functions/consts (safe to delete — verified 1 occurrence, 0 in tests):**
`listResources`, `listResourcesForCourse`, `setResourceUnit` (`repos/resources.ts`); `listDevices`,
`revokeDevice` (`repos/pupilDevices.ts` — a never-wired device-management path); `levelsForGroupCourse`
(`repos/pupilWork.ts`); `bumpPupilEpoch` (`repos/pupils.ts`); `pendingDeletionCount`
(`repos/fileDeletions.ts`); `worksheetForKey` (`services/worksheet.ts`); `RESOURCE_KINDS`
(`services/resource.ts`); `HAS_API_KEY` (`config/llm.ts`). (`renderResourceList` in `resourceView.ts`
is also dead but lives in a UI-dev file — leave for coordination.)

**Exact-copy duplicates:**
- `esc()` + `ENTITIES` — identical in `lib/html.ts:12` (exported) and `lib/nav.ts:137` (private).
  *Caveat:* `html.ts`→`nav.ts` already, so importing back would be a (runtime-safe) cycle; cleanest is
  a tiny leaf `lib/esc.ts`.
- `fmtShort()` — identical in `lib/timetableView.ts:15` (exported) and `routes/oversee.ts:19` (private)
  → oversee imports the shared one.
- `fmtMin()` (`nowView.ts:155`) is a body-identical twin of `fromMinutes()` (`lib/time.ts:12`) — **but
  it IS used** (nowView.ts:180); consolidate, don't delete.

**Other duplication:** ~11 hand-rolled `Intl.DateTimeFormat('en-GB', …)` short-date/clock formatters
across now/me/oversee/lesson/timetableView/nowView → extract 2–3 helpers into `lib/time.ts`. A
`JSON.stringify(x).replace(/</g,'\\u003c')` script-escape in `nav.ts:249` + `resources.ts:121` →
`jsonForScript()`.

**Cosmetic API-surface debt (low priority):** 16 unused LLM-schema `z.infer` type aliases; ~90
type/interface exports used only inside their own file (incl. abandoned `*NextData` view-data types and
the `Nav*`/`UiShell` types). 16 functions used only by tests (confirm they're deliberate seams before
touching — incl. the dead `pupilDevices` device-mgmt trio).

**Benign notes:** migration `0045` number is skipped (harmless — discovery is by filename sort); the
`is_current` academic-year subselect repeats 18× across repos (idiomatic thin-SQL; a shared fragment
would cut drift).

---

## 4. Structural smells

- **Oversized, concern-tangled modules.** `routes/lesson.ts` **1669 LOC** (45 routes + ~20 inline
  renderers + raw SQL + a 108-line AI pipeline + a print builder); `routes/schemes.ts` 955;
  `lib/worksheetForm.ts` 840 (parsing + slicing + HTML controls fused); `routes/resources.ts` 766;
  `routes/setup.ts` 743; `routes/settingsPage.ts` 726.
- **Layering violations.** Business logic in routes: `lesson.ts:536–643 generateAdaptedResources` and
  its twin `schemes.ts:117–209 generateResourcesForPlan` (the AI resource pipeline — note these are the
  functions just touched for the slides fix). Raw `pool.query` in **12 route files** (`ta.ts` has 4
  multi-join SELECTs — effectively a mini-repo; also me, settingsPage, pupilWork, markModal,
  groupHistory, atl, welcome, setup, lesson). `services/marking.ts:55` and `services/emailPoll.ts` hit
  the DB directly. **Repos importing runtime values UP from services** (`repos/recurringTasks.ts`,
  `repos/tasks.ts`, `repos/captured.ts`, `repos/events.ts`, `repos/prep.ts` import `LOADS`/`URGENCIES`/
  `EVENT_KINDS`/`CAPTURED_CATEGORIES`/`DAY_CHECKLIST_DEFAULTS`).
- **No shared HTML components.** `html.ts` exports only `esc`/`layout`/`nextShell` — no `button()`,
  `card()`, `formRow()`. Buttons are hand-written ~28× per big file; `.card` markup ~17× in lessonView.
- **Inconsistent route↔View split.** Some routes are thin (now 351 vs nowView 593 — good); others fat
  (lesson 1669 vs lessonView 612; setup 743 vs setupView 395). No rule for what lives where.
- **Validation drift.** 33 routes use Zod; `now.ts`, `markingPage.ts`, `pedagogyPage.ts` use ad-hoc
  casts. No shared `parseId` param helper.
- **Zero-test modules:** `services/sourceImages.ts`, `services/lessonDocEdit.ts`,
  `services/markingQueue.ts`, `repos/search.ts`, `repos/pupilProgress.ts`; `repos/setup.ts` (697 LOC)
  has only indirect integration coverage; the `worksheetForm.ts` parsing core isn't unit-tested in
  isolation.

---

## 5. Refactor plan (phased, prioritized)

Ordering principle: **stop the bleed → finish the migration → delete classic → de-tangle structure.**
Each phase is independently shippable and test-gated.

### Phase 0 — Safe cleanup (no behaviour change, low risk) — *partly done this session*
- Delete the 11 confirmed-dead backend functions (§3). **[done — see §6]**
- Dedup `fmtShort` (oversee → timetableView). **[done — see §6]**
- Extract `lib/time.ts` date/clock formatters + a `jsonForScript()` helper; replace the ~11 ad-hoc
  sites. Add a tiny `lib/esc.ts` leaf and route `html.ts`/`nav.ts` through it. *(S, not yet done)*
- Drop the 16 unused LLM-schema type aliases. *(S, cosmetic)*

### Phase 1 — Stop the light-mode bleed in `next` (user-visible, S–M)
- Branch the **4 standalone heads** to `styles-overhaul.css` when `next` (copy the `ta.ts` /
  `pupilAuth.ts` `isNext ? … : …` pattern): `pupils.ts:381`, `pupilWork.ts:645`, `resources.ts:630`,
  `lesson.ts:1629`. **First confirm `styles-overhaul.css` actually styles `.cards-page` / `.deck` /
  `.pupil-card`** (it may need a small base layer + those widget rules) — otherwise add them.
- Fix the 3 live CSS light leftovers (`:1137`, `:474`, `:806/948`).
- Rewrite/trim the stale "Legacy-widget compatibility layer" (`:2712–2978`) as primary dark rules.
- *Coordinate with the UI dev* — these touch `styles-overhaul.css` and the standalone pages.

### Phase 2 — Give the ~13 classic-only pages a dark body (M–L, the bulk of the migration)
Build `*View.ts` bodies (or confirm `.card` is acceptably dark-styled and just restyle) for: coverage,
focus, map, planner, oversee, atl, groupHistory, rollover, welcome, pedagogy, lesson `/present`, and
the main bodies of events, recurring, time, notes. Until this is done, "no classic left" is false.

### Phase 3 — Collapse the dual bodies & delete classic (M–L)
- Delete each route's classic body, keeping only the `*View.ts` call (keep the View files' HTMX-fragment
  exports). Start with the biggest: **settingsPage**, **setup** (de-fork the tabs), me, kit, schemes,
  now, lesson.
- Make the `next` paths unconditional; delete the `layout()`/`renderRail()` classic branches.
- Remove the `ui_shell` flag (`getUiShell`/`setUiShell`/`UiShell`, the Settings toggle, the `server.ts`
  prime). Delete `public/styles.css` + `public/app.js`; add the base layer to the overhaul; rename
  `*-overhaul.{css,js}` → canonical names (update the `<head>` refs).

### Phase 4 — De-tangle structure (M–L, independent of UI)
- Extract a shared **`services/resourceGeneration.ts`** to replace the twin AI pipelines in
  `lesson.ts` + `schemes.ts` (also pulls business logic out of routes).
- Slice `routes/lesson.ts` (1669) — move inline renderers into `lessonView.ts`, lookups into repos.
- Split `lib/worksheetForm.ts` → `worksheetParse.ts` (pure, unit-test it) + `worksheetControls.ts`.
- Add shared HTML helpers (`button()`/`card()`/`formRow()`) and sweep the top offenders.
- Establish & lint the rule **"no `pool.query` in `src/routes`"**; move route SQL into repos; move the
  domain constants repos import out of `services` into a neutral module.
- Add tests for the zero-test modules.

---

## 6. Done this session (Phase 0 start)

- **Deleted 11 confirmed-dead backend functions/consts** (each verified: 1 occurrence, 0 in tests;
  typecheck clean + 605 unit tests green after): `listResources`, `listResourcesForCourse`,
  `setResourceUnit` (`repos/resources.ts`); `listDevices` (+ its now-orphaned `DeviceRow` type),
  `revokeDevice` (`repos/pupilDevices.ts`); `levelsForGroupCourse` (`repos/pupilWork.ts`);
  `bumpPupilEpoch` (`repos/pupils.ts`); `pendingDeletionCount` (`repos/fileDeletions.ts`);
  `worksheetForKey` (`services/worksheet.ts`); `RESOURCE_KINDS` (`services/resource.ts`); `HAS_API_KEY`
  (`config/llm.ts`).
- Corrected one audit claim: `fmtMin` (`nowView.ts`) is **not** dead (used at nowView.ts:180) — it's a
  duplicate of `fromMinutes`; left in place for the formatter-extraction step. `fmtShort`/`esc` dedups
  deferred to the `lib/time.ts` / `lib/esc.ts` extraction (avoids touching the UI dev's `*View.ts` and a
  runtime import cycle piecemeal).

Everything below §6 (Phases 1–4) is **not** started — it needs sequencing and, for the CSS/View work,
coordination with the UI dev.
