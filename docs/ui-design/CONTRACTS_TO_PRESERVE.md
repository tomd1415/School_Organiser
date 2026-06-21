# Contracts the UI must not break

The app renders HTML in route handlers and wires behaviour with two hand-written client scripts
(`app/public/app.js` teacher, `app/public/pupil.js` pupil/TA) over vendored HTMX. There is **no
component layer to enforce these contracts** — they live as string conventions between the markup and
the JS. If a redesign renames a class, id, `data-*` attribute, event or swap target, behaviour breaks
**silently** (no compile error). This page is the checklist of what must survive a re-skin. Source of
truth = `public/app.js`, `public/pupil.js`, `lib/html.ts`, `lib/worksheetForm.ts`.

> Rule of thumb: you may freely change *visual* classes and structure, but keep every **id**, **`data-*`
> attribute**, **event name**, **swap-target id**, **state class** and **OOB span** below, or update the
> JS in the same change.

📋 **Backend changes you need to pick up** — new features and behaviour shifts since the handoff that the
"next" shell must mirror (e.g. ATL, `window.htmxSaved`, cover/room effective-room) — are logged in
[BACKEND_CHANGES_FOR_UI.md](BACKEND_CHANGES_FOR_UI.md). Check it before each merge.

## 1. Element ids the JS finds by id (must exist, keep the id)

| id | Owner | Purpose |
|---|---|---|
| `note-modal`, `note-modal-body`, `note-modal-form` | app.js + `lib/html.ts` | the quick-note `<dialog>` (opened by `n` / `note-btn`) |
| `mark-modal`, `mark-modal-body` | app.js + `lib/html.ts` + `markModal.ts` | the marking `<dialog>` (opened via `markOpenAttrs`); `← →` arrows drive it |
| `note-btn` | app.js | opens the note modal |
| `global-search`, `search-results` | app.js | command-palette search box + results region |
| `kbd-cheat` | app.js | the `?` keyboard cheat-sheet |
| `hx-toast` | app.js | the global save/error toast region |

Both `<dialog>`s are **native** (`showModal()` + native Esc). Don't replace them with div overlays
without re-implementing focus-trap, Esc and the open hooks.

## 2. The `data-*` markup → JS API (grouped by feature)

These attributes ARE the interface app.js/pupil.js bind to. Keep the attribute names and value shapes.

**Autosave & unsaved-changes guard (app.js):**
- `data-save-id` / element `name` / `id` — the per-operation key the unsaved-tracker correlates saves
  by (BUG-013/033). Autosaving inputs must carry a stable one; **don't rely on `value`/`title`/`text`.**
- `data-save-url` — the POST url for JS-driven saves (worksheet matching slots, Parson's reorder).

**Marking modal (app.js):** `data-mark-nav="prev|next"` on the modal's nav buttons — `←`/`→` click them.

**Worksheet widgets (pupil.js + worksheetForm.ts):**
- `data-ws-tab="<i>"` / `data-ws-panel="<i>"` — multiple-worksheet tabs ↔ panels.
- `data-pane` / `data-pane-btn="slides|work"` — the slides/worksheet two-pane toggle.
- Matching: `data-match`, `data-key`, `data-label`, `data-save-url`, `data-match-live` (SR announce).
- Parson's: `data-parsons-key`, `data-save-url`, and `data-line="<code line>"` on each draggable `<li>`
  (the order is read off these). Buttons `.ws-parsons-up`/`.ws-parsons-down`.
- Screenshot paste: `data-paste-url`, `data-paste-help`.
- Read-aloud: `data-speak` (toolbar toggle), `data-speak-text="<plain text>"` on `.ws-speak` buttons.

**Accessibility toolbar (app.js):** `data-a11y`, `data-textscale`, `data-font`, `data-contrast`,
`data-motion`, `data-theme` — the SEND preferences (text size, dyslexia font, contrast, reduced motion,
theme). **Note: `data-theme` already exists here** for the contrast/theme preference — wire any new
dark-mode toggle through this existing mechanism rather than inventing a parallel one.

**Other:** timer (`data-timer`, `data-timer-display`, `data-timer-set`, `data-timer-stop`,
`data-timer-full`); map drag (`data-map-slot`, `data-map-csrf`); pupil PIN pad (`data-digit`,
`data-pin-back`); command-palette items (`data-val`).

## 3. Events

- **`app:save-failed`** — the ONLY app-namespaced custom event. A failed autosave dispatches it; the
  unsaved-changes toast listens. Keep firing/consuming it if you touch save flows.
- **HTMX lifecycle** the scripts hook: `htmx:beforeRequest`, `htmx:afterRequest`, `htmx:afterSwap`,
  `htmx:afterSettle`, `htmx:beforeSwap`. The unsaved-tracker, the "saving…/saved ✓" flips, matching/
  parsons re-init after swaps, and the toast all hang off these. A new client framework that bypasses
  HTMX would orphan all of it.
- Native DOM: `keydown` (the `g`+letter jump map, `n`, `?`, marking `←/→`, Parson's Alt+arrows), `drag*`
  (matching/parsons/map), `paste`/`drop` (screenshots), `beforeunload` (unsaved guard).

## 4. State classes the JS toggles (markup must use these names)

`is-on` (active tab/pane), `is-ordered` (a Parson's that's been arranged → counts as done), `is-dragging`,
`is-drop`, `is-picked`, `is-used` (matching), `show` (a visible `.ws-saved`/toast), `active`/`active-within`
(rail current), `hx-busy` (in-flight), `ws-progress-done`, `act-done`, `speak-flash`, `kbd-active`. You may
restyle these freely; **don't rename them.**

## 5. CSRF wiring (every mutation depends on it)

- Mutations require the **`x-csrf-token`** header. It's supplied by `hx-headers='{"x-csrf-token":"…"}'`
  on: the two `<dialog>`s (`lib/html.ts`), and each page's top `<section class="card" hx-headers=…>`
  (handlers call `reply.generateCsrf()`). The map drag reads `data-map-csrf`.
- Server returns **real 4xx** on validation/permission failure — **never a 200 with an error body.** The
  toast + unsaved-guard rely on `event.detail.successful`. Keep that: a redesigned error path must set
  the right status and let HTMX/app.js surface it.

## 6. Out-of-band swaps & the "no-change" poll

- `savedTick(key)` returns `<span class="ws-saved show" id="ws-sv-<key>" hx-swap-oob="true">saved ✓</span>`
  — the per-field autosave confirmation, swapped OOB by `/me/answer`. The id `ws-sv-<fieldKey>` must
  match the field's `.ws-saved` span.
- Live polls (`/now/clock?sig=…`, `/lesson/oc/:id/pupil-work?sig=…`) return **HTTP 204** when nothing
  changed so HTMX does **not** swap — this is what stops a background refresh stealing focus, closing a
  dialog, or wiping a half-typed note. Preserve the `sig` round-trip + the 204 behaviour.

## 7. Navigation contract

- `lib/nav.ts` is the **single source of truth** for the rail and the keyboard jump map. It emits
  `window.__NAV__` (inline JSON) which app.js reads for the `g`+letter jumps and the cheat-sheet. The rail
  markup is `nav.rail` with `.rail a[href]`; active state is applied **client-side** by app.js from the
  path (the server render is path-free). Keep `window.__NAV__`, the `g`+key map, and the `.rail a[href]`
  selector, or update app.js.
- The `<aside class="rail-wrap">` + `<div class="stage"><main>` shell lives in `lib/html.ts layout()`.

## 8. Stable HTMX swap-target ids (routes target these)

Routes return fragments aimed at specific ids; renaming the container breaks the swap. The big ones:
`#mark-modal-body` (marking), `#pw-<oc>` and `#pw-live-<oc>` (the pupil-work grid + its live region),
`#note-modal-body`, `#search-results`, `#now-strip`, and the per-feature `closest section`/`outerHTML`
swaps used across Organise pages. Grep a route's `hx-target=` before moving its container.

## 9. Assets / environment (hard constraints)

- **No external anything** — HTMX is vendored (`public/htmx.min.js`), the font is self-hosted Atkinson
  Hyperlegible, no CDNs/analytics/icon services/remote images. LAN-only + CSP-friendly. A redesign must
  not add a CDN, web-font service, icon kit or external image without an explicit privacy decision
  (SECURITY_AND_PRIVACY.md).
- One CSS file (`public/styles.css`), already token-based (see DEVELOPER_INPUTS_RESPONSE §11). Two JS
  files, no build step for them (served static). Keep it buildless unless you add a bundler deliberately.

---

**Fastest way to not break things:** make a change on the test instance (port 44370), then click through
the affected widget (open the note + mark modals, autosave a worksheet field, drag a Parson's/matching,
switch worksheet tabs, run a search, leave a page with unsaved input). If any of those stop working, a
contract above was renamed.
