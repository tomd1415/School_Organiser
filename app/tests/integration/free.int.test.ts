import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getTimetabledLessons } from '../../src/repos/timetable';
import { createTask } from '../../src/repos/tasks';
import { assignTaskToPeriod, unassignTaskFromPeriod, listPeriodTasks, listAssignableTasks } from '../../src/repos/periodTasks';
import { weekReadiness } from '../../src/services/lessonReadiness';

// Free-period task assignments + the readiness service (migration 0059). All test rows carry a marker
// and are removed in afterAll, keeping the teacher's real data clean.
let app: FastifyInstance;
let lessonId = 0;
let taskId = 0;
const DATE = '2099-04-07';
const MK = 'ZZFREE12';

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const lessons = await getTimetabledLessons();
  lessonId = lessons.find((l) => l.purpose === 'teaching')?.lessonId ?? lessons[0]?.lessonId ?? 0;
  taskId = await createTask(`${MK} sample task`);
});

afterAll(async () => {
  await pool.query(`DELETE FROM period_tasks WHERE task_id = $1`, [taskId]).catch(() => {});
  await pool.query(`DELETE FROM tasks WHERE id = $1`, [taskId]).catch(() => {});
  await app.close();
});

describe('period-task assignments (integration)', () => {
  it('assigns, lists, and unassigns a task to a free period', async () => {
    expect(lessonId).toBeGreaterThan(0);
    await assignTaskToPeriod(DATE, lessonId, taskId);
    expect((await listPeriodTasks(DATE, lessonId)).map((t) => t.id)).toContain(taskId);
    // an already-assigned task drops out of the "add an existing task" pick-list
    expect((await listAssignableTasks(DATE, lessonId)).map((t) => t.id)).not.toContain(taskId);
    await unassignTaskFromPeriod(DATE, lessonId, taskId);
    expect((await listPeriodTasks(DATE, lessonId)).map((t) => t.id)).not.toContain(taskId);
  });

  it('assign is idempotent (ON CONFLICT DO NOTHING)', async () => {
    await assignTaskToPeriod(DATE, lessonId, taskId);
    await assignTaskToPeriod(DATE, lessonId, taskId);
    expect((await listPeriodTasks(DATE, lessonId)).filter((t) => t.id === taskId)).toHaveLength(1);
    await unassignTaskFromPeriod(DATE, lessonId, taskId);
  });
});

describe('weekReadiness (integration)', () => {
  it('returns a Map for a normal week without throwing', async () => {
    const r = await weekReadiness(['2099-04-06', '2099-04-07', '2099-04-08']);
    expect(r).toBeInstanceOf(Map);
  });
});
