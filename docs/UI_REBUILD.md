# UI rebuild — "Rail & Stage" (progress tracker)

Recreating the high-fidelity redesign in `docs/new-ui/design_handoff_ui_rebuild/` (README + `SPEC — UI rebuild.md`
+ HTML prototype) in the existing stack (TS/Fastify/HTMX, server-rendered, repo tokens). **In-place on the
`ui-rebuild` branch.** Plan: foundation first, then screens group-by-group. Radar + a dedicated `/planning`
are deferred. Full plan: `/home/duguid/.claude/plans/peppy-pondering-brook.md`.

## Approach
- **Reuse** the existing component vocabulary (it already exists): `.badge`(+tones), `.chip`/`.chip-count`,
  `.card`, `.ws-tab` tabs, `.tt-dot` dots, `.stats-grid`, `.note-status.saved`, width-intent. Build only gaps.
- **Category tones** (badges/cards): Logistics→`.badge.live` (teal) · Pupil→`.badge.warn` (amber) ·
  Admin→plain `.badge` (grey) · Curriculum→`.badge.good` (green) · Safeguarding→`.badge.red`.
- New CSS: structure → `styles-base-widgets.css`; dark theme → `styles.css` `body[data-shell="next"]`.
- Each screen: preview in `/ui-gallery`, screenshot-verify **1920×1080 + 1080×1920**, full test gate.
- Non-negotiable through every screen: no pupil name to AI; safeguarding-flagged content withheld entirely.

## Status

### ✅ Phase A — Foundation (done, verified)
- **Rail** (`src/lib/nav.ts`): `NavGroup` → 6 semantic groups (TODAY/FLAGGED/RECORD/CURRICULUM/CLASSES/SETUP);
  `NAV_MODEL` regrouped + tiers (Coverage→power, Settings→everyday); `renderRail` now renders **from
  NAV_MODEL** (no more drift) as an always-open 232px rail — brand, group captions, status dot + label +
  optional count pill, power-gating, Safeguarding pinned with its pulse. Rail CSS rewritten in `styles.css`
  (kept `.scaffolded-ribbon`/`.ribbon-link.active`/`.sg-flag` hooks for app.js/focus-mode/print).
- **Header** (`/header-overhaul` in `src/routes/now.ts`): added the **Everyday↔Power segmented control**
  (`.header-exp`/`.seg`); already had search (`/`), quick-note, clock+date, live now/next context. The
  experience toggle moved out of the rail foot (no duplication). The live now/next anchor is kept instead of
  a static page title — deliberate (better for an always-on command centre).
- **Pill+knob toggle**: new `renderToggle()` (`src/lib/components.ts`) + `.toggle-switch` structure
  (`styles-base-widgets.css`) + theme (`styles.css`). A real `<input type=checkbox>` re-skinned (native a11y +
  hx-post-on-change preserved). Refit the two standalone AI toggles in Settings (rest refit during the Settings
  screen pass).
- **Gallery component kit** (`/ui-gallery`): a "Component kit" section showing every shared component (badges
  in all tones, chips, tabs, toggle, dots, saved affordance, stat grid, tone-left-border cards) — the build
  reference + screenshot baseline.
- **Tests**: `tests/nav.test.ts` updated + a new rail-grouping/power-gating test (15 pass); `gallery.spec.ts`
  asserts the kit. Verified: typecheck · 894 unit · 376 integration · 18 E2E.

### ⏳ Phase B — screens, group-by-group (in progress)

**Done:**
- **Captured (`/captured`, SPEC §1)** — rebuilt to the capture-bar + triage-card design: a teal capture bar
  (type a line → Capture + → the new card prepends, input clears), category-filter chips **with counts**,
  tone-left-border cards (badge + subject + "added" date + body + "↳ resurfaces …" + actions) with a
  **Re-file** disclosure for category/date/class. Safeguarding honoured: a flagged capture shows **⚑ Flagged
  · withheld from AI** + "kept out of AI entirely" and its primary action is **Open register**, never "Make a
  task". Route computes per-category counts + creates from the typed body; the stale light-themed bottom
  Quick-Capture box was removed (`/capture-quick` route kept for the topbar). Added `CapturedItem.addedAt` +
  `paths.safeguarding()`/`paths.capturedFiltered()`. Gallery fixture added. Verified: typecheck · 899 unit ·
  captured integration · gallery+boot E2E · screenshot (both orientations).

- **Notes (`/notes`, SPEC §2)** — rebuilt into a searchable **knowledge-base grid**: a search field (live,
  HX-swaps just the grid) + New note, **filter chips with counts** by what each note links to (Groups /
  Pupils / Courses / General), and a `repeat(auto-fill,minmax(280px,1fr))` card grid. Each card: a kind
  **badge** (Course green · Group teal · Pupil amber · General grey), the date (mono), the **editable body**
  (autosave kept inline — workflow unchanged), and **link chips** (📘 course · 👥 group · 🧑 pupil). New
  render fns (`renderNoteCard`/`renderNotesGrid`/`renderNotesSearch`/`renderNotesChips`) so the shared inline
  `renderNoteItem` (Now / cockpit / Pupils) is untouched; `POST /notes` branches on kind (general→card,
  lesson→item). Repo: `listGeneralNotes` gained `q`/`link` filters + a pupil join (`NoteListRow.pupilName`).
  Gallery fixture added. Verified: typecheck · 899 unit · notes integration · gallery+boot E2E · screenshots.

- **Events (`/events`, SPEC §7)** — rebuilt into **groups by how-soon** (This week / Next two weeks / Later /
  No date yet, each with a count). Each event is a card with a **tone date chip** (mono day+month), the
  **editable title**, a **kind badge** and an **"in N days"** line (overdue→red). kind→tone: deadlines/exams/
  data-drops red · trip amber · parents'/open evenings teal · meetings/INSET/other grey. Editing
  (kind/date/lead/blocks-work) is in an **Edit** disclosure; ✓/✕ done/cancel. New event → "No date yet"
  group. Repurposed `eventView` (events-only; Now renders events itself). Gallery fixture (fixed "today" for
  deterministic grouping). Verified: typecheck · 899 unit · events integration · gallery+boot E2E · screenshot.

**✅ RECORD group complete** (Captured · Notes · Events).

### TODAY group (in progress)
- **Tasks (`/tasks`, SPEC §4)** — a **segmented tab control** (Inbox / Open / Done / ⭐ Interest, with
  counts from a new `taskCounts()`) over **tone-left-border task cards**: urgency-toned left border (urgent
  →red · by-next-lesson→amber · this-week/email/scheduled→teal · someday→grey), an **EMAIL** source tag
  (`TaskRow.source` now exposed), a **done-checkbox** (struck-through when done), the urgency badge, the ✉
  email detail, and triage/edit controls in a disclosure (open while triaging an inbox item). Repurposed
  `taskView` (tasks-only). Gallery fixture added. Verified: typecheck · 899 unit · tasks integration ·
  gallery+boot E2E · screenshots. (The repo's task model is urgency-based, so the tabs follow the real
  views — Open/Interest — rather than the mock's Today/Scheduled.)

- **Marking (`/marking`)** — *not a detailed SPEC section* (the marking **modal** is §17), so this was a
  light **align-to-the-design-system** pass: the status pills now use the shared `.badge` tones (to-confirm
  →amber · to-look-at→red · unmarked→grey · all-checked→green), the Mark action uses the shared `.button`,
  width set to `wide`, and wide tables get a `.table-container { overflow-x:auto }` + `min-width` so they
  scroll in portrait. It already used the shared stat grid + cards. Verified: typecheck · 899 unit · marking
  integration (14) · boot E2E.

- **Oversee (`/oversee`, SPEC §13)** — **extracted** the inline route-render into `src/lib/overseeView.ts`
  (pure data→HTML) and rebuilt to the spec: TA-led lessons grouped by day, each a **tone-left-border card**
  (slot · ⚑ class · course · TA name) with **plan-set/resources status pills** (reusing `weekReadiness` —
  `noPlan`→"plan missing" red + red left border, `needsEdit`→"resources ⚠" amber), and an Open action to the
  lesson page (where Set-plan/Attach-resources/Add-note happen). Week nav via new `paths.oversee()/overseeWeek()`.
  Width `working`. Gallery fixture. Verified: typecheck · 901 unit · oversee/timetable integration · gallery+boot E2E.

### Designer ADVICE incorporated (`ADVICE - for the developers.md`, commit `1bd24c7`)
- **Width intents corrected** to the designer's table: **Notes → wide**, **Events → working** (Captured=reading,
  Tasks=working already matched). Marking=wide (not in the table; table page).
- **Token `--ink` vs `--text`:** verified `--text` IS defined in `styles.css` (`#f3f7fc`; flips to `#fff`
  high-contrast / `#000` print) and `--ink: var(--text)` aliases it in the next shell — so the screens are
  theme-correct and the two are equivalent here. Kept `--text` (no churn); flagged for the designer.
- Rail groupings already match the advice (Concepts/Recurring/Time as power; Club/Free/TA contextual, not rail
  items; Radar/standalone-Planning/Cover correctly absent). No nav changes needed.

- **Focus (`/focus`, SPEC §5)** — **extracted** the inline render into `src/lib/focusView.ts`
  (`renderSubStep` + `renderFocusInner(vm)`; the route's `buildInner` keeps the FocusService data work and
  passes a view-model). Redesigned to the spec: a 3-mode **segmented control** (Morning / Free period / End
  of day) over a big **teal-gradient "Do this now" card** — caption (urgency · ~N min window · estimate ·
  load), tappable step checklist, break-down (+ AI), Done & next / Start timer, and "N hidden — on purpose";
  the empty end-of-day shows the green **wind-down** banner. New `paths.focus*` builders. Width `working`.
  Gallery fixture. **Tests added** (per your request, incl. Playwright): `tests/focusView.test.ts` (4 render
  cases) + `e2e/focus.spec.ts` (live: 3 mode tabs, card-or-windown, mode-switch, no console errors). Verified:
  typecheck · 907 unit · focus integration (2) · 19 E2E.

**Testing discipline (from here on):** each screen gets a **view unit test** + a **Playwright spec** (live
render + no console errors + a key interaction), on top of the gallery fixture + boot/gallery E2E.

- **Planner (`/planner`)** — **design-system alignment** (not a §6 rebuild). Important finding (code wins):
  the SPEC §6 "Planner (time & actuals)" — today's time blocks (planned / done / diverted / actual notes) —
  is the repo's **`/time`** route (`workBlockView`), **not** `/planner`. The rail's **"Planner" → `/planner`**
  is the repo's own **lesson-laying drag-grid** (drag tray-lessons onto a week×slots grid, cascade-insert) —
  no matching SPEC section. So `/planner` got: width → `wide` (the grid + tray need room), confirmed it reads
  consistently in the shell (the 21 `.pl-*` rules are already dark-themed), + a Playwright smoke test
  (`e2e/planner.spec.ts`). **The SPEC §6 design will land on `/time`** when the SETUP group is reached.
  Verified: typecheck · 907 unit · planner integration (2) · 20 E2E.
  - **Open IA question for the teacher:** the prototype's "Planner" is time-&-actuals; the repo's rail
    "Planner" is the lesson-laying grid. Keep them distinct (recommended — "code wins"), or repoint the rail?

- **Timetable (`/timetable`)** — **design-system alignment** (the week grid was already built to the
  look: `.tt-*` classes dark-themed, `renderCell`/`renderLesson`/`readinessDots` (🔴 no scheme · 🟣 plan
  to develop · 🔵 resource to edit), week nav, legend). Per ADVICE §1 the width was set to **`full`** (the
  5-day grid wants the whole stage), and a **portrait scroll safety-net** added: `min-width:720px` on
  `.tt-table` so the grid scrolls inside its existing `.table-scroll` wrapper on narrow screens (SPEC §0/
  advice §7) rather than crushing columns. **Tests added:** `e2e/timetable.spec.ts` (live render + legend +
  full-width intent + no console errors; week-nav advances to a dated week). Verified: typecheck · timetable
  unit (16) · Playwright (3) · screenshots both orientations (zero body horizontal overflow in either).

### CURRICULUM group (started — teacher priority)
- **Schemes (`/schemes`)** — rebuilt to the prototype's **two-lens** model, **Spine + header first** (the
  teacher's chosen scope; the **Classes matrix lens is deferred** to a follow-up — it needs per-lesson-
  per-class delivery+adaptation data the page doesn't yet compute). Built:
  - **Scheme meta header card** (`renderSchemesNext`): scheme title · course tag (`.badge.good`) ·
    `v{n} · live/draft` mono chip · version-switch chips · **real stats** (Units / Lessons / Versions —
    no invented coverage figure; spec-coverage/exam arrive with the matrix) · a **Spine|Classes lens
    toggle** (Spine active, Classes shown disabled "coming in a follow-up") · Make live / ＋ New version /
    ⚙ Scheme (the existing labels/move/delete controls, folded into a disclosure).
  - **Spine lens** (`renderSchemeTree`, redesigned internals): a 248px **Units sidebar** — each unit a
    selectable button with a **planned% bar** (% of its lessons that have both objectives + outline, a
    genuine readiness signal) — beside a **lessons panel** showing the selected unit. Unit selection is
    client-side (inline onclick, scoped to `.sch-spine`, matching the existing tree idiom); structural
    edits still swap the whole `#scheme-tree`. **Crucially, each unit panel reuses `renderUnit`/`renderPlan`
    verbatim**, so every editing / AI-draft / resources / review / compare / lay-down affordance — and the
    ~10 routes that swap `#plan-`/`#unit-`/`#scheme-tree` — keep working untouched. The route builds the
    tree inline (one fetch) to feed the header's real counts.
  - CSS: `.sch-header`/`.sch-stats`/`.sch-lens`/`.sch-spine`/`.sch-units`/`.sch-unit-btn`(+bar)/`.sch-lessons`
    in `styles-base-widgets.css` (token-driven, ≤1024px collapses to one column). **Tests added:**
    `tests/scheme.test.ts` (+7: spine layout, selectable units, planned% bar, hidden panels, empty state,
    header card stats, lens) + `e2e/schemes.spec.ts` (live boot + unit-swap interaction against the gallery
    fixture). Gallery fixture added (`GALLERY_SCHEME_*`, gallery now 12). Verified: typecheck · 914 unit ·
    scheme units (12) · gallery+schemes E2E · screenshots (gallery fixture, live empty-state, **live
    real-data** 7-unit/46-lesson scheme) — zero body horizontal overflow either orientation.
  - **Follow-up:** the Classes matrix lens (units × classes, taught/today/planned/not-placed + adapted
    marks) — needs delivery+adaptation data wiring; the lens toggle is already in place for it.

- **Now (`/`, flagship)** — **"add hero, keep 3-col"** (the teacher's chosen scope: the current screen
  already exceeds the prototype — mind-dump, inbox queue, day-prep — and has delicate self-polling, so a
  full re-layout wasn't worth the risk). Added a prominent **hero strip** (`renderNowHero`) atop the screen:
  a calm teal-gradient block with the period eyebrow (Now · {period}), the lesson title, room + start time,
  the **time-remaining countdown**, and **what's next** — handling all states (in-lesson / free / cover /
  outside-lesson / no-school). It renders **once at load** from the same now/next signals as the hidden
  self-polling `#now-strip`, so it never interferes with the clock/timeline pollers (the strip's "↻ changed
  — refresh" notice still drives mid-lesson updates). The existing 3-column grid (timeline · cards) is
  unchanged. CSS: `.now-hero*` structure in `styles-base-widgets.css` (collapses ≤720px) + teal-gradient
  theme in `styles.css`'s next scope. **Tests:** `tests/nowHero.test.ts` (4 states) + a `.now-hero` assertion
  in `e2e/nowPortrait.spec.ts` (confirms the hero fits the one-screen no-scroll portrait constraint). Gallery
  fixture + item added (now 13). Verified: typecheck · 918 unit · screens integration (54) · gallery +
  nowPortrait (portrait one-screen + landscape 3-col) E2E · screenshots (gallery in-lesson hero, live).

**✅ TODAY group complete** (Tasks · Marking · Oversee · Focus · Planner · Timetable · Now).

### CURRICULUM group (in progress)
- **Map (`/map`, SPEC §8)** — **extracted** the inline route-render into `src/lib/mapView.ts` (advancing
  the UI-separation goal) and rebuilt the term calendar from a `<table>` into a **timeline rail of
  tone-bordered cards**: a left **date rail** (mono date · connector node + line) beside lesson cards —
  **past** green-bordered with "stopped at …" + **↻ continue next week** (carry-over), **today** teal, and
  the holiday-aware **future** weeks plain (an empty week **dashed** "— nothing planned"); ✏ marks an
  adapted lesson. Read-only (editing stays on the lesson screen). **Drag-to-move future weeks preserved** —
  the rail carries `data-map-slot`/`-csrf` and draggable `<li>`s; `public/app.js` was updated from
  `table`/`tr` selectors to `.map-timeline`/`li`. New `paths.map()`/`paths.mapMove()` builders (+ oracle
  assertions); all view URLs via `paths.ts`. CSS: `.map-timeline`/`.map-row`/`.map-rail`/`.map-card`(tones)
  in `styles-base-widgets.css` (collapses ≤720px). **Tests:** `tests/mapView.test.ts` (7) + `e2e/map.spec.ts`
  (live boot + drag-hook attr) + updated the screens-integration assertion (`map-table`→`map-timeline`).
  Gallery fixture + item added (now 14). Verified: typecheck · 931 unit · 377 integration · gallery + map
  E2E · screenshot (gallery rail: past/today/future + empty).

- **Coverage (`/coverage`, SPEC §9)** — added a focused **coverage report** (`src/lib/coverageView.ts`,
  `renderCoverageReport`): the spec-point backbone as **cards per spec area** (grouped by code prefix) each
  with a **% bar**, the point rows a **status dot** (✓ covered green · ○ gap red) · code (mono) · label ·
  meta — covered points **link to the lesson that closes them** (↗), gaps read **"not yet"** in red. An
  **All · Covered · Gaps** filter (full-nav chips via `paths.coverageFiltered`) hides points and **drops
  emptied areas**. % = covered ÷ total. Enhanced `schemeCoverage` to also return the covering lesson
  (`coveringPlanId`/`Title` via a LATERAL join) so the "links to the lesson" requirement has data. The rich
  machinery is preserved: the AI gap-filler + per-lesson mapping checklists stay below the report, and the
  spec-point management table moved into a "Manage spec points" disclosure. (Data is binary covered/not —
  the spec's amber "partial"/"today" states aren't tracked, so they're not faked.) New `paths.coverage()`/
  `coverageFiltered()` (+ oracle). CSS: `.cov-report`/`.cov-area`/`.cov-bar`/`.cov-dot*`/`.cov-filter` in
  `styles-base-widgets.css`. **Tests:** `tests/coverageView.test.ts` (5) + `e2e/coverage.spec.ts` (boot +
  Gaps-filter nav). Gallery fixture + item (now 15). Verified: typecheck · 940 unit · 377 integration ·
  gallery + coverage E2E · screenshot.

- **Resources (`/resources`, SPEC §10)** — redesigned the existing `resourceView.ts` to the §10 hosted
  store: a search box + **filter pills** (All · per-kind) — rendered as **radio inputs** so the kind
  survives every live-search submit (the form serialises the checked radio; no JS) — over a **card grid**
  (`auto-fill, minmax(290px,1fr)`). Each card: a **kind badge** (Slides teal · Worksheet green · Quiz amber ·
  others grey, via shared `.badge` tones) · **version** (mono) · title · meta (**🔗 linked-lesson count** ·
  size · source) · **Open / Present ↗** (slides only, → the existing `/resources/:id/present`) / download,
  plus the where-used 📋→🔗 panel and the ⚖ attribution line. `renderResourceItem` stays an `<li>` so the
  upload/generate/version POSTs still prepend a card into the grid. New `paths.resourcePresent()` builder
  (+ oracle). CSS: `.res-grid`/`.res-card*`/`.res-pill(.is-on)` in `styles-base-widgets.css`. **Tests:**
  `tests/resourceView.test.ts` (5) + `e2e/resources.spec.ts` (boot + pill-filter). Gallery fixture + item
  (now 16). Verified: typecheck · 946 unit · 377 integration (resource page/search/where-used assertions
  still green) · gallery + resources E2E · screenshot.

**✅ CURRICULUM group complete** (Schemes · Map · Coverage · Resources).

### CLASSES group
- **Pupils (`/pupils`, SPEC §11)** — added the signature **red privacy banner** (individual pupils are
  *never named or described to any AI service* — only cohort prose; each name → a `PUPIL_n` token) and
  rebuilt the teacher roster as an **initials-avatar card grid** (`auto-fill, minmax(220px,1fr)`): each
  card an avatar · name · token, with the GDPR actions (archive / ⬇ SAR export / anonymise / erase) tucked
  into a calm **⋯ menu**. (The §11 cohort-analytics layer — class chips, Support/Core/Challenge level chips,
  completion %, ATL-trend arrows — needs per-pupil level/completion/ATL + group data the roster query
  doesn't carry; **deferred** like the Schemes matrix.) Inline render kept in the route (avoids churn on
  the many GDPR-action URLs). CSS: `.privacy-banner`/`.roster-grid`/`.roster-card`/`.roster-avatar` in
  `styles-base-widgets.css`. **Test:** `e2e/pupils.spec.ts` (banner + grid). Verified: typecheck · 946 unit ·
  screens integration · screenshot.

### SETUP group (in progress)
- **Kit (`/kit`, SPEC §12)** — was already built to §12 (filter · show-archived · ＋add · category-grouped
  tables in `.table-scroll` · Item/Own/Work/Location/Notes/Tags/Checked + ✓ stock-take · **Work<Own red** ·
  **stale checked-date red** · archive-not-delete). Only gap closed: added **`min-width:760px`** to
  `.kit-table` so the table scrolls inside its wrapper on narrow screens (SPEC §12) rather than crushing.

- **Settings (`/settings`, SPEC §3)** — restructured from one long `.card` of `<h2>` blocks into a
  **reading-width column of stacked section cards** (each section its own `.card`): School · Navigation ·
  Password · AI · TA access · Pupil access · Auto-marking · Email intake · Data health. The page already
  inline-autosaves and uses the pill `renderToggle` (AI features / reviewer); width set to **`reading`**.
  Pure re-wrap — no IDs/forms/targets changed, so every autosave/DPIA-gate/HTMX flow is intact. CSS:
  `.settings-page`/`.settings-head`/`.settings-section` in `styles-base-widgets.css`. Verified: typecheck ·
  946 unit · screens integration · screenshot (reading-width section cards). (Kept the existing section set
  + order — the SPEC's extra sections like Navigation/Pupil/Auto-marking have no SPEC slot but must stay.)

- **Planner / time & actuals (`/time`, SPEC §6)** — the repo's `/time` *is* §6 (confirmed earlier: the rail
  "Planner" is the lesson-laying grid; §6 = time & actuals here). It already shows **Work windows**
  (slot · time mono · duration, timetable-derived) + a planned/actual **Work log**. Added the §6 **status
  marks** (▢ planned · ▣ done · ⚠ diverted-keeps-the-plan-in-amber) to each log block and set the page to
  **`reading`** width. CSS: `.wb-status.wb-done`/`.wb-diverted` tones. Verified: typecheck · 946 unit ·
  screenshot. (The SPEC's break/lunch "✕ not work time" rows aren't shown — the Work-windows model already
  excludes them; the timetable-derived per-block model is a larger feature, not pursued.)

- **Year setup (`/setup`, SPEC §16)** — **verified already aligned, no changes**: the tabbed admin hub
  (Year & terms · Day shape · Rooms & staff · Courses · Groups & pupils · Timetable) already reads cleanly
  in the rebuilt shell — tab pills, dark-themed `.setup-table`s inside `.table-scroll`, the Prep-&-Advanced
  eyebrow/heading. Matches §16's "hub for rarely-changed things"; the §16 data/safety tiles (backups, SAR/
  erasure, idle logout, AI-call audit) surface from **Settings → Data health** (now carded). Screenshot-confirmed.

## Status

**✅ Rebuilt & verified:** Foundation (rail · header · toggle · gallery kit) · **RECORD** (Captured · Notes ·
Events) · **TODAY** (Tasks · Marking · Oversee · Focus · Planner · Timetable · Now) · **CURRICULUM** (Schemes ·
Map · Coverage · Resources) · **CLASSES** (Pupils) · **SETUP** (Kit · Settings · `/time` · Setup) · Safeguarding
(pinned). Gallery now showcases 16 fixture-backed views; full gate green throughout (typecheck · 946 unit ·
377 integration · E2E).

**Remaining — each its own focused session:**
- **Lesson cockpit (`/lesson/:id`, §17)** — the deepest screen (board mirror · in-lesson flow tracker · right
  icon rail · modals · marking modal · adaptation override-else-master scope strip). The SPEC itself flags it
  for a dedicated pass; not started.
- **Pupil `/me` overlay** — the calm light-theme pupil worksheet surface, behind the DPIA gate.

**Deferred (need data wiring, lens/affordance already stubbed):** Schemes **Classes-matrix** lens · Pupils §11
**cohort-analytics** layer (class chips · level chips · completion % · ATL trend).
(Kit §12 · Settings §3 · Setup §16; `/time` gets the SPEC §6 time-blocks design) · the deepest Lesson
cockpit §17 · pupil `/me`. Deferred: the Schemes **Classes-matrix** lens.

Order: **RECORD** (Captured ✓ → Notes ✓ → Events ✓) → **TODAY** (Tasks → Marking → Oversee → Focus → Planner →
Timetable → Now) → **FLAGGED** (Safeguarding) → **CURRICULUM** (Resources → Coverage → Map → Schemes) →
**CLASSES** (Pupils) → **SETUP** (Kit → Settings → Setup) → **Lesson cockpit** (own pass) → pupil `/me`.
Per-screen pattern: extract any inline route-render into a `*View.ts`; redesign to the SPEC section using the
shared components; URLs via `paths.ts`; add a gallery fixture; screenshot-verify both orientations; full gate.

Inline-rendered screens to extract first (no View file yet): Focus, Planner, Oversee, Map, Coverage; the header
(`/header-overhaul`) is also a route-inline render.
