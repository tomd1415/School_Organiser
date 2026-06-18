import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// End-to-end: a dated free exception on a teaching slot makes /time treat it as availability.
let app: FastifyInstance;
let session = '';
let exId = 0;

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({
    method: 'POST',
    url: '/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
    payload: `_csrf=${encodeURIComponent(token)}&password=test`,
  });
  session = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  if (exId) await pool.query(`DELETE FROM lesson_exceptions WHERE id = $1`, [exId]);
  await app.close();
  await pool.end();
});

describe('/time availability honours dated exceptions (integration — needs the dev DB up)', () => {
  it('a free exception on a teaching slot is adjusted into the work windows', async () => {
    const { rows } = await pool.query<{ id: number; weekday: number }>(
      `SELECT tl.id, p.weekday FROM timetabled_lessons tl
         JOIN period_definitions p ON p.id = tl.period_definition_id
         JOIN staff s ON s.id = tl.staff_id
        WHERE tl.purpose = 'teaching' AND s.is_self AND p.weekday BETWEEN 1 AND 5
        ORDER BY tl.id LIMIT 1`,
    );
    const lessonId = rows[0]!.id;
    const weekday = rows[0]!.weekday;

    // a far-future date whose weekday matches the lesson's slot (1=Mon … 5=Fri)
    let dt = new Date(Date.UTC(2099, 2, 2));
    while (((dt.getUTCDay() + 6) % 7) + 1 !== weekday) dt = new Date(dt.getTime() + 86_400_000);
    const date = dt.toISOString().slice(0, 10);

    const before = await app.inject({ method: 'GET', url: `/time?date=${date}`, headers: { cookie: session } });
    expect(before.statusCode).toBe(200);
    expect(before.body).not.toContain('win-ex-note'); // no exception yet

    const ins = await pool.query<{ id: number }>(
      `INSERT INTO lesson_exceptions (date, timetabled_lesson_id, kind, note) VALUES ($1,$2,'free','Y9 trip') RETURNING id`,
      [date, lessonId],
    );
    exId = ins.rows[0]!.id;

    const after = await app.inject({ method: 'GET', url: `/time?date=${date}`, headers: { cookie: session } });
    expect(after.statusCode).toBe(200);
    expect(after.body).toContain('win-ex-note'); // the slot was folded into availability (lessonId matched)
  });
});
