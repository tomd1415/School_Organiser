# Handoff: School Organiser — UI rebuild

## Overview
A ground-up rebuild of the School Organiser teacher "command centre" UI: a calm dark
**Rail & Stage** shell (persistent grouped left rail + one content stage) with an
Everyday↔Power experience toggle, covering every teacher-facing destination — Now,
Timetable, Lesson cockpit, Marking, Safeguarding, Tasks, Focus, Planner, Cover, Captured,
Notes, Events, Schemes, Planning, Map, Resources, Coverage, Oversee, Radar, Pupils, Kit,
Year setup, Settings — plus the pupil worksheet workspace (test-pupil overlay).

The goal of the rebuild was to replace the cluttered, organically-grown UI with a
predictable, orientation-safe one (works in **landscape 1920×1080 and portrait 1080×1920**
with no off-screen overflow) and to put every control where a teacher would expect it.

## About the design files
The files in this bundle are **design references created in HTML** — a prototype showing
the intended look and behaviour, **not production code to copy directly**. The task is to
**recreate these designs in the existing School_Organiser codebase** using its established
patterns: TypeScript / Fastify 5 / PostgreSQL, **server-rendered HTML + vendored HTMX**,
Zod, layering `routes → services (pure) → repos`. Styling belongs in the existing
`app/public/styles.css` (`body[data-shell="next"]` dark scope) using its CSS custom
properties — **do not ship the prototype's inline styles**; map them to the repo tokens
(table below and in `SPEC — UI rebuild.md`).

The prototype is a single self-contained file built as a "Design Component"; its internal
framework is irrelevant to the build — read it for layout, copy, states and interaction
logic, then implement each screen as an HTMX-served fragment.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, component states and interactions
are all intended as shown. Recreate the UI faithfully using the repo's existing widgets and
tokens. Where the prototype's clean palette differs from the repo, **prefer the repo
tokens** — they already carry the high-contrast theme.

## Screens / Views
Per-screen detail (layout, components, copy, states, behaviour) lives in
**`SPEC — UI rebuild.md`** (bundled). It documents all 17 screen specs plus the shared
shell and the navigation model. Summary of what's covered there:

| # | Screen | Route | Notes |
|---|---|---|---|
| 0 | Shared shell & nav | — | rail, header, responsiveness rules, token map |
| 1 | Captured | `/captured` | AI-filed brain-dump, resurface triggers, safeguarding withheld |
| 2 | Notes | `/notes` | knowledge base, link chips, kind filters |
| 3 | Settings | `/settings` | School/AI/TA/Email/Password/Data-health, inline autosave |
| 4 | Tasks | `/tasks` | inbox/triage/scheduled/done, paste-email |
| 5 | Focus | `/focus` | one-thing-now + wind-down |
| 6 | Planner | `/planner` | time blocks, planned↔done↔diverted, actuals |
| 7 | Events | `/events` | grouped by how-soon |
| 8 | Curriculum map | `/map` | term calendar, holiday-aware, continue-next-week |
| 9 | Coverage | `/coverage` | spec-point backbone, covered/partial/gap |
| 10 | Resources | `/resources` | hosted store, type filters, versions |
| 11 | Pupils | `/pupils` | rosters, ability midpoint, AI-privacy banner |
| 12 | Equipment / Kit | `/kit` | inventory table, Work<Own red, stock-take |
| 13 | Oversee | `/oversee` | TA-led lessons you prepare + oversee (flow 7) |
| 14 | Radar | `/radar` | deterministic class attention board (prototype proposal) |
| 15 | Planning assistant | `/planning` | Draft/Summarise/Redesign, review-before-save |
| 16 | Year setup | `/setup` | timetable editor, Sept rollover, onboarding, data&safety |
| 17 | Lesson cockpit | `/lesson/:id` | board mirror, flow tracker, right icon rail, modals |
| — | Pupil workspace | `/me` | test-pupil overlay renderer (behind DPIA gate) |
| — | Now / Timetable / Marking / Schemes / Safeguarding | various | also built |

## Interactions & behaviour
- **Autosave everywhere** (notes, actuals, settings, kit cells) — save on blur / change,
  no Save button. Show a transient "✓ Saved" affordance.
- **Now strip** auto-refreshes ~30s with a signature; only the strip reloads unless the
  signature changes; the note composer is never wiped.
- **Keyboard:** `n` quick note, `/` command palette, `g`+letter jump (per repo UX_FLOWS).
- **Experience toggle** (Everyday↔Power): power-only pages are Coverage, Radar, Pupils,
  Kit, Year setup. Switching to Everyday on a power-only page falls back to Now.
- **Lesson cockpit** right icon rail: Board screen / View-as-pupil / Presenter / Print /
  Plan tools / Focus (toggle). Tappable step tracker writes the stopping point. Edit-this-
  class vs Edit-master = override-else-master per field; scope strip appears on shared edits.
- **Marking:** suggested mark + evidence, teacher confirms; ATL; prev/next; "Review" routes
  to safeguarding. Results held until release.
- **Safeguarding / privacy (non-negotiable):** flagged worksheet answers and flagged
  captures are **withheld from AI entirely** and land in the teacher-only register; no pupil
  name is ever sent to AI (roster names → `PUPIL_n`); every AI call is redacted + audited.
- **Responsive:** 2-up grids collapse to 1 column in portrait / ≤1024px; wide tables
  (timetable, scheme matrix, kit) scroll inside `overflow-x:auto` wrappers; rail becomes a
  top strip ≤720px. Verified at 1080×1920 portrait and 1920×1080 landscape.

## State management
Prototype state that maps to real server/session/UI state:
- `screen` / route (Now is home), `experience` (everyday|power) — persist per-teacher.
- Lesson cockpit: current slide, slide-lock, step-progress array, edit-mode
  (view/class/master), focus-mode, class timer, open-modal.
- Marking: current pupil index, mark value, ATL value.
- Filters: captured category, notes kind, coverage (all/covered/gaps), resource type,
  pupil class, task tab.
- Toggles: AI-enabled, TA-enabled (Settings), note safeguarding flag.
- Pupil workspace: auth stage, text-size index, easy-read, high-contrast, per-question
  hint open, saved/done flags.
Data needs are the existing repo entities (occurrences, plans, adaptations, tasks, notes,
events, resources, kit, pupils, ai_calls, etc.) — see `docs/DATA_MODEL.md` in the repo.

## Design tokens
Map the prototype's clean palette to the repo's `:root` tokens (`app/public/styles.css`):

| Prototype | Repo token | Use |
|---|---|---|
| `#0e141b` | `--bg` / `--bg-soft` | page background, inset wells |
| `#11181f` | `--rail` / `--bg-soft` | rail, header |
| `#141d26` | `--surface` | cards |
| `#1a232d` / `#1d2a35` | `--surface-2` / `--surface-3` | buttons, active nav |
| `#232c37` | `--line` | borders |
| `#2a333f` | `--line-strong` | input borders |
| `#e7ebf0` | `--text` | body text |
| `#9aa4b0` | `--muted` | secondary text |
| `#5f6b78` / `#7c8693` | `--quiet` | labels, captions |
| `oklch(0.72 0.1 200)` | `--teal` / `--accent` | primary accent + buttons |
| `oklch(0.7 0.12 155)` | `--green` | success / on-track / saved |
| `oklch(0.78 0.12 75)` | `--amber` | warn / marking / diverted |
| `oklch(0.78 0.13 25)` | `--red` | safeguarding / danger |
| radius 14px cards / 8–10px controls | `--radius` / `--radius-sm` | radii |
| 44px min target | `--target` | every button/input |

Type: **Atkinson Hyperlegible** (already self-hosted in repo) for UI; a monospace
(`ui-monospace`) for clock, times, counts, versions, codes. Base 16px / line-height ~1.45.

## Assets
No image assets — the prototype uses text, CSS shapes, and a few emoji glyphs as icons
(🖥 👁 🧑‍🏫 🖨 ⚒ ◳ ⚑ etc.). In the build, swap emoji for the codebase's icon set where one
exists. Fonts are already in the repo (`app/public/fonts/`). The board-mirror slide preview
is a striped placeholder — real slides come from the resource store.

## Files
- `School Organiser.dc.html` — the full interactive prototype (all screens + pupil overlay).
- `support.js` — runtime for the prototype (reference only; not for the build).
- `SPEC — UI rebuild.md` — the detailed per-screen specification + nav model + token map.
- Reference the repo's own `docs/UX_FLOWS.md`, `docs/DATA_MODEL.md`, `docs/SPECIFICATION.md`
  alongside this — the prototype follows those flows.
