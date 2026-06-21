import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getPupilAtl } from '../../src/repos/atl';

// ATL (attitude to learning): a 1–4 score per pupil per lesson, set in the marking modal or the live
// class grid. Drives the shared picker (POST .../atl) + the grid page (GET .../atl), teacher-only.
let app: FastifyInstance;
let cookie = '';
let token = '';
let oc = 0;
let pid = 0;

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
  // An occurrence-course + a pupil ENROLLED in its group (so pupilCanAccessOc passes).
  const { rows } = await pool.query<{ oc: number; pid: number }>(
    `SELECT oc.id AS oc, e.pupil_id AS pid
     FROM occurrence_courses oc
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN enrolments e ON e.group_id = gc.group_id AND e.active
     ORDER BY oc.id LIMIT 1`,
  );
  oc = rows[0]?.oc ?? 0;
  pid = rows[0]?.pid ?? 0;
});

afterAll(async () => {
  if (oc && pid) await pool.query(`DELETE FROM pupil_atl WHERE occurrence_course_id = $1 AND pupil_id = $2`, [oc, pid]);
  await app.close();
  await pool.end();
});

const postAtl = (score: number | string) =>
  app.inject({
    method: 'POST',
    url: `/lesson/oc/${oc}/pupil/${pid}/atl`,
    headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
    payload: `score=${score}`,
  });

describe('ATL (attitude to learning) — set + grid (integration)', () => {
  it('saves a 1–4 score, persists it, and returns the picker with that score selected', async () => {
    expect(oc).toBeGreaterThan(0);
    const r = await postAtl(3);
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('atl-3 on'); // the chosen button is marked selected
    expect(await getPupilAtl(pid, oc)).toBe(3);
    // re-scoring updates in place
    expect((await postAtl(2)).statusCode).toBe(200);
    expect(await getPupilAtl(pid, oc)).toBe(2);
  });

  it('rejects an out-of-range score (0 or 5) — the score is 1–4 only', async () => {
    expect((await postAtl(0)).statusCode).toBe(400);
    expect((await postAtl(5)).statusCode).toBe(400);
    expect(await getPupilAtl(pid, oc)).toBe(2); // unchanged by the rejected writes
  });

  it('renders the live whole-class ATL grid with a picker per pupil', async () => {
    const r = await app.inject({ method: 'GET', url: `/lesson/oc/${oc}/atl`, headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('Attitude to learning');
    expect(r.body).toContain(`data-atl-pid="${pid}"`); // the pupil's picker is on the page
  });
});
