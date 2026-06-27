// Integration-suite fixture guarantee. The integration tests read a live system part-way through the
// summer term — enrolled pupils, authored & assigned schemes, lessons laid across the calendar,
// occurrences, pupil work and resources. That state comes from the TEST-DATA seed (src/seed/testData.ts)
// on top of the base timetable seed (src/seed/run.ts) — NOT from `./start.sh`, which only seeds the base
// timetable. Before this hook, running `npm run test:integration` against a freshly-seeded dev DB failed
// ~14 tests purely for want of that fixture. This globalSetup closes that gap: it checks whether the
// fixture is already present and, if not, seeds it once (each seed runs as its own subprocess so it owns
// its pg pool lifecycle and never closes the test runtime's pool). Idempotent and fast on re-runs.
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { join } from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://organiser:organiser@localhost:5434/organiser';
const RESOURCE_STORE_PATH = process.env.RESOURCE_STORE_PATH ?? '/tmp/so-test-resources';
const APP_DIR = join(__dirname, '..', '..');

async function fixturePresent(): Promise<boolean> {
  const c = new Client({ connectionString: DATABASE_URL });
  try {
    await c.connect();
    // The fixture is "present" when the test-data seed's hallmarks exist: enrolled pupils, authored
    // lesson plans, and the school-wide default teaching context on at least one course.
    const { rows } = await c.query<{ ok: boolean }>(
      `SELECT ((SELECT count(*) FROM pupils) > 0
            AND (SELECT count(*) FROM lesson_plans) > 0
            AND (SELECT count(*) FROM courses WHERE teaching_context IS NOT NULL) > 0) AS ok`,
    );
    return rows[0]?.ok === true;
  } catch {
    // DB unreachable — let the tests themselves surface the clearer "needs the dev DB up" failure.
    return true;
  } finally {
    await c.end().catch(() => {});
  }
}

function runSeed(script: string): void {
  const res = spawnSync('npx', ['tsx', script], {
    cwd: APP_DIR,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL, RESOURCE_STORE_PATH },
  });
  if (res.status !== 0) throw new Error(`integration fixture seed failed: ${script} (exit ${res.status})`);
}

async function progressionEmpty(): Promise<boolean> {
  const c = new Client({ connectionString: DATABASE_URL });
  try {
    await c.connect();
    const { rows } = await c.query<{ n: number }>(`SELECT count(*)::int AS n FROM progression_schemes`);
    return (rows[0]?.n ?? 0) === 0;
  } catch {
    return false; // table missing / DB down — let the tests surface it
  } finally {
    await c.end().catch(() => {});
  }
}

export async function setup(): Promise<void> {
  if (!(await fixturePresent())) {
    // eslint-disable-next-line no-console
    console.log('[integration] seeding fixture (base timetable + test data) — first run on this DB…');
    runSeed('src/seed/run.ts');
    runSeed('src/seed/testData.ts');
  }
  // The Stages & strands schemes seed separately (it reads the year-ladder doc from docs/, host-side only).
  // Idempotent — only run it when the progression tables are empty.
  if (await progressionEmpty()) {
    // eslint-disable-next-line no-console
    console.log('[integration] seeding progression schemes (year ladder + GCSE structure)…');
    runSeed('src/seed/progressionSeed.ts');
  }
}
