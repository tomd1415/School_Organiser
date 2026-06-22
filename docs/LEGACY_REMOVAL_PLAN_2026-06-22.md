# Legacy / duplicate-code removal plan — 2026-06-22

**Supersedes** `docs/CODEBASE_AUDIT_2026-06-21.md` (that audit predates the "UI recovery" commits
`57421ad` / `43258b8` / `c7db79c` and its asset names — `styles-overhaul.css`, `app-overhaul.js` — no
longer exist). Produced by a 20-agent map-and-adversarially-verify sweep of the current code. Every claim
below was re-checked with fresh greps; the **"Do NOT touch"** items are mapper over-reaches the verifiers
caught — read them before deleting anything.

---

## The two distinct problems (don't conflate them)

1. **The *visible* "pages pick up parts of the old design / hard to read" symptom is 100% CSS.** The
   live `styles.css` `@import`s the *recovered classic stylesheet* and its light rules bleed through. This
   is the user-facing pain → **Phase 1**.
2. **The *invisible* legacy mass is the dead `ui_shell` "classic" shell.** `getUiShell()` is hard-wired to
   `'next'`, so ~19 route files carry **unreachable** classic `else`-bodies (~1,040 LOC) that duplicate
   their `*View.ts` builders. These don't render (so they're not the bleed) but they make the code
   confusing, cause the "connected" issues, and are pure deletion → **Phases 2–3**.

---

## Root cause of the bleed (Phase 1 target)

`app/public/styles.css:5-6` imports `styles-base-widgets.css` (130 KB, "recovered from the classic
stylesheet") **first**, which is **wholly unscoped**:

- a **light `:root`** (`styles-base-widgets.css:14-40`: `--bg:#f5f7fa; --card:#fff; --ink:#1b2430`),
- a **light `.pupil-body` theme** (`:1162-1190`),
- **~145 hard-coded literal light backgrounds** (`background:#fff/#fe…`).

`styles.css` then redefines `:root` dark (cascade wins for *token-driven* rules) and hand-maintains a
**~151-rule "Legacy-widget compatibility layer"** (`styles.css:3050-3359`, the source of most of its 322
`!important`s) that repaints specific widgets dark. **But that layer covers only ~309 of ~754 widget
classes** — every uncovered widget that carries a literal light background renders white-on-dark. That gap
*is* the bleed. The maintainer already half-knows this (`styles.css:110-126` is a hand-written `inherit`
workaround for the `.pupil-body` leak).

Two concrete, verified live leaks:
- **`.cards-page` selector bug** — `styles.css:3071` uses a *descendant* selector
  `body[data-shell="next"] .cards-page`, but `.cards-page` is on the `<body>` itself
  (`pupils.ts:385`, `pupilWork.ts:646`, `lesson.ts:1661`). A descendant selector never matches its own
  root, so the classic `.cards-page{background:#fff}` (`styles-base-widgets.css:1360`) wins → login-cards,
  answer-pack and cover-print pages render white. (The sibling `.deck` does it correctly with a *compound*
  `body.deck` at `styles.css:3319`.)
- **`.task-controls select/input`** (`styles-base-widgets.css:321 background:#fff`) — no override in
  styles.css; rendered live by `taskView/eventView/recurringView/capturedView`.

---

## Phase 1 — Stop the CSS bleed (the user-visible fix)

### 1a. Quick wins (small, high value — do first)
- **Fix the `.cards-page` selector**: add a compound `body.cards-page` (or `body[data-shell="next"].cards-page`,
  no space) dark rule mirroring `body.deck` at `styles.css:3319`, with an `@media print { … #fff … }` override
  (these are print pages — white is correct *on paper*, dark on screen). `styles.css:3071`.
- **Patch the handful of uncovered live literals** that bleed today (e.g. `.task-controls select/input`)
  by tokenising or adding to the compat layer.
- **Reword the stale comment** `styles.css:3050-3055` ("the next shell deliberately imports the classic
  stylesheet *while routes are migrated*") — the import is now unconditional and load-bearing, not a
  temporary crutch.

### 1b. Durable fix (larger — the real cure)
**Tokenise the ~145 literal backgrounds** in `styles-base-widgets.css` to CSS vars
(`var(--surface)` / `var(--card)` / `var(--bg-soft)`), so the dark `:root` override in `styles.css:8`
actually reaches them — then **retire most of the ~310-line compat layer** (`styles.css:3050-3359`) and a
big chunk of the 322 `!important`s. This converts the brittle whack-a-mole into one themed source of truth.

> ⚠️ Method note: the prior "~56 provably-dead widget classes" list is **unreliable** — a literal grep
> false-positives on runtime-built class names (`tt-kind-${k}` at `timetable.ts:96`, `sg-badge-${…}` at
> `safeguardingView.ts:16` are both LIVE). Re-verify any "dead class" with a *prefix/interpolation-aware*
> grep before deleting.

### Safe CSS deletions (verified dead, after 1b lands)
- Classic Rail & Stage shell block `styles-base-widgets.css:61-93` (`.app`, `.app-bare`, `.rail-wrap`,
  `.rail` + descendants) — live shell uses `.scaffolded-ribbon`/`.ribbon-link`. **Keep `.brand` (line 72,
  live in `ta.ts:30`)**; `.rail-exp` (91) is harmless.
- `.stage`/`.stage-top` (`:104-106`), `@media` rail-collapse (`:115-120`), print remnants (`:642,644`).
- Duplicate base layer in widgets — `@font-face` (`:3-12`), `box-sizing` (`:52`), `body` (`:54-59`),
  `:focus-visible` + reduced-motion (`:124-125`) — all byte-identical to `styles-base.css` (the import order
  makes the base copy win anyway).
- Verbatim deck block `styles-base-widgets.css:832-871` (dup of `styles.css:3319-3358`). **Stop at 871** —
  `.md-doc` core (`:805-820`) and `.oc-block` (`:872-879`) are NOT duplicates and are live.

### Do NOT touch (load-bearing, lives only in the widget sheet)
- **Type/sizing tokens** `--fs-body`, `--fs-meta`, `--rail-w`, `--fs-hero`, `--tap` (`:14-39`) — used live;
  styles.css does **not** define them.
- **A11y scalers** `html[data-font="system"]`, `data-fontsize` (`:48-50`) — drive the teacher text-size/font
  controls (`html.ts:89`, `app.js:329`).
- **Dyslexic rule** (`:1475`) for pupil pages; **`styles-base.css`** (the canonical 25-line reset) whole.
- **Pupil dark theme** `[data-theme="dark"]` (`styles.css:1309-1360`) — live via the pupil moon button
  (`pupilAuth.ts:50` → `pupil.js:47`). (`html.ts:65` is the *teacher contrast* toggle — also live.)

---

## Phase 2 — Delete the dead `ui_shell` classic shell (the big mechanical win)

`getUiShell()` always returns `'next'` (`nav.ts:108-110`). Every guard below is **always-true** and its
classic `else`/fall-through is **unreachable** — provable, behaviour-preserving deletion.

**Order is mandatory:** unwrap the route guards (2a) *before* deleting the flag functions (2c), and clean
the 3 test files in the *same* commit as 2c or the build breaks.

### 2a. Unwrap the 17 always-true guards + delete dead classic bodies (~1,040 LOC)

| File | Guard | Dead body | ~LOC |
|---|---|---|---|
| `settingsPage.ts` | :84 | L131-340 | 210 |
| `setup.ts` | :416 | L452-469 + 6 forked tab renderers (see 3a) | 340 |
| `ta.ts` | :275 | L323-371 + `renderLessonBlock`/`renderMyLessons` | 130 |
| `markModal.ts` | :192 | L209-254 + helpers + dead `rowsHtml`/`checksHtml` (140-190) | 95 |
| `me.ts` | :257 | L292-351 + orphaned helpers (3a) | 60 |
| `kit.ts` | :66 | L69-109 → delegate to `renderKitPageNext` | 50 |
| `schemes.ts` | :242 | L255-289 | 37 |
| `now.ts` | :177 | L208-238 + orphaned imports (3a) | 31 |
| `markingPage.ts` | :82 | L87-99 + `pill`/`rowHtml` | 28 |
| `tasks.ts` | :43 | L55-69 | 15 |
| `timetable.ts` | :110 | L123-136 | 14 |
| `captured.ts` | :37 | L68-78 | 11 |
| `safeguarding.ts` | :23 | L28-35 | 8 |
| `concepts.ts` | :30 & :49 | two guards → bare `renderConceptsNext` | 6 |
| `lesson.ts` | :814 | unwrap (dedent 815-851) | — |
| `lesson.ts` | :938 | **simplify** to `if (edit === 'off')` (keep the markdown-editor `else` at 950+) | — |

After each unwrap, drop the now-unused `import { getUiShell }` from that file.

### 2b. Dead `getUiShell` imports with no guard at all (delete the import line)
`pupils.ts:18`, `pupilAuth.ts:14`, `resources.ts:7`, `pupilWork.ts:28`.

### 2c. Retire the flag machinery (last)
- `nav.ts:94-110` — delete the `UiShell` type, `uiShell` var, `getUiShell()`, `setUiShell()`, stale comment.
- `html.ts:25` — delete the unused `const shell = getUiShell()`; drop `getUiShell` from the line-1 import
  (keep `data-shell="next"` literal at :92).
- `settingsView.ts:75,119` + `settingsPage.ts:125` — drop the dead `getUiShell` option field/destructure/arg.
  Also `settingsPage.ts:20` `setUiShell` import is already dead.
- `server.ts:411` — delete the `setUiShell(getSetting('ui_shell'))` prime + its import (`server.ts:73`).
- `seed/testData.ts:466` — delete `setSetting('ui_shell', …)`. **Keep migration `0058`** (idempotent,
  already applied — never delete an applied migration).
- `settingsPage.ts:378-379` — delete the orphaned ui_shell-toggle comment (KEEP the
  `/settings/experience-nudge/dismiss` route at :383 — it's live).

### 2d. Test files that MUST be updated in the same commit as 2c
- `tests/nav.test.ts` — imports `setUiShell`/`getUiShell` (14-15, reset 27), `ui_shell` describe block
  (124-139), and asserts on `.tier` (31-33, see 3c).
- `tests/overhaul.test.ts:4` — `ui_shell` describe block (6-15).
- `tests/integration/overhaul.int.test.ts:6,9,19,39,40`.

---

## Phase 3 — Collapse the orphaned duplicates (after Phase 2 unwraps)

### 3a. Helpers orphaned by the dead-body deletions (delete; live twins already exist in `*View.ts`)
- `setup.ts`: `yearTab`/`dayTab`/`peopleTab`/`coursesTab`/`groupsTab`/`timetableTab`/`yearPicker`/
  `TAB_LABELS`/`save()` — all forked copies of `setupView.ts`. Keep `TABS`/`Tab`/`applyModelNotice` (live).
- `me.ts`: `feedbackWidget`/`resultsCard`/`chipRow`/`FACES` — dup'd in `meView.ts`. Keep `ACTIVITY_CHIPS`,
  `doneBlock` (live).
- `markModal.ts`: `markControl`/`statusBadge` + the `rowsHtml`/`checksHtml` precompute (140-190) + drop the
  `type PupilMarkRow` token from the line-17 import.
- `markingPage.ts`: `pill`/`rowHtml` + the now-unused `markOpenAttrs` import (line 10).
- `now.ts`: drop imports used only by the dead body — `renderTimerBanner` (22),
  `renderMorningBrief`/`renderNeedsMe`/`renderCurrentInterests`/`renderDayCard` (41-44), `EXPERIENCE_NUDGE_AT`
  (14). **Keep `renderStrip`** (live at `/now/clock`).
- `conceptsView.ts`: delete `renderPage` — **lines 29-48 ONLY** (mapper said 29-57 — that would destroy the
  live `ConceptsNextData` + `renderConceptsNext`).
- `schemes.ts`: drop the `renderSchemeControls` import (the function itself in `schemeView.ts` is **live** —
  do not delete it).

### 3b. Backend exact-duplicate helpers (independent of the UI work)
- `esc()`+`ENTITIES` dup'd in `nav.ts:130-140` (copy of `html.ts:3-14`) → extract a leaf `lib/esc.ts`,
  import in both (avoids the html↔nav import cycle). **Required**, not optional.
- `fmtShort` (`oversee.ts:19-23`) **and** `mondayOf` (`oversee.ts:14-17`) → import from `timetableView.ts`.
- `fmtMin` (`nowView.ts:155-159`) → use `fromMinutes` from `lib/time.ts` (swap the one call at `:180`).
- 16 unused LLM-schema `z.infer<>` aliases in `llm/schemas/*.ts` (cosmetic, safe).
- `renderResourceList` (`resourceView.ts:68-71`) — dead, safe.
- Optional/low value: a `jsonForScript()` helper for `nav.ts:228`+`resources.ts:122`; consolidating the 16
  `Intl.DateTimeFormat('en-GB')` formatters into `lib/time.ts` (option-set variance → medium care).

### 3c. Vestigial nav model fields
`NavTier` type + per-item `tier` are never read by the rewritten `renderRail` (hardcoded tiers). Removing
`tier` also requires updating `nav.test.ts:31-33`. The `experience` param of `renderRail` (`nav.ts:143`) is
unused — drop it + update call sites (`html.ts:95`, `nav.test.ts:44,56`). Low priority.

### 3d. Dead client JS
- `app.js:365` — trim the dead `.rail`/`.rail-foot` selectors to `'.scaffolded-ribbon a.ribbon-link[href]'`.
- `app.js:375-376` — delete the unreachable `.rail-sec`/`active-within` branch (keep the `#ribbon-drawer`
  reveal at 377-378).
- `pupil.js:60-65,76-77` — dead teacher-id deck fallbacks (`#slide-prev-btn` etc.) — low priority.

---

## Phase 4 — Owner decisions (behaviour changes — NOT silent deletions)

- **TA feedback on the lesson cockpit.** `lesson.ts:310-320 renderTaFeedback` + the `taFbByOc` pipeline
  (`:806-807`, threaded to `lessonView.ts:178` but never read) are dead — but the *classic* page showed TA
  feedback and the cockpit silently doesn't. Decide: restore it to the cockpit, or confirm it's intentionally
  dropped before cutting the data pipeline.
- **Slide-deck "Listen" button drift.** `renderSlideDeck` exists twice — `me.ts:145` (no speak button, used
  by teacher preview/present via `lesson.ts:87`) and `meView.ts:78` (has the 🔊 button, used by pupil `/me`).
  Consolidating to the `meView` copy **adds the speak button to teacher preview/present** (a behaviour change)
  and requires re-pointing both `lesson.ts:87` **and** `tests/slideTeacherNotes.test.ts:3`.
- **Test-only seams** — do not blind-delete: `lib/focusMode.ts` (`FocusModeManager`, mirrors inline app.js
  logic for tests) and ~17 repo/service functions reachable only from tests (`linkResource`,
  `dequeueOpenMark`, `calculateCountdown`, the `getReview`/`setReviewStatus`/`claimOpenReview` trio — looks
  like an unfinished review-claim flow). Each is a deliberate seam or an abandoned feature — confirm per item.

---

## Phase 5 — Repo hygiene

- **`git rm app/test_out.txt`** (97 KB tracked Vitest scratch — unreferenced) and add `app/test_out.txt`
  (or `*test_out*`) to `.gitignore`.
- **`ui-overhaul-prototypes/`** (33 tracked files, 620 KB design mockups) — runtime-dead (outside
  `app/public`, zero refs). Recommend `git mv` to `docs/archive/` rather than delete (design history). *Ask
  first.*
- **Stale docs** that now describe the dead dual-shell as live and name the gone `styles-overhaul.css` /
  `app-overhaul.js` assets — banner or update: `docs/CODEBASE_AUDIT_2026-06-21.md` (keep as a lead),
  `docs/ui-design/{BACKEND_CHANGES_FOR_UI,WORKING_MODEL,UI_BACKEND_ASKS}.md`, `PROJECT.md`. `CHANGELOG.md`
  already carries the accurate note; `ORIGINAL_REQUEST.md` is a frozen record — leave it.
- `tests/overhaulStyles.test.ts` already points at the live `public/styles.css` — only its filename is a
  vestige (optional rename).

---

## Suggested execution order

1. **Phase 1a** — the visible bleed quick-wins (cards-page selector + literal patches). *Fast, high value.*
2. **Phase 2** — unwrap guards → delete classic bodies → retire flag + fix tests. *Big LOC drop, low risk.*
3. **Phase 3** — collapse orphaned duplicates + backend dup helpers.
4. **Phase 1b** — the CSS tokenisation (the durable cure; larger, do with care).
5. **Phase 4** — surface the behaviour-change decisions to you.
6. **Phase 5** — hygiene.

Every phase is independently shippable and gated by `cd app && npm run typecheck` + `npm test` +
`npm run test:integration`.
