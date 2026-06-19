import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { coverPackSource } from '../../src/repos/cover';

// The cover-pack reuses the proven generate→store path; here we prove the source SQL runs and the
// route spends nothing (writes no resource) when AI is unavailable (the integration env forces an
// empty key). The cohort context builder is unit-tested in tests/coverPack.test.ts.
let app: FastifyInstance;
let session = '';

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
  await app.close();
  await pool.end();
});

describe('cover-pack generator (integration — needs the dev DB up)', () => {
  it('coverPackSource returns null for an unknown occurrence-course', async () => {
    expect(await coverPackSource(999_999_999)).toBeNull();
  });

  it('writes no resource when AI is unavailable (empty key)', async () => {
    const withPlan = await pool.query<{ id: number }>(
      `SELECT oc.id FROM occurrence_courses oc JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
        WHERE coalesce(lp.objectives, '') <> '' ORDER BY oc.id LIMIT 1`,
    );
    const anyOc = await pool.query<{ id: number }>(`SELECT id FROM occurrence_courses ORDER BY id LIMIT 1`);
    const oc = withPlan.rows[0]?.id ?? anyOc.rows[0]?.id;
    if (!oc) return; // no occurrences in dev → nothing to exercise

    const before = (await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM resources`)).rows[0]!.n;
    const page = await app.inject({ method: 'GET', url: '/', headers: { cookie: session } });
    const csrf = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const res = await app.inject({ method: 'POST', url: `/lesson/oc/${oc}/cover-pack`, headers: { cookie: session, 'x-csrf-token': csrf } });
    expect(res.statusCode).toBe(200);
    const after = (await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM resources`)).rows[0]!.n;
    expect(after).toBe(before); // no resource created without a real AI call
  });
});
