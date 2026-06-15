import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { RESOURCE_STORE_PATH } from '../../src/config/resources';

// Pupil screenshot paste: an image stored as the answer (value `img:<path>`) and served back,
// access-scoped. Driven via the TEST PUPIL overlay (a teacher session) so no class code/PIN is needed.
let app: FastifyInstance;
let cookie = '';
let token = '';
let oc = 0;
let storedPath = '';
const KEY = 't9.r9.c9';

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

  // Activate the test-pupil overlay (any lesson — just to set testPupilId on the session).
  const lid = Number((await pool.query<{ id: number }>(`SELECT id FROM timetabled_lessons WHERE purpose='teaching' ORDER BY id LIMIT 1`)).rows[0]!.id);
  const open = await app.inject({ method: 'POST', url: '/test-pupil/open', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: `lesson=${lid}&date=2099-04-04&level=core` });
  cookie = firstCookie(open.headers['set-cookie']) || cookie;
  // Use an EXISTING occurrence_course (the test pupil bypasses the access check); we only ever add
  // and remove the test pupil's own answer rows, so the teacher's real data is untouched.
  oc = Number((await pool.query<{ id: number }>(`SELECT id FROM occurrence_courses ORDER BY id LIMIT 1`)).rows[0]?.id ?? 0);
});

afterAll(async () => {
  if (oc) {
    await pool.query(
      `DELETE FROM pupil_answers WHERE occurrence_course_id=$1 AND field_key = ANY($2) AND pupil_id = (SELECT id FROM pupils WHERE is_test LIMIT 1)`,
      [oc, [KEY, 't8.r8.c8']],
    );
  }
  if (storedPath) await rm(join(RESOURCE_STORE_PATH, storedPath), { force: true }).catch(() => {});
  await pool.end();
});

function multipartPng(): { body: Buffer; contentType: string } {
  const boundary = '----wsphototest';
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]); // PNG sig + filler
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="shot.png"\r\nContent-Type: image/png\r\n\r\n`),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

describe('pupil screenshot paste (integration)', () => {
  it('stores a pasted image as the answer and serves it back to the teacher', async () => {
    expect(oc).toBeGreaterThan(0);
    const { body, contentType } = multipartPng();
    const up = await app.inject({ method: 'POST', url: `/me/answer-image?oc=${oc}&key=${KEY}`, headers: { cookie, 'x-csrf-token': token, 'content-type': contentType }, payload: body });
    expect(up.statusCode).toBe(200);
    expect(up.body).toContain('<img class="ws-shot"');
    expect(up.body).toContain('/pupil-image?p=');

    const row = await pool.query<{ value: string }>(`SELECT value FROM pupil_answers WHERE occurrence_course_id=$1 AND field_key=$2`, [oc, KEY]);
    expect(row.rows[0]!.value).toMatch(/^img:pupil-work\//);
    storedPath = row.rows[0]!.value.slice(4);

    const served = await app.inject({ method: 'GET', url: `/pupil-image?p=${encodeURIComponent(storedPath)}`, headers: { cookie } });
    expect(served.statusCode).toBe(200);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.headers['content-type']).toContain('image/png');
  });

  it('rejects path traversal and unauthenticated access', async () => {
    const trav = await app.inject({ method: 'GET', url: `/pupil-image?p=${encodeURIComponent('pupil-work/../../etc/passwd')}`, headers: { cookie } });
    expect(trav.statusCode).toBe(400);
    const noauth = await app.inject({ method: 'GET', url: `/pupil-image?p=${encodeURIComponent(storedPath || 'pupil-work/1/1/x.png')}` });
    expect(noauth.statusCode).toBe(403);
  });

  it('refuses a non-image upload (no SVG / scripts)', async () => {
    const boundary = '----wsbad';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.svg"\r\nContent-Type: image/svg+xml\r\n\r\n<svg onload="alert(1)"></svg>\r\n--${boundary}--\r\n`),
    ]);
    const r = await app.inject({ method: 'POST', url: `/me/answer-image?oc=${oc}&key=t8.r8.c8`, headers: { cookie, 'x-csrf-token': token, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: body });
    expect(r.statusCode).toBe(400);
  });
});
