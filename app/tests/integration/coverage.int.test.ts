import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { listSpecPoints, schemeCoverage, schemeLessons, setPlanSpecPoint, getPlanSpecPointIds } from '../../src/repos/specPoints';
import { getActiveScheme, materialiseScheme, cloneSchemeNewVersion, deleteScheme } from '../../src/repos/schemes';

// idea 10 slice 1 — import spec points, map lessons, read deterministic coverage, and (the rollover
// trap) confirm cloneSchemeNewVersion carries the mappings forward. All test rows use a 'ZZCOV' marker
// and any throwaway scheme is deleted, keeping the teacher's data clean.
const MK = 'ZZCOV';
let app: FastifyInstance;
let cookie = '';
let token = '';
let courseId = 0;
let activeSchemeId = 0;
const throwawaySchemes: number[] = [];

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
  const res = await app.inject({
    method: 'POST', url: '/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
    payload: `_csrf=${encodeURIComponent(token)}&password=test`,
  });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
  // a course that has an active scheme with at least one lesson
  const { rows } = await pool.query<{ course_id: number; id: number }>(
    `SELECT s.course_id, s.id FROM schemes_of_work s
     WHERE s.active AND EXISTS (SELECT 1 FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id WHERE u.scheme_id = s.id)
     ORDER BY s.id LIMIT 1`,
  );
  courseId = rows[0]!.course_id;
  activeSchemeId = rows[0]!.id;
});

afterAll(async () => {
  for (const id of throwawaySchemes) await deleteScheme(id).catch(() => {});
  await pool.query(`DELETE FROM course_spec_points WHERE title LIKE $1`, [`${MK}%`]); // cascades mappings
  await app.close();
  await pool.end();
});

const importPoints = (text: string) =>
  app.inject({ method: 'POST', url: '/coverage/import', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: `course=${courseId}&text=${encodeURIComponent(text)}` });

describe('curriculum coverage (integration)', () => {
  it('the page renders for the first course', async () => {
    const res = await app.inject({ method: 'GET', url: '/coverage', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Curriculum coverage');
  });

  it('imports spec points and re-import is idempotent (upsert by code)', async () => {
    await importPoints(`ZZ1 ${MK} point one\nZZ2 ${MK} point two`);
    const once = (await listSpecPoints(courseId)).filter((p) => p.title.startsWith(MK));
    expect(once).toHaveLength(2);
    await importPoints(`ZZ1 ${MK} point one\nZZ2 ${MK} point two`); // same again
    const twice = (await listSpecPoints(courseId)).filter((p) => p.title.startsWith(MK));
    expect(twice).toHaveLength(2); // no duplicates
  });

  it('mapping a lesson to a point flips it to covered, and unmapping flips it back', async () => {
    const pt = (await listSpecPoints(courseId)).find((p) => p.title === `${MK} point one`)!;
    const lesson = (await schemeLessons(activeSchemeId))[0]!;
    expect((await schemeCoverage(activeSchemeId)).find((c) => c.id === pt.id)?.covered).toBe(false);
    await setPlanSpecPoint(lesson.id, pt.id, true);
    expect((await schemeCoverage(activeSchemeId)).find((c) => c.id === pt.id)?.covered).toBe(true);
    await setPlanSpecPoint(lesson.id, pt.id, false);
    expect((await schemeCoverage(activeSchemeId)).find((c) => c.id === pt.id)?.covered).toBe(false);
  });

  it('a point only maps to a lesson on its own course (cross-course mapping is refused)', async () => {
    const pt = (await listSpecPoints(courseId)).find((p) => p.title === `${MK} point two`)!;
    const otherLesson = await pool.query<{ id: number }>(`SELECT id FROM lesson_plans WHERE course_id <> $1 LIMIT 1`, [courseId]);
    if (otherLesson.rows[0]) {
      await setPlanSpecPoint(otherLesson.rows[0].id, pt.id, true);
      expect(await getPlanSpecPointIds(otherLesson.rows[0].id)).not.toContain(pt.id); // guarded by the WHERE EXISTS
    }
  });

  it('cloneSchemeNewVersion carries the coverage mappings forward (the rollover trap)', async () => {
    const sid = await materialiseScheme(courseId, `${MK} scheme`, [{ title: `${MK} unit`, lessons: [`${MK} lesson`] }]);
    expect(sid).not.toBeNull();
    throwawaySchemes.push(sid!);
    const plan = (await schemeLessons(sid!))[0]!;
    const pt = (await listSpecPoints(courseId)).find((p) => p.title === `${MK} point one`)!;
    await setPlanSpecPoint(plan.id, pt.id, true);
    expect((await schemeCoverage(sid!)).find((c) => c.id === pt.id)?.covered).toBe(true);

    const newId = await cloneSchemeNewVersion(sid!);
    expect(newId).not.toBeNull();
    throwawaySchemes.push(newId!);
    // the clone must already cover the point — without the copy, coverage would reset to zero
    expect((await schemeCoverage(newId!)).find((c) => c.id === pt.id)?.covered).toBe(true);
  });
});
