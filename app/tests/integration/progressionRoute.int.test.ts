import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSchemeForClass } from '../../src/repos/progression';

// 16A.2 — the Stages & strands admin route, against the seeded schemes (year ladder + GCSE). Binds a real
// class to a scheme then clears it; everything else is read-only.
let app: FastifyInstance;
let cookie = '';
let token = '';
let gcId = 0;
let yearLadderId = 0;

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
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
  gcId = Number((await pool.query<{ id: number }>(`SELECT id FROM group_courses WHERE active ORDER BY id LIMIT 1`)).rows[0]!.id);
  yearLadderId = Number((await pool.query<{ id: number }>(`SELECT id FROM progression_schemes WHERE kind = 'year_ladder' ORDER BY id LIMIT 1`)).rows[0]!.id);
});

afterAll(async () => {
  await pool.query(`DELETE FROM group_course_scheme WHERE group_course_id = $1`, [gcId]).catch(() => {});
  await app.close();
  await pool.end();
});

describe('progression admin route (integration)', () => {
  it('lists the seeded schemes', async () => {
    const r = await app.inject({ method: 'GET', url: '/progression', headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('Computing year ladder');
    expect(r.body).toContain('GCSE Computer Science');
  });

  it('renders a scheme Stage × Strand grid with strand codes', async () => {
    const r = await app.inject({ method: 'GET', url: `/progression/scheme/${yearLadderId}`, headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('PG'); // a strand code column header
    expect(r.body).toContain('Stage');
  });

  it('assigns a scheme to a class (and the binding round-trips)', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/progression/assign',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `gc=${gcId}&scheme=${yearLadderId}`,
    });
    expect([200, 302]).toContain(r.statusCode);
    expect(await getSchemeForClass(gcId)).toBe(yearLadderId);
  });

  it('clearing the scheme (— none —) unbinds the class', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/progression/assign',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `gc=${gcId}&scheme=`,
    });
    expect([200, 302]).toContain(r.statusCode);
    expect(await getSchemeForClass(gcId)).toBeNull();
  });
});
