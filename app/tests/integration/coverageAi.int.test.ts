import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getCourseExamDate, importSpecPoints, listSpecPoints, schemeCoverage, schemeLessons } from '../../src/repos/specPoints';
import { parseSpecPoints } from '../../src/lib/specImport';

// idea 10 slice 2a — exam date + the AI gap-filler. With AI forced off, /coverage/suggest reports
// "AI is off"; /coverage/suggest/apply (no AI) maps the ticked suggestions and coverage flips.
const MK = 'ZZCOVAI';
let app: FastifyInstance;
let cookie = '';
let token = '';
let courseId = 0;
let schemeId = 0;
let examSnap: string | null = null;

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}
const post = (url: string, payload: string) =>
  app.inject({ method: 'POST', url, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
  const { rows } = await pool.query<{ course_id: number; id: number }>(
    `SELECT s.course_id, s.id FROM schemes_of_work s
     WHERE s.active AND EXISTS (SELECT 1 FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id WHERE u.scheme_id = s.id)
     ORDER BY s.id LIMIT 1`,
  );
  courseId = rows[0]!.course_id;
  schemeId = rows[0]!.id;
  examSnap = await getCourseExamDate(courseId);
  await importSpecPoints(courseId, parseSpecPoints(`ZP1 ${MK} alpha\nZP2 ${MK} beta`));
});

afterAll(async () => {
  await pool.query(`UPDATE courses SET exam_date = $2 WHERE id = $1`, [courseId, examSnap]);
  await pool.query(`DELETE FROM course_spec_points WHERE title LIKE $1`, [`${MK}%`]); // cascades mappings
  await app.close();
  await pool.end();
});

describe('coverage AI gap-filler + exam date (integration)', () => {
  it('the exam date can be set and cleared', async () => {
    expect((await post('/coverage/exam-date', `course=${courseId}&date=2026-05-01`)).statusCode).toBe(200);
    expect(await getCourseExamDate(courseId)).toBe('2026-05-01');
    expect((await post('/coverage/exam-date', `course=${courseId}&date=`)).statusCode).toBe(200);
    expect(await getCourseExamDate(courseId)).toBeNull();
  });

  it('suggest reports AI-off cleanly when there are gaps but no key', async () => {
    const res = await post('/coverage/suggest', `scheme=${schemeId}&course=${courseId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('AI is off');
  });

  it('apply maps the ticked suggestions and coverage flips to covered (no AI needed)', async () => {
    const pt = (await listSpecPoints(courseId)).find((p) => p.title === `${MK} alpha`)!;
    const lesson = (await schemeLessons(schemeId))[0]!;
    expect((await schemeCoverage(schemeId)).find((c) => c.id === pt.id)?.covered).toBe(false);
    const payload = JSON.stringify({ map: [{ pointId: pt.id, lessonId: lesson.id }] });
    const res = await post('/coverage/suggest/apply', `course=${courseId}&payload=${encodeURIComponent(payload)}&include_0=1`);
    expect(res.statusCode).toBe(200);
    expect((await schemeCoverage(schemeId)).find((c) => c.id === pt.id)?.covered).toBe(true);
  });

  it('apply skips unticked suggestions', async () => {
    const pt = (await listSpecPoints(courseId)).find((p) => p.title === `${MK} beta`)!;
    const lesson = (await schemeLessons(schemeId))[0]!;
    const payload = JSON.stringify({ map: [{ pointId: pt.id, lessonId: lesson.id }] });
    await post('/coverage/suggest/apply', `course=${courseId}&payload=${encodeURIComponent(payload)}`); // no include_0
    expect((await schemeCoverage(schemeId)).find((c) => c.id === pt.id)?.covered).toBe(false);
  });
});
