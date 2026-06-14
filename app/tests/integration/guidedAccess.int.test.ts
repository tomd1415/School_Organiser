import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getGuidedAccess } from '../../src/repos/adaptations';
import { accessItemsFor } from '../../src/services/accessConstraints';

// idea 7 — the per-class guided-access questionnaire: saved via the route, read back by the repo,
// and turned into a context[] item by the service. Mutates one real group_course row, snapshotting
// and restoring its guided_access so the teacher's data is untouched.
let app: FastifyInstance;
let cookie = '';
let token = '';
let gcId: number | null = null;
let snapshot: unknown = null;

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
    method: 'POST', url: '/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
    payload: `_csrf=${encodeURIComponent(token)}&password=test`,
  });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
  const r = await pool.query<{ id: number; ga: unknown }>(`SELECT id, guided_access AS ga FROM group_courses ORDER BY id LIMIT 1`);
  if (r.rows[0]) {
    gcId = r.rows[0].id;
    snapshot = r.rows[0].ga;
  }
});

afterAll(async () => {
  if (gcId != null) {
    await pool.query(`UPDATE group_courses SET guided_access = $2::jsonb WHERE id = $1`, [gcId, snapshot == null ? null : JSON.stringify(snapshot)]);
  }
  await app.close();
  await pool.end();
});

const save = (payload: string) =>
  app.inject({ method: 'POST', url: `/lesson/group-access/${gcId}`, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });

describe('guided cohort-access (integration)', () => {
  it('the group-context fragment renders the access-needs questionnaire', async () => {
    if (gcId == null) return; // no classes in the dev DB — nothing to render against
    const res = await app.inject({ method: 'GET', url: `/lesson/group-context/${gcId}`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('access needs');
    expect(res.body).toContain('name="viFont"');
  });

  it('saving the questionnaire persists answers and derives a constraint item', async () => {
    if (gcId == null) return;
    const res = await save('viFont=18&shortAttention=on&readingAge=8');
    expect(res.statusCode).toBe(200);
    expect(await getGuidedAccess(gcId)).toEqual({ viFont: 18, shortAttention: true, readingAge: '8' });
    const items = await accessItemsFor(gcId);
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('18pt');
    expect(items[0]!.text).toContain('reading age 8');
  });

  it('clearing the form removes the answers (back to a no-op)', async () => {
    if (gcId == null) return;
    const res = await save('viFont=&readingAge=');
    expect(res.statusCode).toBe(200);
    expect(await getGuidedAccess(gcId)).toBeNull();
    expect(await accessItemsFor(gcId)).toEqual([]);
  });

  it('rejects an out-of-range font without persisting garbage', async () => {
    if (gcId == null) return;
    await save('viFont=2'); // below the 8pt floor → dropped, not stored
    expect(await getGuidedAccess(gcId)).toBeNull();
  });
});
