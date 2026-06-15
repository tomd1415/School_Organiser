import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { createResource, addVersion, getCurrentVersion } from '../../src/repos/resources';
import { checksum, readStored, relPathFor, storeBuffer } from '../../src/lib/resourceStore';
import { renderWorksheet } from '../../src/lib/worksheetForm';

// The block (WYSIWYG) editor: the editor page seeds parsed blocks; preview/save take a block list and
// the server serialises them back to Markdown (preserving marking field keys); image upload returns a
// pupil-serveable /lesson-image URL.
let app: FastifyInstance;
let cookie = '';
let token = '';
let rid = 0;
let imgId = 0;

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}
const fieldSig = (md: string): string => renderWorksheet(md, { mode: 'review' }).fields.map((f) => `${f.key}:${f.kind}`).join('|');

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;

  rid = await createResource('ZZBLK worksheet.md', 'worksheet', 'text/markdown', 'ai_generated');
  const md = '# W\n\n## 🟢 Support\n\n| Question | Type your answer here |\n|---|---|\n| What is a list? | |\n';
  const rel = relPathFor(rid, 1, 'ZZBLK worksheet.md');
  await storeBuffer(rel, Buffer.from(md, 'utf8'));
  await addVersion(rid, rel, md.length, checksum(md), 'ai', 'AI-generated');
});

afterAll(async () => {
  await pool.query(`DELETE FROM resources WHERE id = ANY($1)`, [[rid, imgId].filter(Boolean)]);
  await pool.end();
});

const postJson = (url: string, body: unknown) =>
  app.inject({ method: 'POST', url, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/json' }, payload: JSON.stringify(body) });

describe('block editor (integration)', () => {
  it('the editor page seeds the parsed blocks', async () => {
    const r = await app.inject({ method: 'GET', url: `/resources/${rid}/edit`, headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('ws-ed-list');
    expect(r.body).toContain('window.__WSBLOCKS__');
    expect(r.body).toContain('What is a list?'); // the parsed question is present
  });

  it('preview-blocks renders the pupil worksheet view for a posted block list', async () => {
    const r = await postJson(`/resources/${rid}/preview-blocks`, {
      blocks: [{ type: 'qtable', rows: [{ q: 'Why use a loop?', kind: 'text' }, { q: 'Show your code', kind: 'screenshot' }] }],
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('ws-doc-preview');
    expect(r.body).toContain('Why use a loop?');
    expect(r.body).toContain('ws-paste'); // the screenshot row → paste zone
  });

  it('edit-blocks saves a NEW version; the serialised markdown keeps the field keys', async () => {
    const blocks = [
      { type: 'heading', depth: 2, text: '🟢 Support' },
      { type: 'text', text: 'Open Thonny.' },
      { type: 'qtable', rows: [{ q: 'What is a variable?', kind: 'text' }, { q: 'Screenshot it', kind: 'screenshot' }] },
      { type: 'checklist', items: ['I ran my code'] },
    ];
    const r = await postJson(`/resources/${rid}/edit-blocks`, { blocks });
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.ok).toBe(true);
    expect(body.version).toBe(2);
    const v = await getCurrentVersion(rid);
    const saved = (await readStored(v!.storagePath)).toString('utf8');
    // a text field, an image field and a check field, all under the support level
    const sig = fieldSig(saved);
    expect(sig).toContain(':text');
    expect(sig).toContain(':image');
    expect(sig).toContain(':check');
    expect(saved).toContain('## 🟢 Support');
  });

  it('image upload stores an image and serves it via /lesson-image (pupil-safe)', async () => {
    const boundary = '----wsedimg';
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9]);
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="d.png"\r\nContent-Type: image/png\r\n\r\n`),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const up = await app.inject({ method: 'POST', url: `/resources/${rid}/image`, headers: { cookie, 'x-csrf-token': token, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload });
    expect(up.statusCode).toBe(200);
    const d = JSON.parse(up.body);
    expect(d.url).toMatch(/^\/lesson-image\/\d+$/);
    imgId = Number(d.url.split('/').pop());
    const served = await app.inject({ method: 'GET', url: d.url, headers: { cookie } });
    expect(served.statusCode).toBe(200);
    expect(served.headers['content-type']).toContain('image/png');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });
});
