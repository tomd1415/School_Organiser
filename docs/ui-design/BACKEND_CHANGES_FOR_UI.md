# Backend changes the UI overhaul must pick up

A running, **dated** log of backend changes made since the UI handoff (2026-06-20) that the **"next" shell**
needs to mirror or is affected by. The classic shell already carries them.

The next shell = the external UI dev's render path: `src/lib/*View.ts` (e.g. `taView.ts`, `meView.ts`,
`markModalView.ts`, `markingView.ts`, `nowView.ts`, `lessonView.ts`, `settingsView.ts`…),
`public/app-overhaul.js`, and `public/styles-overhaul.css`, selected when the `ui_shell` setting is `next`.

> **Why this file exists.** There are now two render paths — classic `layout()` and `nextShell()` + the
> `*View.ts` files. A backend change wired into the *classic* renderers does **not** appear in the next shell
> until it's mirrored. This log flags exactly what to mirror so nothing silently regresses when the flag flips.
> See also [CONTRACTS_TO_PRESERVE.md](CONTRACTS_TO_PRESERVE.md) (shared class/id/`data-*`/event conventions)
> and the root [CHANGELOG.md](../../CHANGELOG.md) / [BUGREPORT.md](../../BUGREPORT.md).

How to keep it current: when a backend change touches anything the next shell renders, or a shared
class/id/`data-*`/event/route the UI relies on, add a dated bullet with a clear **ACTION**.

---

## 2026-06-21 — Countdown (commitments) + clubs at break/lunch/after-school

### ℹ️ Affects the header countdown + a new route

- **Countdown is now commitment-based.** `resolveNow().nextTeaching` targets the next teaching/form/club/
  duty/meeting (at its effective time), not the next teachable slot — driven by `ClockContext.commitments`
  (supplied by `repos/clock.ts getClockContext`, which now also returns `commitments`). The header's
  `data-epoch-ms` countdown is unchanged in markup; it just resolves to a different (correct) target.
  A free period no longer produces a countdown.
- **New `/club` route** (`routes/club.ts`) — a club session screen (record + history), NOT the lesson
  interface. Timetable **club** cells (`renderLesson`, `lib/timetableView.ts`) now link to
  `/club?lesson=&date=` with class `.tt-club`. Classes: `.club-page`, `.club-record(-label)`,
  `.club-history(-rec)` (in `styles-overhaul.css`). **ACTION (next shell):** reuse these class names if
  you build a bespoke next view; the record textarea autosaves to `/club/record` (HTMX, target
  `#club-status`).
- **Editor (Setup → Timetable)** gains two optional `.tt-ed-time` inputs per lesson row (per-lesson
  start/end override) and shows ＋ on every slot (clubs on break/lunch/after-school). Backend only.

## 2026-06-21 — Timetable readiness dots, free-period workspace, board fill

### ℹ️ New surfaces + a changed timetable link target

- **Timetable cells route by state.** `renderLesson` (`lib/timetableView.ts`) now sends a **free** slot
  (permanent `purpose='free'` OR a dated free/cancelled exception) to **`/free?lesson=&date=`**, not
  `/lesson?...`. Teaching/form still open `/lesson`. New `.tt-is-free` class on those anchors.
- **Readiness dots** render inside teaching cells: `<span class="tt-dots"><span class="tt-dot tt-dot-red|tt-dot-purple|tt-dot-blue">`.
  CSS is in `styles-overhaul.css` (scoped to `body[data-shell="next"]`), purple has a reduced-motion-aware
  flash. Only on the teacher's OWN teaching lessons. Data: `services/lessonReadiness.ts`.
- **New `/free` route** (`routes/free.ts`) — a dedicated free-period screen (NOT the lesson interface):
  period header + a Tasks panel scoped to the `(date, slot)` pair (`period_tasks`, migration `0059`).
  Classes used: `.free-page`, `.free-state`, `.free-tasks`, `.free-task(.done)`, `.free-add`, `.free-new`,
  `.free-pick-list`. **ACTION (next shell):** these render via `layout()` so they inherit the shell; if
  you build a bespoke next view for `/free`, reuse these class names + the `#free-tasks` HTMX target.
- **"Make free" action** added to the lesson cockpit live-bar (`lib/lessonView.ts`) —
  `hx-post="/free/mark"` with `{lesson, date}`; the server replies `HX-Redirect` to `/free`.
- **Board fill (board screen).** `.presentation .pslide.on` / `.slide-content` now flex-fill the screen
  (removed the `max-height:62vh` letterbox). No markup change — `renderBoardNext` is unchanged.

## 2026-06-21 — Lesson slide decks now generate complete + differentiated

### ℹ️ Behaviour change — no render-contract change, just richer decks

- **Decks are now reliably full + levelled.** Generated/adapted slide decks used to often arrive as a 2–3
  slide stub; they're now generated in a dedicated plain-text call (`services/slideGen.ts`) and reliably
  contain the **whole lesson with all three `# 🟢 Support` / `# 🟡 Core` / `# 🔴 Challenge` level sections**
  (typically 20+ slides). **The render contract is unchanged** — still Markdown, one `##` heading per slide,
  depth-1 `#` level dividers (`# 🟢 Support` / `# 🟡 Core` / `# 🔴 Challenge`), and a per-slide private
  teacher-notes blockquote whose first line starts with 🧑‍🏫. So the next shell needs no change to consume them; the level switcher and board will simply now
  always have content for each level.
- **ACTION (confirm only, no change expected):** the next-shell board/presenter render must keep routing
  **every** slide through `splitTeacherNotes` (`lib/slideDeck.ts`) before display — `lessonView.ts` already
  does at the board (≈L211) and presenter (≈L558) paths, and `meView.ts` for the pupil view. That is the one
  safety boundary that keeps the `> 🧑‍🏫` private notes (and the legacy `*Say:*` / `Teacher:` forms) off the
  projector. A `> key idea` callout and a bare 🏫 decoration are pupil-facing and intentionally kept. Don't
  re-implement note-splitting inline — this leaked once before precisely because a view did.

## 2026-06-21 — ATL feature + reopened-audit remediation

### 🟢 Completed in the next shell

1. **ATL styles are present in `public/styles-overhaul.css`.** The new ATL (1–4 attitude-to-learning) picker
   is wired into `markModalView.ts` and `markingView.ts`, and its `.atl*`, `.mm-atl-link`, and `.mk-atl`
   rules are scoped to the next shell.

2. **`window.htmxSaved(event)` is present in `public/app-overhaul.js`.** Shared note and quick-capture forms
   therefore reset only after a genuine successful save, including the server's `app:save-failed` signal.

3. **Dark-mode parity pass completed for incrementally migrated widgets.** `styles-overhaul.css` now defines
   the legacy variable aliases used by next-shell views, supplies a next-shell high-contrast palette, themes
   all standard textual/date inputs, and provides scoped dark surfaces for the remaining classic worksheet,
   pupil, capture, search, pedagogy, safeguarding, and editor widgets. Print output is explicitly restored to
   a light paper-safe palette. `tests/overhaulStyles.test.ts` guards the token bridge and scope.

### 🟢 Already mirrored by the UI dev (no action — just confirm full coverage)

- **Cover/room effective room (BUG-012 / BUG-047).** `taView.ts` already imports `effectiveRoom` ✓. Please
  confirm every other next-shell lesson/daily-print renderer also uses `effectiveRoom(effect, room)` and shows
  the cover/room **badge** instead of the raw timetabled room — otherwise a TA or cover teacher is directed to
  the wrong room. Helper: `effectiveRoom` in `src/services/exceptions.ts`.
- **ATL view wiring.** `markModalView.ts` + `markingView.ts` call `renderAtlPicker` / the `mk-atl` link ✓.

### ℹ️ Behaviour changes to be aware of (no UI change required — just don't fight them)

- **Unsaved-warning keys (BUG-033).** Classic `app.js` `opKey` now stamps a per-element key (no shared `name`
  fallback), so same-name fields don't clear each other's "not saved" warning. `app-overhaul.js` keeps its own
  unsaved tracking (`swallowedFailure` flag + `markUnsaved`) — give it per-element keys too if it falls back to
  `name`/`id`.
- **Pupil answer field validation (BUG-030).** `POST /me/answer` and `/me/answer-image` now reject (400) a
  field key that isn't a real field of the rendered worksheet (the test pupil is exempt). The next-shell
  `meView` renders real worksheet fields via `renderWorksheet`, so this is fine — just don't synthesise field
  keys client-side.
- **Signed image URLs expire (BUG-003).** `/lesson-image/:id` signed URLs now carry `&e=<expiry>` and expire
  (~12h). `signLessonImages(html, now)` gained a `now` argument (the server passes `Date.now()`); it still
  rewrites server-side, so no template change is needed — but a hand-built `?s=…` without a matching `&e=…`
  will 404 for limited (pupil/TA) roles.
- **New migrations** (auto-run on boot): `0056` (recurring slot-minute cursor), `0057` (`pupil_atl`).
- **New DB helper** `withTransaction()` + the `Executor` type in `src/db/pool.ts`: repo writes that compose
  into a caller's transaction take an optional `db: Executor = pool`. Informational — no UI impact.
