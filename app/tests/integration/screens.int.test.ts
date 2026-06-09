import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// End-to-end render of the authenticated screens against the dev DB. Logs in with
// the password "test" (its hash is set in vitest.integration.config.ts).
let app: FastifyInstance;
let session = '';
const LESSON_DATE = '2099-03-03';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
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
  expect(res.statusCode).toBe(302); // login succeeded
  session = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await app.close();
  await pool.query(`DELETE FROM lesson_occurrences WHERE date = $1`, [LESSON_DATE]);
  await pool.end();
});

describe('authenticated screens (integration — needs the dev DB up)', () => {
  it('Timetable renders the real week (grid + a seeded group)', async () => {
    const res = await app.inject({ method: 'GET', url: '/timetable', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('tt-table');
    expect(res.body).toContain('8PFA');
  });

  it('Now clock strip renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/now/clock', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('now-strip');
  });

  it('Notes page renders with a new-note button', async () => {
    const res = await app.inject({ method: 'GET', url: '/notes', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('data-new-note');
  });

  it('Lesson detail renders with stopping point + notes composer', async () => {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM timetabled_lessons WHERE purpose = 'teaching' ORDER BY id LIMIT 1`,
    );
    const lessonId = rows[0]?.id ?? 0;
    const res = await app.inject({
      method: 'GET',
      url: `/lesson?lesson=${lessonId}&date=${LESSON_DATE}`,
      headers: { cookie: session },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Stopping point');
    expect(res.body).toContain('data-new-note');
  });

  it('Tasks page renders with a new-task button', async () => {
    const res = await app.inject({ method: 'GET', url: '/tasks', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Tasks');
    expect(res.body).toContain('data-new-note');
  });
});
