import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { ocClassAndDate, pastLessonsForClass } from '../../src/repos/retrieval';

// The spacing selection is unit-tested in tests/retrieval.test.ts; here we prove the SQL runs against
// the real schema and the lazy endpoint degrades gracefully when there's no occurrence/history.
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

describe('spaced recall (integration — needs the dev DB up)', () => {
  it('ocClassAndDate returns null for an unknown occurrence-course', async () => {
    expect(await ocClassAndDate(999_999_999)).toBeNull();
  });

  it('pastLessonsForClass runs against the real schema', async () => {
    const { rows } = await pool.query<{ id: number }>(`SELECT id FROM group_courses ORDER BY id LIMIT 1`);
    const arr = await pastLessonsForClass(rows[0]?.id ?? 1, '2099-01-01');
    expect(Array.isArray(arr)).toBe(true);
  });

  it('the spaced-recall endpoint is graceful for an unknown occurrence-course', async () => {
    const res = await app.inject({ method: 'GET', url: '/lesson/oc/999999999/spaced-recall', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(''); // nothing to recall → empty, no crash
  });
});
