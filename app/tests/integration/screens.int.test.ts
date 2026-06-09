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

  it('Oversee page renders the week of supervised lessons', async () => {
    const res = await app.inject({ method: 'GET', url: '/oversee', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Lessons I oversee');
    expect(res.body).toMatch(/ov-day|No lessons to oversee/);
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
    expect(res.body).toContain('ld-res'); // bound plan's resources surface here (3.8)
  });

  it('Tasks page renders with a new-task button', async () => {
    const res = await app.inject({ method: 'GET', url: '/tasks', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Tasks');
    expect(res.body).toContain('data-new-note');
  });

  it('Events page renders with a new-event button', async () => {
    const res = await app.inject({ method: 'GET', url: '/events', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("What's coming");
    expect(res.body).toContain('data-new-note');
  });

  it('Time page renders work windows', async () => {
    const res = await app.inject({ method: 'GET', url: '/time', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Work windows');
  });

  it('Focus page renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/focus', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('focus-inner');
  });

  it('Captured page renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/captured', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Captured');
    expect(res.body).toContain('data-new-note');
  });

  it('Recurring page renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/recurring', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Recurring tasks');
  });

  it('Schemes page renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Schemes of work');
    expect(res.body).toContain('scheme-tree');
  });

  it('Resources page renders with search bar + paged list', async () => {
    const res = await app.inject({ method: 'GET', url: '/resources', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Resources');
    expect(res.body).toContain('res-upload');
    expect(res.body).toContain('res-search');
    expect(res.body).toContain('id="res-list"');
    expect(res.body).toMatch(/\d+ resources?/);
  });

  it('Resources search partial filters and paginates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/resources/list?q=lesson&kind=document&page=1',
      headers: { cookie: session },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('id="res-list"');
    expect(res.body).toContain('res-pager');
    expect(res.body).toMatch(/matching/); // the count line echoes the active filter
  });

  it('attaches then detaches a resource on a lesson plan (3.8, authed + CSRF)', async () => {
    const c = await pool.query<{ id: number }>(`SELECT id FROM courses ORDER BY id LIMIT 1`);
    const lp = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (course_id, title) VALUES ($1, 'TEST 3.8 plan') RETURNING id`,
      [c.rows[0]!.id],
    );
    const planId = lp.rows[0]!.id;
    const r = await pool.query<{ id: number }>(`SELECT id FROM resources WHERE active ORDER BY id LIMIT 1`);
    const resId = r.rows[0]!.id;
    try {
      // A CSRF token + the session cookie that carries its secret come from a page render.
      const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
      const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']) || session;

      const attach = await app.inject({
        method: 'POST',
        url: `/schemes/plan/${planId}/resources`,
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `resource_id=${resId}`,
      });
      expect(attach.statusCode).toBe(200);
      expect(attach.body).toContain(`plan-${planId}-res`);
      const linked = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM resource_links WHERE lesson_plan_id = $1 AND resource_id = $2`,
        [planId, resId],
      );
      expect(linked.rows[0]!.n).toBe(1);

      const detach = await app.inject({
        method: 'POST',
        url: `/schemes/plan/${planId}/resources/${resId}/detach`,
        headers: { cookie, 'x-csrf-token': token },
      });
      expect(detach.statusCode).toBe(200);
      expect(detach.body).toContain('no resources linked');
    } finally {
      await pool.query(`DELETE FROM resource_links WHERE lesson_plan_id = $1`, [planId]);
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [planId]);
    }
  });
});
