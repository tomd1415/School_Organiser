# UI / back-end separation plan (→ ~95% isolation) + board slide-sync

**Status:** Phase 0 (board slide-sync) + Phase 1 (component gallery) **BUILT & verified** (2026-06-24).
Phase 4 *started*: the pupil-card width is now by **intent** (default reading width; full-width when a
work card or — structurally — when it contains a two-pane) instead of an incidental `:not()` marker, and a
regression where the unified deck's `.md-doc` silently shrank the whole pupil surface to 800px was caught
+ fixed (with an E2E width guard). Phase 2 *started*: `paths.ts` exists and the cockpit's (`lessonView.ts`)
path-only lesson-action URLs are migrated onto it, enforced by a grep guard (`tests/pathsGuard.test.ts`);
query-string URLs + the other view files remain. Phase 3, the rest of 4, and 5 remain — see below.
Goal: make the UI a self-contained layer that can be **redesigned in isolation** from
routes/services/repos/DB, and finish the live **board slide-sync** feature along the way.
Grounded in a coupling audit of the actual codebase (numbers below). Not a SPA/JSON-API rewrite — see
*Non-goals*.

## Where we are (~80% already separated)

This is server-rendered HTML-over-the-wire (HTMX). There is **no front-end framework and no front-end
build step**. The "UI" is already a distinct seam:

- **Views** — `src/lib/*View.ts` (22 files, ~87 `render…()` functions): pure `data → HTML string`, no I/O.
- **Shells** — `nextShell`/`layout` (`src/lib/html.ts`, teacher app) and `pupilLayout`
  (`src/routes/pupilAuth.ts`, pupil pages).
- **CSS** — `public/styles.css` which `@import`s `styles-base.css` + `styles-base-widgets.css`.
- **Client JS** — hand-written `app.js`, `pupil.js`, `worksheetEditor.js` + vendored `htmx.min.js`
  (~166 DOM-selector call-sites that form a markup↔JS contract).

A redesign of layout/look already touches **only** these files — routes/services/repos/DB are untouched.

## The three couplings that still leak the back-end into the UI (measured)

| # | Coupling | Measured | Effect |
|---|----------|----------|--------|
| 1 | Views import **data-shape types** from `repos`/`services` | 20 / 22 view files (mostly `import type`; a few runtime-value imports e.g. `weekdayName`, `LOAD_LABELS`, `URGENCIES`) | A data-model rename can ripple into views. Low runtime risk (types compile away); the runtime-value imports are the real coupling. |
| 2 | Views **hard-code route URLs** (`hx-post`/`hx-get`/`href`/`action`) | **~179 distinct URLs** across views (`/schemes`×44, `/settings`×37, `/lesson`×37, `/setup`×31, `/oc`×15…) | The biggest coupling. An endpoint rename means hunting strings across views; views and routes are string-coupled both ways. |
| 3 | **CSS keyed on marker classes** the markup must remember to include, spread across 3 sheets | 3 sheets, large shared-class surface; width depends on `.pupil-work-card`/`.kit`/etc. | Same logical view renders differently by which class is present (the pupil-preview width bug). Edits can hit a shadowed copy. |

## Target: the UI as an isolatable module (~95%)

The realistic ceiling for this architecture (no SPA): **`src/lib/*View.ts` + `public/*.css` +
`public/*.js` are "the front end."** They are fed **view-models** (UI-owned data shapes), reference routes
through **one URL module**, and can be **previewed/redesigned in isolation** via a component gallery. The
remaining ~5% is the irreducible contract: HTML structure, the HTMX endpoints behind it, and the markup↔JS
selectors.

---

## Plan (phased, independently shippable)

### Phase 0 — Board slide-sync (self-contained feature; do first)

Finish the live board sync the cockpit already half-supports. Today the cockpit publishes slide moves
(`POST /lesson/oc/:id/slide{,-lock}` → in-process broadcast) and the pupil `/me` follows over SSE
(`/me/slide-stream`); the **projector board** (`/lesson/pupil-view`) does not, because it is keyed on
`(gc, lp)` not the live `occurrence_course id`, and the SSE endpoint is pupil-auth-scoped.

Steps:
1. **Thread the occurrence-course id to the board.** In the cockpit, `boardHref`
   ([lessonView.ts](../app/src/lib/lessonView.ts) ~393) becomes
   `/lesson/pupil-view?gc=&lp=&level=&oc=<activeSection.occurrenceCourseId>` when live (not preview).
2. **Board route accepts `oc`** ([lesson.ts](../app/src/routes/lesson.ts) `/lesson/pupil-view`) and passes
   it to `renderBoardNext`, which sets the deck's `data-deck="<oc>"` (numeric) when present — the existing
   `pupil.js` numeric-id gate then auto-opens the SSE subscription on the board.
3. **Teacher-readable stream.** Either relax `/me/slide-stream` to also admit an authed teacher (read-only)
   when the session isn't a pupil, **or** add a sibling `GET /lesson/oc/:id/slide-stream` (`requireAuth`)
   that reuses `subscribe`/`getSlideState`. Prefer the sibling route (clean separation of pupil vs teacher
   surfaces); point the board's deck at it.
4. **Lock semantics on the board:** decide whether a cockpit "lock" disables the board's own Prev/Next
   (it's the teacher's screen) — recommend the board *follows* slide moves but keeps its own nav usable.
5. **Verify** on a real projector viewport: cockpit Next/Prev/lock moves the board deck; pupil `/me` sync is
   unaffected. Add a 2-page E2E mirroring `slideSync.spec.ts` for the board.

Effort: **small–medium** (1 route param, 1 SSE route, `renderBoardNext` tweak, cockpit href, 1 E2E).
Risk: live-projector — verify with screenshots before relying on it in class. Independent of the rest.

### Phase 1 — Component gallery (the isolation *enabler*; highest leverage)

A dev-only `GET /ui-gallery` page (teacher-auth, gated to non-production) that renders **every view
function with fixture data** — no DB, no live state. Group by surface (cockpit, pupil deck, now, marking,
schemes, …). This is what makes "redesigns stay separate": you iterate `*View.ts` + CSS against the gallery
and screenshot-test it, never touching the back-end.

Steps:
1. `src/lib/fixtures.ts` — hand-built sample view-models (one per view family).
2. `src/routes/uiGallery.ts` — render each view fn with its fixture under a labelled section; `NODE_ENV !==
   production` guard.
3. Playwright `e2e/gallery.spec.ts` — load the gallery, assert no console errors, snapshot each section
   (visual-regression baseline so a redesign's diffs are reviewable).

Effort: **medium**. Pays for itself immediately (every later phase verifies against it).

### Phase 2 — One route-URL module (`paths.ts`) — kills coupling #2 (biggest)

A single typed module of route builders, the source of truth for every URL.

Steps:
1. `src/lib/paths.ts` — `export const paths = { lessonOcSlide: (oc) => \`/lesson/oc/${oc}/slide\`, scheme:
   (id) => …, … }`. Co-locate with a comment that route files own the *handlers*, `paths` owns the *strings*.
2. Migrate views **incrementally**, highest-traffic first (`/lesson`, `/schemes`, `/settings`, `/setup`,
   `/oc`). Each migration is mechanical and gallery-verifiable.
3. Optional guard: a grep test that fails on a raw `hx-post="/…"` literal in `src/lib/*View.ts` once a family
   is migrated.

Effort: **medium–large** (~179 call-sites, but mechanical + incremental). Highest decoupling payoff.

**Progress (2026-06-24):** `src/lib/paths.ts` created. **`lessonView.ts` (the cockpit — highest churn) is
now FULLY migrated** — every route URL (path-only **and** query-string) goes through `paths`. The
query-string escaping convention is settled: builders emit the **HTML-attribute form** (`&amp;` joiners,
`esc()`-ed values) so no rendered bytes change, and a `scopeQ(gc)` helper handles the `master=1` vs `gc=`
preview/class split. Verified by the cockpit parity test (asserts exact URLs) + the slide/board/preview
E2E; locked by `tests/pathsGuard.test.ts`, which now asserts lessonView has **no raw route-URL literal**.
**Remaining:** the other view files (`schemeView`, `settingsView`, `setupView`, …) migrate family-by-family
(move each `FULLY_MIGRATED`/`PARTIAL` in the guard as it lands), then the route files' inline-HTML URLs.

### Phase 3 — View-models — kills coupling #1

Give the view layer its own data shapes so it never imports `repos`/`services`.

Steps:
1. `src/lib/viewModels.ts` (or per-view `XView.types.ts`) — UI-owned interfaces.
2. Routes map repo rows → view-models before calling render fns (they already assemble data; this formalises
   it). Start with the runtime-**value** imports (`weekdayName`, `LOAD_LABELS`, `URGENCIES`…): move those
   constants/helpers into the UI layer or a shared `src/lib/uiConstants.ts`.
3. Leave pure `import type` coupling for last (lowest risk — compiles away).

Effort: **medium** (type-only most cases). Lower urgency than Phase 2.

### Phase 4 — CSS ownership — kills coupling #3

Make CSS predictable so markup classes are a stable contract.

Steps:
1. **One ownership model:** tokens (`:root`) → base/reset → components, with each class owned by exactly one
   sheet. Reconcile the `styles.css` ↔ `styles-base*.css` overlaps (audit found genuinely-different blocks
   *and* shadowed duplicates — handle case by case; do **not** blanket-delete).
2. **Stop keying width/layout on incidental marker classes.** Replace `.pupil-card:not(.pupil-work-card)`
   and the per-page width-class lottery with explicit intent classes (`.surface-reading`/`.surface-working`
   /`.surface-wide`) applied once by the shell from a view-declared width hint.
3. **Class catalog** in this doc / a comment block: the canonical component classes + which sheet owns them.
4. Lint/convention: a check for a class defined as a rule-start in >1 sheet.

Effort: **medium–large** (careful, visual). Do after the gallery so every change is screenshot-verified.

### Phase 5 — Conventions + guardrails (lock it in)

Add to `CLAUDE.md` (project rules) + a lint/grep test:
- Routes **never emit HTML**; views are pure `view-model → HTML` and **never import `repos`/`db`**.
- Every route URL in a view comes from `paths.ts`.
- A view's CSS classes are its contract (documented in the catalog).
- New view functions get a gallery fixture.

Effort: **small**. Makes the separation durable (prevents regression).

---

## Sequencing & rationale

1. **Phase 0 (board-sync)** — independent, user-visible, finishes an in-flight feature. Ship first.
2. **Phase 1 (gallery)** — unblocks isolated, screenshot-verified work for everything after.
3. **Phase 2 (paths.ts)** — biggest decoupling; mechanical; verify against the gallery.
4. **Phase 4 (CSS)** — high user-visible consistency payoff; needs the gallery.
5. **Phase 3 (view-models)** — formalises the data seam; mostly type-only.
6. **Phase 5 (guardrails)** — last, to lock the achieved state.

Each phase is independently shippable and leaves the suites green (typecheck · unit · integration · E2E).

## Verification strategy

- **Gallery + Playwright visual snapshots** — the primary safety net for UI changes (redesign diffs become
  reviewable screenshots).
- **Existing suites** stay green at every phase: `npm run typecheck`, `npm test`, `npm run test:integration`,
  `npx playwright test`.
- **Grep guards** (Phase 2/5) — fail the build on raw URL literals / repo imports in views once migrated.

## Non-goals (explicitly out of scope)

- **No SPA / JSON API / client framework / build step.** Full physical isolation (separate front-end app)
  would contradict the HTMX design (no build, HTML from the server, one deploy) and is a large rewrite for a
  single-developer LAN app. The ~95% ceiling above gives the isolation benefit without that cost.
- No change to the data model, auth, or the privacy/AI wrapper.

## Rough effort

| Phase | Effort | User-visible? |
|---|---|---|
| 0 Board-sync | S–M | Yes (board follows you) |
| 1 Gallery | M | Dev-only |
| 2 paths.ts | M–L | No (internal) |
| 3 View-models | M | No |
| 4 CSS ownership | M–L | Yes (consistency) |
| 5 Guardrails | S | No |
