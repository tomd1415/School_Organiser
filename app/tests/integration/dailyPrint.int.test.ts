import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// BUG-047: /today/print must honour the academic calendar — a holiday has no lessons to print, and the
// request must NOT materialise occurrence rows for it (the print was creating ghosts).
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
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  session = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('daily print honours the calendar (integration — BUG-047)', () => {
  it('a holiday prints "no teaching" and materialises no occurrence', async () => {
    const date = '2026-10-26'; // Autumn half-term (seeded for 2026/27) — a non-teaching day
    const before = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM lesson_occurrences WHERE date = $1`, [date]);
    const res = await app.inject({ method: 'GET', url: `/today/print?date=${date}`, headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('No teaching on this day');
    const after = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM lesson_occurrences WHERE date = $1`, [date]);
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n); // no ghost occurrence rows created
  });
});
