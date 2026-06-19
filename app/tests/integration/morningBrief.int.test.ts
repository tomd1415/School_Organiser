import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { coverageAtRisk } from '../../src/repos/brief';

// The morning-brief query is non-trivial SQL, and the brief gather runs on every Now render — prove
// both execute against the real schema. (Content logic is unit-tested in tests/brief.test.ts.)
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

describe('morning brief (integration — needs the dev DB up)', () => {
  it('coverageAtRisk() runs against the real schema', async () => {
    const rows = await coverageAtRisk();
    expect(Array.isArray(rows)).toBe(true);
    for (const r of rows) {
      expect(r.covered).toBeLessThanOrEqual(r.total); // covered is a subset of total
      expect(typeof r.courseName).toBe('string');
    }
  });

  it('the Now page renders with the brief gather active', async () => {
    const res = await app.inject({ method: 'GET', url: '/', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('now-screen'); // brief gather (coverageAtRisk + next-day + buildBrief) ran without error
  });
});
