import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { adaptSchemeForClass, maybeAutoAdaptScheme } from '../../src/services/adaptLesson';
import { groupCourseAutoAdapted, setGroupCourseAutoAdapted } from '../../src/repos/adaptations';
import { getActiveScheme } from '../../src/repos/schemes';
import { schemeLessons } from '../../src/repos/specPoints';

// Phase 11 — adapt a whole scheme for a class. With AI forced off, the batch self-stops (no key);
// we verify the route's count + the one-shot auto-flag. Snapshots/restores the class row it touches.
let app: FastifyInstance;
let cookie = '';
let token = '';
let gc = 0;
let schemeLessonCount = 0;
let flagSnap = false;
let ctxSnap: string | null = null;

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
  // a class whose course has an active scheme with lessons
  const { rows } = await pool.query<{ id: number; sa: boolean; tc: string | null }>(
    `SELECT gc.id, gc.scheme_auto_adapted AS sa, gc.teaching_context AS tc
     FROM group_courses gc
     WHERE EXISTS (SELECT 1 FROM schemes_of_work s WHERE s.course_id = gc.course_id AND s.active
       AND EXISTS (SELECT 1 FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id WHERE u.scheme_id = s.id))
     LIMIT 1`,
  );
  if (rows[0]) {
    gc = rows[0].id;
    flagSnap = rows[0].sa;
    ctxSnap = rows[0].tc;
    const info = await pool.query<{ courseId: number }>(`SELECT course_id AS "courseId" FROM group_courses WHERE id = $1`, [gc]);
    const scheme = await getActiveScheme(info.rows[0]!.courseId);
    schemeLessonCount = scheme ? (await schemeLessons(scheme.id)).length : 0;
  }
});

afterAll(async () => {
  if (gc) await pool.query(`UPDATE group_courses SET scheme_auto_adapted = $2, teaching_context = $3 WHERE id = $1`, [gc, flagSnap, ctxSnap]);
  await app.close();
  await pool.end();
});

describe('adapt whole scheme for a class (integration)', () => {
  it('the manual route reports how many lessons it will adapt', async () => {
    if (!gc) return;
    const res = await app.inject({ method: 'POST', url: `/lesson/gc/${gc}/adapt-scheme`, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: '' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(`Adapting ${schemeLessonCount} lesson`);
  });

  it('adaptSchemeForClass returns counts over the whole scheme and self-stops with AI off', async () => {
    if (!gc) return;
    await pool.query(`UPDATE group_courses SET teaching_context = $2 WHERE id = $1`, [gc, 'This class needs short chunked tasks and lots of recap and visual support.']);
    const r = await adaptSchemeForClass(gc);
    expect(r.total).toBe(schemeLessonCount);
    expect(r.adapted).toBe(0); // AI off → nothing actually written
    expect(r.stopped).toBe(true); // first call comes back "unavailable", so it stops early
  });

  it('the auto-adapt flag is one-shot: maybeAutoAdaptScheme sets it and then never re-fires', async () => {
    if (!gc) return;
    await setGroupCourseAutoAdapted(gc, false);
    expect(await groupCourseAutoAdapted(gc)).toBe(false);
    await maybeAutoAdaptScheme(gc); // has a scheme → sets the flag (then runs a no-op batch with AI off)
    expect(await groupCourseAutoAdapted(gc)).toBe(true);
    await maybeAutoAdaptScheme(gc); // flag set → returns immediately, no throw
    expect(await groupCourseAutoAdapted(gc)).toBe(true);
  });
});
