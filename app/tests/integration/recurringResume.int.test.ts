import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { generateDueInstances } from '../../src/repos/recurringTasks';

// BUG-025: the recurring-task generator walks (date, slot-minute) for per_lesson definitions, but the
// durable cursor used to be date-only — so a crash between two same-day slots resumed at end-of-day and
// skipped the later slot forever. With last_generated_min persisted, resume continues mid-day. We prove
// it against a real seed class taught twice on one weekday, simulating "crashed after the first slot".
let app: FastifyInstance;

const GROUP = 24; // a class taught twice on weekday 5 (Fri) in the dev seed
const SLOT1 = 11 * 60 + 5; // 11:05
const SLOT2 = 11 * 60 + 55; // 11:55

beforeAll(async () => {
  app = await buildApp(); // runs migrations on boot, incl. 0056 (last_generated_min)
  await app.ready();
});
afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('recurring generation resumes mid-day after a crash (integration — BUG-025)', () => {
  it('regenerates the later same-day slot when the cursor stopped after the first', async () => {
    const { rows: ins } = await pool.query<{ id: number }>(
      `INSERT INTO recurring_tasks (title, pattern, lead_days, active) VALUES ('ZZ resume test', $1, 90, true) RETURNING id`,
      [`per_lesson:${GROUP}`],
    );
    const defId = ins[0]!.id;
    try {
      // A `today` inside the current academic year's term window, so upcoming Fridays are school days.
      const { rows: t } = await pool.query<{ d: string | null }>(
        `SELECT to_char(min(start_date),'YYYY-MM-DD') AS d FROM term_dates WHERE academic_year_id=(SELECT id FROM academic_years WHERE is_current)`,
      );
      const today = t[0]?.d;
      if (!today) return; // no term dates seeded → can't classify school days; nothing to assert

      // First pass: discover the first upcoming Friday that produced BOTH slots.
      await generateDueInstances(today);
      const { rows: keys } = await pool.query<{ k: string }>(
        `SELECT recurring_slot_key AS k FROM tasks WHERE recurring_task_id=$1`,
        [defId],
      );
      const byDate = new Map<string, Set<number>>();
      for (const r of keys) {
        const parts = String(r.k).split(':'); // "<defId>:<YYYY-MM-DD>:<min>"
        const d = parts[1]!;
        if (!byDate.has(d)) byDate.set(d, new Set());
        byDate.get(d)!.add(Number(parts[2]));
      }
      const twoSlotDay = [...byDate.entries()].find(([, mins]) => mins.has(SLOT1) && mins.has(SLOT2));
      if (!twoSlotDay) return; // the calendar didn't yield a clean two-slot day in the window → skip
      const D = twoSlotDay[0];

      // Simulate the crash: the later slot's task is gone and the cursor stopped AFTER the first slot.
      await pool.query(`DELETE FROM tasks WHERE recurring_task_id=$1 AND recurring_slot_key=$2`, [defId, `${defId}:${D}:${SLOT2}`]);
      await pool.query(`UPDATE recurring_tasks SET last_generated=$2::date, last_generated_min=$3 WHERE id=$1`, [defId, D, SLOT1]);

      // Resume: with the minute cursor we restart at (D, SLOT1) and the later slot is regenerated.
      await generateDueInstances(today);
      const { rows: after } = await pool.query<{ n: number }>(
        `SELECT count(*)::int n FROM tasks WHERE recurring_task_id=$1 AND recurring_slot_key=$2`,
        [defId, `${defId}:${D}:${SLOT2}`],
      );
      expect(after[0]!.n).toBe(1); // pre-fix this was 0 — the later same-day slot was skipped forever
    } finally {
      await pool.query(`DELETE FROM tasks WHERE recurring_task_id=$1`, [defId]);
      await pool.query(`DELETE FROM recurring_tasks WHERE id=$1`, [defId]);
    }
  });
});
