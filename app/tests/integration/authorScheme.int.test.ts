import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { importSpecPoints, listSpecPoints, schemeCoverage, schemeLessons, specPointsSolelyCoveredByPlan } from '../../src/repos/specPoints';
import { materialiseScheme, deleteScheme, listCourses } from '../../src/repos/schemes';

// idea 10 slice 2b — materialiseScheme auto-maps each authored lesson's spec-point codes, and deleting
// a lesson that solely covers a point warns (not silently). Throwaway schemes + ZZAUTH spec points,
// all cleaned up.
const MK = 'ZZAUTH';
const CODE = 'ZA1';
let app: FastifyInstance;
let cookie = '';
let token = '';
let courseId = 0;
const schemes: number[] = [];

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
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
  courseId = (await listCourses())[0]!.id;
  await importSpecPoints(courseId, [{ code: CODE, title: `${MK} alpha` }]);
});

afterAll(async () => {
  for (const id of schemes) await deleteScheme(id).catch(() => {});
  await pool.query(`DELETE FROM course_spec_points WHERE title LIKE $1`, [`${MK}%`]); // cascades mappings
  await app.close();
  await pool.end();
});

describe('author_scheme@4 auto-map + coverage-drop warning (integration)', () => {
  it('materialiseScheme auto-maps an authored lesson to the spec-point codes it carries', async () => {
    const sid = await materialiseScheme(courseId, `${MK} scheme`, [
      { title: `${MK} unit`, lessons: [{ title: `${MK} lesson`, specPoints: [CODE] }] },
    ]);
    expect(sid).not.toBeNull();
    schemes.push(sid!);
    const pt = (await listSpecPoints(courseId)).find((p) => p.title === `${MK} alpha`)!;
    expect((await schemeCoverage(sid!)).find((c) => c.id === pt.id)?.covered).toBe(true);
  });

  it('a plain string lesson still works and maps nothing (back-compat)', async () => {
    const sid = await materialiseScheme(courseId, `${MK} scheme 2`, [{ title: `${MK} u`, lessons: ['just a title'] }]);
    expect(sid).not.toBeNull();
    schemes.push(sid!);
    const lesson = (await schemeLessons(sid!))[0]!;
    expect(await specPointsSolelyCoveredByPlan(lesson.id)).toEqual([]);
  });

  it('deleting the sole coverer of a point warns that it is now uncovered', async () => {
    const sid = await materialiseScheme(courseId, `${MK} scheme 3`, [
      { title: `${MK} unit`, lessons: [{ title: `${MK} only coverer`, specPoints: [CODE] }] },
    ]);
    schemes.push(sid!);
    const plan = (await schemeLessons(sid!))[0]!;
    expect((await specPointsSolelyCoveredByPlan(plan.id)).some((p) => p.code === CODE)).toBe(true);
    const res = await app.inject({
      method: 'POST', url: `/schemes/plan/${plan.id}/delete`,
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: '',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('now uncovered');
    expect(res.body).toContain(CODE);
  });
});
