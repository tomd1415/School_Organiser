# Working model for the UI overhaul

How the redesign gets built — especially with an **external UI/UX developer** — without destabilising
the live app or exposing real pupil data. Decided 2026-06-20.

## The model: trunk + feature flag (not a long-lived branch)

`main` is the trunk — always tested and releasable. The redesign is built **behind a feature flag**
(`ui_shell`) so it can **merge into `main` early and often while staying dark**, and ships only when a
journey reaches parity. We deliberately **avoid a long-lived `ui-overhaul` branch**: it would drift from
`main` for weeks and turn into a big-bang merge.

```
main ──●────●────●────●────●──►   stable + releasable; your features keep landing;
        \  PR   /  PR  /  PR       UI journeys merge in, dark behind ui_shell
   ui/marking  ui/now  ui/plan     external dev: one short-lived branch + PR per journey
```

- **You** keep shipping small features straight to `main` (or short-lived branches, your choice).
- **The external dev** never touches `main` directly. They work on short-lived `ui/<journey>` branches
  off `main`, open **one PR per journey**, you review the diff and merge. The flag keeps it hidden until
  it's ready, so a half-done journey can't break anything live.
- (Alternative, only if continuous review isn't realistic: a single `ui-overhaul` branch merged once at
  the end. Higher merge risk; not recommended.)

## The `ui_shell` flag (built, ready to use)

A write-through in-memory setting, same machinery as the experience switch:

- **Setting:** `ui_shell` ∈ `classic` (default) | `next`. Stored in `settings`; primed at boot in
  `server.ts`; read synchronously by `layout()`.
- **Source of truth:** `app/src/lib/nav.ts` — `getUiShell()` / `setUiShell()`.
- **The seam:** `app/src/lib/html.ts layout()` renders `<body data-shell="classic|next">` and is the
  branch point. When the new shell exists, the incoming dev returns it there:
  `if (shell === 'next') return nextShell({title, body, …});`. Until then `classic` renders unchanged,
  so **the flag does nothing visible yet** — it's just wired.
- **Flip it:** Settings → *UI preview (experimental)* toggle (POST `/settings/ui-shell`), or set the
  `ui_shell` setting directly. Per-instance (single user) — flip it on your own instance to preview, leave
  it off elsewhere.
- **CSS/JS hook:** style/scope new-shell work under `body[data-shell="next"] …` so old and new styles
  don't collide while both exist.

How to build a journey behind it (the pattern):
1. Branch `ui/<journey>` off `main`.
2. Build the new render for that page, scoped to `[data-shell="next"]`, consuming a **typed view model**
   you introduce from the handler's existing data (see DEVELOPER_INPUTS_RESPONSE §0b/§6).
3. Keep every contract in [CONTRACTS_TO_PRESERVE.md](CONTRACTS_TO_PRESERVE.md) (ids, `data-*`, events,
   CSRF, swap targets) — the redesign is presentation, not behaviour.
4. PR → review → merge to `main`, still dark.
5. When the journey is at parity (below), it can be turned on.

## Working with an external developer

- **They build against the test instance** — `instances/testdata/` (Docker; app on
  [http://localhost:44370](http://localhost:44370), login `testpass1`). It has a full fictional school
  (272 invented pupils, separate DB) and **no real pupil data**, so a contractor never touches anything
  safeguarding-sensitive. `instances/` is git-ignored; re-seed with `app/src/seed/testData.ts`.
- **Give them:** repo access (or a fork) to push `ui/<journey>` branches; the test instance; and the
  [docs/ui-design/](.) set — the brief ([UI_OVERHAUL_DEVELOPER_INPUTS.md](UI_OVERHAUL_DEVELOPER_INPUTS.md)),
  the answers ([DEVELOPER_INPUTS_RESPONSE.md](DEVELOPER_INPUTS_RESPONSE.md)), the route map
  ([ROUTE_INVENTORY.md](ROUTE_INVENTORY.md)), the contracts ([CONTRACTS_TO_PRESERVE.md](CONTRACTS_TO_PRESERVE.md)),
  the per-page handoffs ([PAGE_HANDOFFS.md](PAGE_HANDOFFS.md)), and the prototypes ([../../ui-overhaul-prototypes/](../../ui-overhaul-prototypes/)).
- **Files they own / must coordinate on:** see UI_OVERHAUL_DEVELOPER_INPUTS §2 and DEVELOPER_INPUTS_RESPONSE
  §1 — the shared ones (`html.ts`, `nav.ts`, `app.js`, `styles.css`) are load-bearing; changes there get
  reviewed carefully.
- **You are the merge gate.** Nothing reaches `main` without your review; the flag means even merged work
  is invisible to users until you flip it.

## Parity & rollback (when a journey may go live)

A journey is "done" / safe to turn on when:
- it matches the prototype for that page **and** every *must-not-change behaviour* in its
  [PAGE_HANDOFFS.md](PAGE_HANDOFFS.md) entry still holds;
- the existing behaviour/regression tests named in the handoff still pass (UI snapshots alone don't prove
  authorization/persistence/privacy — DEVELOPER_INPUTS_RESPONSE §16);
- accessibility hasn't regressed (the existing a11y toolbar, keyboard map, 44px targets, custom-control
  contracts).

**Rollback** is just flipping `ui_shell` back to `classic` — no revert needed. **Delete the old shell,
CSS and client behaviour only after the full overhaul is at parity and signed off**, not per journey.

## Commit hygiene

The flag/branch model fixes the "lots of changes — lost track" problem, but the cheap habit is: **focused
commits** (one logical change each, clear message) and keep [../../CHANGELOG.md](../../CHANGELOG.md)
current. For UI journeys especially, a tidy PR per journey makes review and rollback sane.
