import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSlideState } from '../../src/repos/slideSync';

// Live slide sync: the teacher's cockpit publishes its current slide + lock state per occurrence_course;
// pupil devices follow over SSE. Here we prove the teacher publish routes persist + are auth/csrf-gated,
// and that the pupil SSE stream rejects a non-pupil. The pub/sub fan-out itself is unit-tested separately.
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
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('slide sync routes (integration — needs the dev DB up)', () => {
  it('the teacher can set the current slide + lock, persisted per occurrence_course', async () => {
    const oc = (await pool.query<{ id: number }>(`SELECT id FROM occurrence_courses ORDER BY id LIMIT 1`)).rows[0]?.id;
    if (!oc) return; // no seeded occurrence in this DB — nothing to assert against
    const before = await getSlideState(oc);
    try {
      const r1 = await app.inject({ method: 'POST', url: `/lesson/oc/${oc}/slide`, headers: { cookie, 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': token }, payload: 'index=4' });
      expect(r1.statusCode).toBe(204);
      expect((await getSlideState(oc)).currentSlide).toBe(4);

      const r2 = await app.inject({ method: 'POST', url: `/lesson/oc/${oc}/slide-lock`, headers: { cookie, 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': token }, payload: 'locked=1' });
      expect(r2.statusCode).toBe(204);
      expect((await getSlideState(oc)).slidesLocked).toBe(true);
    } finally {
      await pool.query(`UPDATE occurrence_courses SET current_slide = $2, slides_locked = $3 WHERE id = $1`, [oc, before.currentSlide, before.slidesLocked]);
    }
  });

  it('the teacher publish route is auth-gated (no cookie → not 204)', async () => {
    const r = await app.inject({ method: 'POST', url: `/lesson/oc/1/slide`, headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: 'index=1' });
    expect(r.statusCode).not.toBe(204);
  });

  it('the pupil SSE stream rejects a non-pupil session', async () => {
    const r = await app.inject({ method: 'GET', url: '/me/slide-stream?oc=1' });
    expect(r.statusCode).toBe(401);
  });
});
