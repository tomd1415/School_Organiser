import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// The fictitious TEST PUPIL: a teacher (authed) can drive the real /me pupil surface for ANY lesson
// at ANY time and ANY level, bypassing the time-gate and the DPIA access gate — without losing the
// teacher session. Uses a far-future throwaway occurrence so the teacher's real data is untouched.
let app: FastifyInstance;
let cookie = '';
let token = '';

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
    method: 'POST',
    url: '/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
    payload: `_csrf=${encodeURIComponent(token)}&password=test`,
  });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await pool.end();
});

describe('test pupil (integration)', () => {
  it('opens any lesson on the pupil surface, gates bypassed, teacher session intact', async () => {
    const slot = (await pool.query<{ id: number }>(`SELECT id FROM timetabled_lessons WHERE purpose='teaching' ORDER BY id LIMIT 1`)).rows[0]!;
    const futureDate = '2099-03-03'; // a throwaway occurrence — never a real teaching record
    let occId = 0;
    try {
      // The in-page (HTMX) launcher gets an HX-Redirect so the SPA-style shell swaps to /me…
      const open = await app.inject({
        method: 'POST',
        url: '/test-pupil/open',
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded', 'hx-request': 'true' },
        payload: `lesson=${slot.id}&date=${futureDate}&level=core`,
      });
      expect(open.statusCode).toBe(200);
      expect(open.headers['hx-redirect']).toBe('/me');
      // …while a plain (non-HTMX) submit — the cockpit's "🧪 Test as pupil" new-tab form — gets a normal
      // 302 redirect so the new tab lands directly on the pupil view.
      const openTab = await app.inject({
        method: 'POST',
        url: '/test-pupil/open',
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `lesson=${slot.id}&date=${futureDate}&level=core`,
      });
      expect(openTab.statusCode).toBe(302);
      expect(openTab.headers.location).toBe('/me');
      cookie = firstCookie(open.headers['set-cookie']) || cookie; // session now carries testPupilId

      // The fictitious test pupil now exists (find-or-create) and is excluded from the real roster.
      const tp = (await pool.query<{ id: number }>(`SELECT id FROM pupils WHERE is_test LIMIT 1`)).rows[0];
      expect(tp).toBeDefined();

      // /me renders the test view for the chosen lesson — a 200 with the test banner, NOT a redirect
      // to /pupil (so the DPIA access gate AND the clock gate are both bypassed for the test pupil).
      const me = await app.inject({ method: 'GET', url: '/me', headers: { cookie } });
      expect(me.statusCode).toBe(200);
      expect(me.body).toContain('Test pupil');
      expect(me.body).toContain('exit test');
      occId = (await pool.query<{ id: number }>(`SELECT id FROM lesson_occurrences WHERE timetabled_lesson_id=$1 AND date=$2`, [slot.id, futureDate])).rows[0]?.id ?? 0;

      // Exiting clears the overlay; /me is no longer a test pupil → redirect (the teacher session
      // itself was never replaced — role stayed 'teacher' throughout).
      const exit = await app.inject({
        method: 'POST',
        url: '/test-pupil/exit',
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: '',
      });
      cookie = firstCookie(exit.headers['set-cookie']) || cookie;
      const meAfter = await app.inject({ method: 'GET', url: '/me', headers: { cookie } });
      expect(meAfter.statusCode).toBe(302);
    } finally {
      if (occId) await pool.query(`DELETE FROM lesson_occurrences WHERE id = $1`, [occId]); // cascades occurrence_courses
    }
  });
});
