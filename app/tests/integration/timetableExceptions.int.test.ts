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

    // A real teaching day (in term, not a holiday/INSET/weekend) matching the lesson's weekday — the
    // week timetable now greys non-teaching days, so an exception only shows on an actual school day.
    const day = await pool.query<{ date: string }>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date
         FROM generate_series(DATE '2026-06-01', DATE '2027-07-21', INTERVAL '1 day') AS d
        WHERE EXTRACT(ISODOW FROM d) = $1
          AND EXISTS (SELECT 1 FROM term_dates t WHERE t.kind = 'term' AND d::date BETWEEN t.start_date AND t.end_date)
          AND NOT EXISTS (SELECT 1 FROM term_dates t WHERE t.kind <> 'term' AND d::date BETWEEN t.start_date AND t.end_date)
        ORDER BY d LIMIT 1`,
      [weekday],
    );
    const date = day.rows[0]!.date;

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
