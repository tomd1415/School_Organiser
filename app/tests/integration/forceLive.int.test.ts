import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// Force-live dev mode: open ANY lesson's live cockpit at any date + a fictitious test pupil, on demand.
// The launcher lists lessons → /lesson?lesson=&date=; "Test as pupil" opens /me in a new tab via a plain
// (non-HTMX) POST that gets a normal redirect.
let app: FastifyInstance;
let cookie = '';
let token = '';
function firstCookie(sc: string | string[] | undefined): string {
  const v = Array.isArray(sc) ? sc[0] : sc;
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
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('force-live dev mode', () => {
  it('GET /dev/force-live lists timetabled lessons linking to the live cockpit', async () => {
    const res = await app.inject({ method: 'GET', url: '/dev/force-live', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Test a live lesson');
    expect(res.body).toContain('type="date"'); // date picker (default today)
    expect(res.body).toMatch(/\/lesson\?lesson=\d+&(?:amp;)?date=\d{4}-\d{2}-\d{2}/); // a cockpit link
  });

  it('honours the ?date param for the cockpit links', async () => {
    const res = await app.inject({ method: 'GET', url: '/dev/force-live?date=2026-05-04', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('value="2026-05-04"');
    if (/\/lesson\?lesson=/.test(res.body)) expect(res.body).toContain('date=2026-05-04');
  });

  it('is teacher-only', async () => {
    const res = await app.inject({ method: 'GET', url: '/dev/force-live' }); // no cookie
    expect(res.statusCode).not.toBe(200);
  });

  it('a plain (non-HTMX) /test-pupil/open redirects to /me (so a new-tab form lands on the pupil view)', async () => {
    const lesson = (await pool.query<{ id: number }>(`SELECT id FROM timetabled_lessons LIMIT 1`)).rows[0]?.id;
    if (!lesson) return;
    const res = await app.inject({
      method: 'POST', url: '/test-pupil/open',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': token },
      payload: `lesson=${lesson}&date=2026-06-23&level=core`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/me');
  });

  it('an HTMX /test-pupil/open still returns HX-Redirect (the in-page launcher)', async () => {
    const lesson = (await pool.query<{ id: number }>(`SELECT id FROM timetabled_lessons LIMIT 1`)).rows[0]?.id;
    if (!lesson) return;
    const res = await app.inject({
      method: 'POST', url: '/test-pupil/open',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': token, 'hx-request': 'true' },
      payload: `lesson=${lesson}&date=2026-06-23&level=core`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['hx-redirect']).toBe('/me');
  });
});
