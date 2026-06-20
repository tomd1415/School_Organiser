# Original User Request

## Initial Request — 2026-06-21T00:11:03+01:00

Overhaul the global shell and navigation of the School Organiser web application into a neurodivergent-supportive "Unified Cockpit" (collapsible Left Ribbon navigation + dynamic Context Header), running behind the `ui_shell` feature flag (Option A: Stage 1 and Stage 2 only).

Working directory: /home/duguid/projects/School_Organiser
Integrity mode: development

## Requirements

### R1. UI Shell Feature Flag Gating
- Read/write the `ui_shell` setting value (`classic` | `next`) in the settings database table and Fastify settings routes.
- Prime the setting at boot in `server.ts` and expose it synchronously via `getUiShell()` / `setUiShell()` in `nav.ts`.
- In `html.ts` `layout()`, render `<body data-shell="classic|next">` as the main seam. 
- When `ui_shell` is `next`, load the separate `public/styles-overhaul.css` and `public/app-overhaul.js` files so that old and new styles/scripts do not collide.

### R2. Collapsible Ribbon & Context Header Layouts
- Modify `nav.ts` `renderRail()` to output a 3-Tier vertical collapsible ribbon structure (Tier 1: Urgency & Safety, Tier 2: Daily Operations, Tier 3: Prep & Advanced) when `ui_shell` is `next`.
- Implement `renderHeader()` in `nav.ts` to output a dynamic header containing:
  - **Left Anchor:** "What's next" lesson coordinates and time anchor.
  - **Middle Action Chips:** Page-specific action controls.
  - **Right Clock:** A large tabular monospace clock.
- Inject the ribbon and header layout into the page shell when `ui_shell` is `next`.

### R3. Interactive Client Navigation & Countdowns
- Implement expanding edge-hover ribbon navigation inside `public/app-overhaul.js`.
- Implement client-side countdown timer ticking (JS interval) for upcoming timetabled events in the top header. The script must periodically verify correctness against the client system clock to prevent interval drift.
- Implement persistent Focus Mode state. When toggled, append `.focus-mode` class to the body, and store the preference in setting/session storage so that the simplified view persists across page loads.

## Verification & Acceptance Criteria

### Automated Tests
- [ ] Run `npm run typecheck` to confirm zero TypeScript compilation errors.
- [ ] Run `npm test` and `npm run test:integration` to ensure zero regressions in existing behavior.
- [ ] Write new automated tests in the test suite (`app/tests/`) verifying:
  - `ui_shell` database settings toggle route functionality (`classic` vs `next` states).
  - Focus Mode persistence and state management.
  - Dynamic relative clock countdown logic and time verification.

### Shell & Navigation Behavior
- [ ] Left ribbon collapses to 60px and expands smoothly to 200px on hover, maintaining spatial stability.
- [ ] Top header displays correct countdown labels ("starts in 35 mins") updating client-side.
- [ ] Focus Mode hides the sidebar navigation rail and distracting elements, persisting state across page navigations.
- [ ] Toggling the preview flag off reverts the application shell to "classic" Rail & Stage layout instantly.
