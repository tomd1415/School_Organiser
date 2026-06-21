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

## 2026-06-21 — ATL feature + reopened-audit remediation

### 🔴 Action needed in the next shell

1. **ATL styles → add to `public/styles-overhaul.css`.** The new ATL (1–4 attitude-to-learning) picker is
   already wired into the next-shell views (`markModalView.ts` calls `renderAtlPicker`; `markingView.ts` has
   the `mk-atl` link), **but `styles-overhaul.css` has no `.atl*` rules**, so it renders unstyled. Copy the
   block from `public/styles.css` (search `ATL (attitude to learning)`): `.atl`, `.atl-lbl`, `.atl-b`,
   `.atl-1`…`.atl-4`, `.atl-b.on`, `.atl-list`, `.atl-row`, `.atl-name`, `.atl-grid`, `.mm-atl-link`, `.mk-atl`.
   The standalone live grid (`GET /lesson/oc/:id/atl`) renders through `layout()`, so it shows in the next
   shell too — same missing-CSS caveat.

2. **`window.htmxSaved(event)` → port it into `public/app-overhaul.js`.** BUG-013's fix added this helper to
   `public/app.js` (classic) and switched forms to `hx-on::after-request="if(window.htmxSaved(event))this.reset()"`
   — **including the shared note + quick-capture modal forms** that `src/lib/html.ts` renders in BOTH shells.
   `app-overhaul.js` does **not** define `window.htmxSaved`, so in the next shell those forms evaluate
   `undefined(event)` → it throws and the form never resets after a save. Port the function verbatim from
   `app.js` (it reads the response's `HX-Trigger` off the xhr and returns `true` only for a genuine 2xx with
   no `app:save-failed`). The server turns a real 500 into a 200 + an `app:save-failed` trigger, so
   `event.detail.successful` alone is **not** a safe "did it save?" signal.

### 🟢 Already mirrored by the UI dev (no action — just confirm full coverage)

- **Cover/room effective room (BUG-012 / BUG-047).** `taView.ts` already imports `effectiveRoom` ✓. Please
  confirm every other next-shell lesson/daily-print renderer also uses `effectiveRoom(effect, room)` and shows
  the cover/room **badge** instead of the raw timetabled room — otherwise a TA or cover teacher is directed to
  the wrong room. Helper: `effectiveRoom` in `src/services/exceptions.ts`.
- **ATL view wiring.** `markModalView.ts` + `markingView.ts` already call `renderAtlPicker` / the `mk-atl`
  link ✓ — only the CSS (item 1) is outstanding.

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
