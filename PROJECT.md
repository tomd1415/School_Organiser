# Project: School Organiser UI Shell Overhaul

## Architecture
- **Configuration & Flag Gating:** Settings are persisted in the PostgreSQL `settings` database table. On startup, the value is cached in-memory and read/written synchronously via `getUiShell()` / `setUiShell()`. Fastify routes `POST /settings/ui-shell` update both the DB and cached state.
- **Main Layout Seam:** In `app/src/lib/html.ts`, the `layout()` function acts as the main seam. If `ui_shell === 'next'`, layout rendering branches to a new helper `nextShell(...)`.
- **Assets Isolation:** `nextShell(...)` loads separate assets `public/styles-overhaul.css` and `public/app-overhaul.js` to ensure the new and classic layouts do not collide.
- **Collapsible Ribbon Navigation:** In `app/src/lib/nav.ts`, `renderRail()` outputs a 3-Tier vertical collapsible ribbon (Tier 1: Urgency & Safety, Tier 2: Daily Operations, Tier 3: Prep & Advanced) if the active shell is `next`.
- **Context Header:** `renderHeader()` in `app/src/lib/nav.ts` renders a dynamic header containing a Left Anchor (What's next), Middle Action Chips (page controls), and a Right Clock (tabular monospace clock).
- **Client-side Overhaul Script:** `app-overhaul.js` implements:
  - Expanding edge-hover ribbon navigation (collapses to 60px, expands to 200px).
  - Ticking relative event clock with drift verification against system time.
  - Focus Mode toggling (appending `.focus-mode` class to `body`) and persistence.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Codebase Analysis | Verify settings schema, boot priming, existing nav rail layout, and tests. | None | DONE |
| 2 | Feature Flag Gating & Layout Hooking (R1) | Implement layout redirection, body data-shell toggling, and overhaul styles/script loaders. | M1 | IN_PROGRESS |
| 3 | Collapsible Ribbon & Context Header Layouts (R2) | Implement 3-Tier Ribbon and renderHeader() layout. | M2 | IN_PROGRESS |
| 4 | Interactive Client Navigation & Countdowns (R3) | Implement edge-hover, countdown ticking, drift check, Focus Mode toggle/persistence. | M3 | IN_PROGRESS |
| 5 | Testing, Validation & Acceptance (R4) | Add unit and integration tests, verify design requirements, run audit checks. | M4 | PLANNED |

## Interface Contracts
### `html.ts` ↔ `nav.ts`
- `getUiShell(): UiShell` returns `'classic'` or `'next'`.
- `setUiShell(mode: UiShell | string | null): void` sets the active shell in-memory.
- `renderRail(exp: ExperienceMode): string` returns HTML for the ribbon navigation.
- `renderHeader(context: { leftAnchor?: string, actionChips?: string[], authed?: boolean, csrfToken?: string }): string` returns HTML for the top header.
- `layout(opts: LayoutOpts): string` delegates to `nextShell(opts)` if `getUiShell() === 'next'`.

### `app-overhaul.js` ↔ Page DOM
- Ribbon element: expands to `width: 200px` on hover; collapses to `60px` when mouse leaves.
- Ticking clock selector: `.clock-display` or similar element updated client-side every second, verifying actual drift against Date object.
- Focus Mode toggle button: updates `localStorage`/`sessionStorage` and toggles `.focus-mode` on `body`.
