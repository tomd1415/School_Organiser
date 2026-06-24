# CLAUDE.md — School_Organiser

Single-teacher "command centre" web app (timetable, Now screen, lesson notes, schemes of work,
curriculum delivery, AI planning). One developer-user; runs on the school LAN.

## Non-negotiable rules

- **No pupil name is ever sent to any AI service.** All AI calls go through the one wrapper
  (`app/src/llm/client.ts`): roster names → tokens before egress, an egress assert refuses if a
  name survives, the audit row stores the redacted request only.
- **Safeguarding-flagged content is withheld from AI entirely** — never sent, not just redacted.
- Teaching contexts (course + per-class) are **cohort-level prose only — never name or describe an
  individual pupil**.
- Feature inputs go in the wrapper's `context[]`, never the `system` string (so they inherit
  redaction/withholding/audit).
- `ANTHROPIC_API_KEY` lives in `app/.env` (git-ignored). Tests must never make real AI calls —
  the integration config forces an empty key.

## Stack & layout

TypeScript / Fastify 5 / PostgreSQL 16 (Docker, port 5434 dev) / server-rendered HTML + vendored
HTMX / Zod. Layering: `routes → services (pure) → repos (thin SQL over pg)`. Migrations in
`app/migrations/`, auto-run on boot. pg BIGINT is parsed to `Number` globally in
`app/src/db/pool.ts` — don't add per-call coercions.

## Commands

```bash
./start.sh                  # dev stack (db + app) → http://localhost:44360
cd app && npm test          # unit (DB-free)
cd app && npm run test:integration   # needs the dev DB up; never calls the real API
cd app && npm run typecheck
```

## Docs

`README.md` → docs index. Live build status: `docs/PHASE_5_PLAN.md` (+ CHANGELOG.md).
Privacy/AI rules in detail: `docs/SECURITY_AND_PRIVACY.md`, `docs/DPIA.md`.

## Conventions

The user commits work themselves between sessions — don't commit/push unless asked. Verify AI
features with a throwaway smoke script (`app/scripts/X-smoke.ts`, self-cleaning, then delete it);
keep test data out of real tables (clean up in `finally`).

UI layer (server-rendered, being isolated — see `docs/UI_SEPARATION_PLAN.md`): the views (`app/src/lib/*View.ts`)
are pure `data → HTML`. **All views reference route URLs via `app/src/lib/paths.ts`** (the single source of
truth) — never raw literals, including URLs passed as args or built into a `const`/ternary. `tests/pathsGuard.test.ts`
enforces this on every `*View.ts`; add a builder to `paths.ts` (and an assertion to `tests/pathsBuilders.test.ts`)
rather than hard-coding a new route. Preview/redesign views in isolation (no DB) at the dev-only `/ui-gallery`;
add a fixture in `app/src/lib/uiFixtures.ts` for new views. **Page width is an intent**, not a component
class: declare it via `nextShell({ width: 'reading'|'working'|'wide'|'full' })` (the shell sets
`main.cockpit-w-*`); don't rely on a root class being in a width list. CSS ownership: structure/layout lives
in `styles-base-widgets.css`, dark theme in `styles.css`'s `body[data-shell="next"]` block (see the
catalogue comment atop `styles.css`).
