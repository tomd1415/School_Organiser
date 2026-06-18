import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// End-to-end: a dated exception shows the right per-slot badge on the week timetable.
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

describe('timetable exception badges (integration — needs the dev DB up)', () => {
  it('renders a Free badge on the slot marked free for that date', async () => {
    const { rows } = await pool.query<{ id: number; weekday: number }>(
      `SELECT tl.id, p.weekday FROM timetabled_lessons tl
         JOIN period_definitions p ON p.id = tl.period_definition_id
        WHERE tl.purpose = 'teaching' AND p.weekday BETWEEN 1 AND 5
        ORDER BY tl.id LIMIT 1`,
    );
    const lessonId = rows[0]!.id;
    const weekday = rows[0]!.weekday;

    // a far-future date whose weekday matches the lesson's slot (1=Mon … 5=Fri)
    let d = new Date(Date.UTC(2099, 2, 2));
    while (((d.getUTCDay() + 6) % 7) + 1 !== weekday) d = new Date(d.getTime() + 86_400_000);
    const date = d.toISOString().slice(0, 10);

    const ins = await pool.query<{ id: number }>(
      `INSERT INTO lesson_exceptions (date, timetabled_lesson_id, kind, note) VALUES ($1,$2,'free','Y9 trip') RETURNING id`,
      [date, lessonId],
    );
    exId = ins.rows[0]!.id;

    const res = await app.inject({ method: 'GET', url: `/timetable?date=${date}`, headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('tt-ex-free'); // the Free badge landed on the right slot (date:lessonId match)
    expect(res.body).toContain('Y9 trip'); // its note carried into the badge tooltip
  });
});
