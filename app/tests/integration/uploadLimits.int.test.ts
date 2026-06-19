import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// BUG-006: image routes must enforce their 12 MB cap by STOPPING the stream at the limit (route-level
// fileSize), not by buffering up to the global 500 MB and checking length afterwards. (The accept path
// for a small image is covered by resourceBlocks.int.test.) The bounded-stream probe: a 12 MB+ body
// must be rejected 413.
let app: FastifyInstance;
let cookie = '';
let token = '';

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}

/** A multipart body carrying a single image part of `bytes` bytes (content is irrelevant to the cap). */
function imagePart(bytes: number): { payload: Buffer; contentType: string } {
  const boundary = '----wsuploadlimit';
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.png"\r\nContent-Type: image/png\r\n\r\n`),
    Buffer.alloc(bytes, 0x41),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, contentType: `multipart/form-data; boundary=${boundary}` };
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

describe('upload size limits (integration — BUG-006)', () => {
  it('rejects an over-limit editor image (12 MB + a bit) with 413 — stream aborted, not buffered to 500 MB', async () => {
    const { payload, contentType } = imagePart(12 * 1024 * 1024 + 4096);
    const res = await app.inject({
      method: 'POST',
      url: '/resources/1/image',
      headers: { cookie, 'x-csrf-token': token, 'content-type': contentType },
      payload,
    });
    expect(res.statusCode).toBe(413);
    // and nothing was stored (the route returns before createResource)
    const orphan = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM resources WHERE title = 'big.png'`);
    expect(orphan.rows[0]!.n).toBe(0);
  });
});
