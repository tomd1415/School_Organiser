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

**Next:** Notes (`/notes`, SPEC §2) → Events (`/events`, SPEC §7), then the other groups.

Order: **RECORD** (Captured ✓ → Notes → Events) → **TODAY** (Tasks → Marking → Oversee → Focus → Planner →
Timetable → Now) → **FLAGGED** (Safeguarding) → **CURRICULUM** (Resources → Coverage → Map → Schemes) →
**CLASSES** (Pupils) → **SETUP** (Kit → Settings → Setup) → **Lesson cockpit** (own pass) → pupil `/me`.
Per-screen pattern: extract any inline route-render into a `*View.ts`; redesign to the SPEC section using the
shared components; URLs via `paths.ts`; add a gallery fixture; screenshot-verify both orientations; full gate.

Inline-rendered screens to extract first (no View file yet): Focus, Planner, Oversee, Map, Coverage; the header
(`/header-overhaul`) is also a route-inline render.
