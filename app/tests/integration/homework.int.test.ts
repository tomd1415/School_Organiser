import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { clearHomework, listHomeworkChase, listPupilHomework, setHomework } from '../../src/repos/homework';
import { setDone } from '../../src/repos/pupilWork';

// 16B — homework set · chase · submit, against a real occurrence_course with an enrolled pupil.
let app: FastifyInstance;
let cookie = '';
let token = '';
let ocId = 0;
let pupilId = 0;

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
  const { rows } = await pool.query<{ oc: number; pid: number }>(
    `SELECT oc.id AS oc, e.pupil_id AS pid
     FROM occurrence_courses oc
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN lesson_occurrences lo ON lo.id = oc.occurrence_id AND NOT lo.is_test
     JOIN enrolments e ON e.group_id = gc.group_id AND e.active
     ORDER BY oc.id LIMIT 1`,
  );
  ocId = Number(rows[0]!.oc);
  pupilId = Number(rows[0]!.pid);
});

afterAll(async () => {
  await clearHomework(ocId).catch(() => {});
  await setDone(pupilId, ocId, false).catch(() => {});
  await app.close();
  await pool.end();
});

describe('16B — homework', () => {
  it('set homework surfaces it in the chase and the pupil\'s outstanding list', async () => {
    await setHomework(ocId, '2026-07-10T23:59:00Z');
    const chase = (await listHomeworkChase()).find((r) => r.occurrenceCourseId === ocId);
    expect(chase).toBeTruthy();
    expect(chase!.total).toBeGreaterThan(0);
    const pupilList = await listPupilHomework(pupilId);
    expect(pupilList.some((h) => h.occurrenceCourseId === ocId)).toBe(true);
  });

  it('submitting (pupil_done) drops it from the pupil\'s outstanding list and the chase notDone', async () => {
    const beforeNotDone = (await listHomeworkChase()).find((r) => r.occurrenceCourseId === ocId)!.notDone;
    await setDone(pupilId, ocId, true);
    expect((await listPupilHomework(pupilId)).some((h) => h.occurrenceCourseId === ocId)).toBe(false);
    const afterNotDone = (await listHomeworkChase()).find((r) => r.occurrenceCourseId === ocId)!.notDone;
    expect(afterNotDone).toBe(beforeNotDone - 1);
  });

  it('the teacher homework page renders the chase', async () => {
    const r = await app.inject({ method: 'GET', url: '/homework', headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('Homework');
    expect(r.body).toContain('Set as homework');
  });

  it('the set + clear routes round-trip', async () => {
    const set = await app.inject({ method: 'POST', url: '/homework/set', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: `oc=${ocId}&due=2026-07-12` });
    expect([200, 302]).toContain(set.statusCode);
    const clr = await app.inject({ method: 'POST', url: '/homework/clear', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: `oc=${ocId}` });
    expect([200, 302]).toContain(clr.statusCode);
    expect((await listHomeworkChase()).some((r) => r.occurrenceCourseId === ocId)).toBe(false);
  });
});
