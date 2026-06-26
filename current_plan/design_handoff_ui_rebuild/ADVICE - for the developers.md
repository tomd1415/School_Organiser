# Advice for the developers — School Organiser UI rebuild

Written after reading the **`ui-rebuild`** branch (commit `0a62b24`) against the prototype
(`School Organiser.dc.html`) and `SPEC — UI rebuild.md`. Short version: **the
implementation is tracking the SPEC closely and faithfully** — the six-group rail, the
everyday/power experience tier, Safeguarding pinned in its own group, the 232px rail, the
`renderToggle` pill switch, the width-intent system. This document is the *delta*: small
corrections, a few things the prototype got wrong about your codebase, and the handful of
real features the prototype was missing (now added). Read it alongside `SPEC — UI
rebuild.md`, not instead of it.

---

## 1. Things the prototype/SPEC got slightly wrong about your code — fix these in the SPEC's favour of the CODE

- **Token name: it's `--ink`, not `--text`.** The SPEC §0 token table says body text =
  `--text`; your `styles-base.css` uses **`--ink`** (with `--bg`, `--surface`, `--line`,
  `--accent`, `--teal`/`--green`/`--amber`/`--red`/`--quiet`, `--radius`, `--target`,
  `--font-ui`, `--fs-body`). Treat the **code** as the source of truth for token names;
  the prototype's hex/oklch literals are only a visual reference — never paste them, always
  resolve to the `:root` custom properties. (I've left the SPEC table as-is for the visual
  mapping, but `--ink` is the correct variable.)
- **Use the `width` intent, not per-view width classes.** `nextShell({width})` already
  takes `'reading' | 'working' | 'wide' | 'full'` and applies `cockpit-w-*` to `<main>`.
  Set it per screen rather than adding views to legacy width class-lists. Suggested
  intents: **reading** → Settings, Captured, Club, Free, TA, Planner, Time; **working** →
  Tasks, Focus, Events, Map, Coverage, Concepts, Recurring, Oversee, Safeguarding;
  **wide** → Notes, Resources, Pupils; **full** → Timetable, Kit (wide tables), Lesson
  cockpit, board screen.
- **Toggles: always `renderToggle()`.** You already built the SPEC §3 pill switch as a
  real keyboard-accessible `<input type=checkbox>`. Use it for every on/off in the
  prototype (Settings AI/TA, **Recurring pause**, anything new) — don't hand-roll the
  prototype's `<button aria-pressed>` version; the real `<input>` keeps native semantics
  and HTMX `change` posts.

## 2. Don't build these prototype items as rail destinations — they aren't in your nav model

The prototype's left rail has three items that your `NAV_MODEL` (correctly) does **not**
expose as top-level pages. The prototype is the over-eager one here:

- **"Radar" (class risk board).** This is a *prototype proposal*, not a repo feature. It's
  a deterministic, no-AI cohort-attention board. Decide deliberately whether you want it;
  if yes it belongs in CLASSES, `tier:'power'`, and must stay **rules-only** (never an AI
  prediction about individuals). If no, drop it — nothing in the app depends on it.
- **"Planning" as its own rail item.** In your code the planning assistant (draft /
  summarise / redesign) is reached from **Schemes** and the **lesson cockpit**, not a
  standalone nav page. Keep it contextual unless you specifically want a hub page.
- **"Cover" as its own rail item.** Your model has **no Cover page** — cover is a
  *lesson-exception state* surfaced via the effective-room badge, the `/free` workspace and
  the cover dot, plus recurring cover-availability. Don't add a Cover rail link; the
  prototype's "Cover" screen is only a reference for how cover info reads on a cell/lesson.

Also: prototype **"Year setup"** = your route **`/setup`** (same screen, different label).

## 3. Real features the prototype was MISSING — now added to the prototype

These exist in `ui-rebuild` but had no prototype screen. I've added reference screens so
the prototype is complete; build the real ones to match your routes:

| Added to prototype | Your route | Rail placement | Notes |
|---|---|---|---|
| **Concepts** | `/concepts` | CURRICULUM · power | standing teaching concepts: misconception + "use instead", linked lessons/spec points |
| **Recurring** | `/recurring` | RECORD · power | per-lesson / weekly / dated cadence, **pause** toggle, next-occurrence |
| **Time** | `/time` | SETUP · power | week-level planned-vs-actual report (distinct from today's Planner) |
| **Club session** | `/club` | *contextual* (timetable club cell) | free-text "where everyone got up to" + session history; **not a lesson** |
| **Free period** | `/free` | *contextual* (free slot) | earmark tasks to the (date, slot); flip slot back to teaching |
| **TA view** | `/ta` | *separate TA login* | read-only current lesson, effective room, **no pupil names / notes / nav**, send-feedback box |

Club/Free/TA are **contextual surfaces, not rail items** — Club opens from a club
timetable cell, Free from a free slot, TA from the separate TA password login. The
prototype routes them by screen for demo; wire them to those entry points in the build.

## 4. Carry-overs the CHANGELOG itself flagged as at-risk

- **ATL wiring into the "next" shell.** The 2026-06-21 ATL entry warns: *"the classic
  shell carries the wiring — the in-progress 'next' shell view files will need the same
  additions."* The prototype shows the canonical placement: a **1–4 picker in the marking
  modal** (beside each pupil) and it implies the live whole-class grid (`/lesson/oc/:id/atl`).
  Make sure both reach the next-shell `lessonView.ts` / `markModalView.ts`, colour-coded
  1 (concern) → 4 (excellent), saved instantly.
- **Readiness dots legend.** Your timetable already renders 🟣 (no developed plan) / 🔵
  (resource image placeholder to fill) / 🔴 (no scheme); the prototype timetable now mirrors
  that legend. Keep the three meanings + the gentle purple flash, and the calendar-aware
  greying of holidays/INSET.
- **Cockpit adaptation editor.** It was *lost in the migration and restored*
  (`GET /lesson/adapt/:gc/:lp`). The prototype's Edit-this-class / Edit-master modes +
  scope strip are the intended model — keep override-else-master per field with the
  change-log, and don't let it regress again when the cockpit is re-styled.

## 5. Lesson cockpit layout (recently refined in the prototype)

- **Keep the top light.** Above the board mirror: only the status line, the View /
  Edit-class / Edit-master modes, the plan bar (with "last time → stopped at…"), and the
  split-course tabs. Everything actionable moved off the top.
- **Right vertical icon rail** (sticky, ~50px): Board screen (primary), View-as-pupil,
  Presenter, Print, Plan tools, Focus (toggle). Icon buttons with `title` + `aria-label`.
- **Side info column is masonry** (`column-width:~320px`) so Who-needs-you / timer / live
  work / groups / TA feedback / resources pack in without shrinking the board. The board
  mirror's column width is **pinned** — never trade board size for density.

## 6. Non-negotiables to preserve (you're already doing this — keep it)

- **No pupil name ever reaches an AI service** → `PUPIL_n` tokens; redaction is
  **fail-closed** with an egress assert (`redact.ts`). Safeguarding-flagged worksheet
  answers and flagged captures/notes are **withheld from AI entirely** and routed to the
  teacher-only register; the safety-gate canonicalises text before matching
  (`markSafetyGate.ts`). Every AI call is redacted + audited and reserved against the
  monthly cap *before* the provider call. The prototype shows the UI affordances (the 🔒
  private-note checkbox, the "withheld from AI" banners) — **the server rules in
  `redact.ts` / `markSafetyGate.ts` / `markModalView.ts` remain the source of truth**, not
  the prototype.
- **Autosave-on-blur, never lose typed work.** Forms only `reset()` on a genuine success
  (`window.htmxSaved` reading the response header); the per-field "not saved" warning is
  keyed per element (the BUG-013/033/053 fixes). Any new prototype form (Club record, Free
  notes, TA feedback) must use that exact pattern.

## 7. Accessibility & responsiveness (match the shell you've built)

- The rail-foot **a11y panel** (text size A/A+/A++, contrast Standard/High, font
  Legible/System) persists via `localStorage` + `data-*` on `<html>` — every new screen
  must work at A++ and High-contrast. `:focus-visible` 3px accent outline everywhere;
  honour `prefers-reduced-motion`.
- **Both orientations, no overflow.** `<body data-orientation>` is already there; keep
  2-up grids collapsing to one column in portrait/≤1024px, and wide tables (timetable,
  kit, scheme matrix) inside `overflow-x:auto` with a `min-width`. Verified in the
  prototype at 1080×1920 and 1920×1080.
- Minimum 44px (`--target`) hit areas; 24px floor on slide/board text.

## 8. Process notes

- **`NAV_MODEL` is the single source of truth** for the rail *and* the `g`+letter jump
  map (`window.__NAV__`) — keep adding pages there so the two can't drift. Active state is
  applied client-side by `app.js`; keep `renderRail` path-free.
- **`uiGallery` route is a good habit** — keep a living component gallery so the SPEC §0
  vocabulary (`.badge`/`.chip`/`.card`/`.rail-dot`/toggle/count-pill) stays single-sourced.
- **Build from `SPEC — UI rebuild.md` screen-by-screen.** Per-screen detail (layout, copy,
  states, behaviour) lives there; this doc is only the corrections + the missing-feature
  delta. When the two disagree about your codebase, the **code wins** (e.g. `--ink`, the
  no-Cover-page nav).

---

### Quick status read (prototype ↔ branch)

Built & faithful: Now, Timetable (+ readiness dots), Lesson cockpit, Marking (+ ATL),
Safeguarding, Captured, Notes, Events, Tasks, Focus, Planner, Schemes, Map, Resources,
Coverage, Pupils, Kit, Settings, Oversee, Setup/rollover, pupil `/me` workspace.
Now also in the prototype: **Concepts, Recurring, Time, Club, Free, TA view**.
Prototype-only proposals to accept or drop: **Radar**, standalone **Planning** hub,
standalone **Cover** page.
