import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { conceptItemsFor } from '../../src/services/teachingConcepts';
import { listActiveConceptsForCourse } from '../../src/repos/concepts';

// idea 1.1 — the teaching-concepts library: add via the route, it becomes an active row, the service
// turns active concepts into a context[] item, and archiving removes it from generation. All test
// rows use a distinctive title and are deleted in afterAll (kept out of the teacher's real data).
const TAG = 'ZZINTTEST';
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
    method: 'POST', url: '/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
    payload: `_csrf=${encodeURIComponent(token)}&password=test`,
  });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await pool.query(`DELETE FROM teaching_concepts WHERE title LIKE $1`, [`${TAG}%`]);
  await app.close();
  await pool.end();
});

describe('teaching concepts (integration)', () => {
  it('the page renders and a new global concept can be added', async () => {
    const get = await app.inject({ method: 'GET', url: '/concepts', headers: { cookie } });
    expect(get.statusCode).toBe(200);
    expect(get.body).toContain('<h1>Teaching concepts</h1>');
    const add = await app.inject({
      method: 'POST', url: '/concepts/add',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `title=${encodeURIComponent(`${TAG} CPU as office`)}&course=`,
    });
    expect(add.statusCode).toBe(200);
    expect(add.body).toContain(`${TAG} CPU as office`);
  });

  it('a global concept is returned for any course and becomes a context item', async () => {
    const forSome = await listActiveConceptsForCourse(999999); // a course with no own concepts
    expect(forSome.some((c) => c.title === `${TAG} CPU as office`)).toBe(true); // global applies everywhere
    const items = await conceptItemsFor(999999);
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain(`${TAG} CPU as office`);
  });

  it('archiving a concept removes it from generation (active list)', async () => {
    const { rows } = await pool.query<{ id: number }>(`SELECT id FROM teaching_concepts WHERE title = $1`, [`${TAG} CPU as office`]);
    const id = rows[0]!.id;
    const res = await app.inject({ method: 'POST', url: `/concepts/${id}/archive`, headers: { cookie, 'x-csrf-token': token } });
    expect(res.statusCode).toBe(200);
    const items = await conceptItemsFor(999999);
    expect(items).toEqual([]); // archived ⇒ not woven in
  });
});
