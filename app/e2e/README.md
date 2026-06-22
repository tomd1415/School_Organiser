# End-to-end (Playwright) smoke suite

Real-browser smokes for the things `app.inject`/jsdom can't catch — the client JS actually running, and
the flows that have repeatedly broken. Deliberately small + high-value, not blanket coverage.

## Run

```bash
# Prereq: the dev DB must be up (it holds the seed the tests read).
docker compose -f docker-compose.yml up -d db      # or ./start.sh
cd app && npm run test:e2e
```

Playwright boots a throwaway app instance on **:44361** against the dev DB (5434) with a deterministic
login (password `test` via `APP_PASSWORD_HASH`) and the real resource store, drives Chromium, then stops.
No AI calls are made (empty key). The HTML report (on failure) is at `app/playwright-report/`.

## What it covers

- **`boot.spec.ts`** — the guard for the class of bug that wasted days: a JS error at *load* in `app.js`
  silently killed every enhancement on every authed page. Asserts **no `pageerror`/`console.error`** on
  the key authed pages, and that `app.js` actually ran (the active-nav highlight is applied).
- **`lessonPreview.spec.ts`** — cockpit slide **Now/Next** advances the deck; **"Preview as pupil"** shows
  the **worksheet** (not just the slides board). Driven off real plan ids discovered in `global-setup.ts`,
  so no live timetable slot is needed. Each test skips cleanly if this DB has no slide-/worksheet-bearing
  plan (those paths are also covered by `tests/clientAppBoot.test.ts` and `tests/integration/pupilPreview.int.test.ts`).

## Notes

- `e2e/.auth/` (saved login + discovered fixtures) and `test-results/` / `playwright-report/` are gitignored.
- Layering: jsdom boot tests (`tests/clientAppBoot.test.ts`, `clientPupilBoot.test.ts`) run in the fast
  `npm test` and catch load-crashes cheaply; Playwright is the real-browser layer for full flows.
- Future: a two-context test (teacher locks slides → pupil deck follows over SSE) would cover the live
  slide-sync; the sync backend is already unit + integration tested.
