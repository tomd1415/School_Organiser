import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import AdmZip from 'adm-zip';
import { rm } from 'node:fs/promises';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { checksum } from '../../src/lib/resourceStore';
import { findResourceByChecksum } from '../../src/repos/resources';
import { RESOURCE_STORE_PATH } from '../../src/config/resources';

// The full browser flow over HTTP: upload a zip → review page → commit. The integration config forces
// an empty API key, so the AI titling no-ops and titles fall back to the filename — proving the flow
// works with AI off (the common case for this rare admin task).
let app: FastifyInstance;
let cookie = '';
let token = '';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

function makeDocx(text: string): Buffer {
  const z = new AdmZip();
  z.addFile('word/document.xml', Buffer.from(`<w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>`));
  return z.toBuffer();
}

const PDF = Buffer.from('WEBIMP-pdf-content-7c1d');
const PPTX = Buffer.from('WEBIMP-pptx-content-7c1d');

function buildArchive(): Buffer {
  const topic = new AdmZip();
  topic.addFile('readme.docx', makeDocx('Networks unit. zzaa is the intro, zzbb the quiz.'));
  topic.addFile('zzaa.pdf', PDF);
  topic.addFile('zzbb.pptx', PPTX);
  const outer = new AdmZip();
  outer.addFile('networks/networks.zip', topic.toBuffer());
  return outer.toBuffer();
}

function multipart(zip: Buffer, filename: string): { payload: Buffer; contentType: string } {
  const boundary = '----wsimporttest';
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`),
    zip,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, contentType: `multipart/form-data; boundary=${boundary}` };
}

const createdIds: number[] = [];

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
  if (createdIds.length) {
    await pool.query(`UPDATE resources SET current_version_id = NULL WHERE id = ANY($1)`, [createdIds]);
    await pool.query(`DELETE FROM resource_versions WHERE resource_id = ANY($1)`, [createdIds]);
    await pool.query(`DELETE FROM resources WHERE id = ANY($1)`, [createdIds]);
  }
  await rm(RESOURCE_STORE_PATH, { recursive: true, force: true });
  await pool.end();
});

describe('resource import routes (integration — needs the dev DB up)', () => {
  it('GET /resources/import shows the upload form', async () => {
    const r = await app.inject({ method: 'GET', url: '/resources/import', headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('Import a folder of resources');
    expect(r.body).toContain('name="archive"');
  });

  it('rejects a non-zip upload with a friendly message', async () => {
    const { payload, contentType } = multipart(Buffer.from('not a zip'), 'notes.txt');
    const r = await app.inject({ method: 'POST', url: '/resources/import', headers: { cookie, 'x-csrf-token': token, 'content-type': contentType }, payload });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('.zip');
  });

  it('uploads → reviews → commits, defaulting titles from filenames (AI off)', async () => {
    // Upload → review page.
    const { payload, contentType } = multipart(buildArchive(), 'resources.zip');
    const review = await app.inject({ method: 'POST', url: '/resources/import', headers: { cookie, 'x-csrf-token': token, 'content-type': contentType }, payload });
    expect(review.statusCode).toBe(200);
    expect(review.body).toContain('Review import');
    expect(review.body).toContain('zzaa'); // a default (filename) title is shown

    const batch = /\/resources\/import\/([0-9a-f-]{36})\/commit/.exec(review.body)?.[1];
    expect(batch).toBeTruthy();

    // Collect the staged rows the review form rendered, then tick the two real files for commit.
    const paths = new Map<string, string>();
    for (const m of review.body.matchAll(/name="path_(\d+)" value="([^"]+)"/g)) paths.set(m[1]!, m[2]!);
    const titles = new Map<string, string>();
    for (const m of review.body.matchAll(/name="title_(\d+)" value="([^"]*)"/g)) titles.set(m[1]!, m[2]!);
    const want = [...paths.entries()].filter(([, p]) => p.endsWith('.pdf') || p.endsWith('.pptx'));
    expect(want.length).toBe(2);

    const count = Math.max(...[...paths.keys()].map(Number)) + 1;
    const fields = [`count=${count}`];
    for (const [idx, p] of want) {
      fields.push(`inc_${idx}=1`, `path_${idx}=${encodeURIComponent(p)}`, `title_${idx}=${encodeURIComponent(titles.get(idx) ?? '')}`);
    }
    const commit = await app.inject({
      method: 'POST',
      url: `/resources/import/${batch}/commit`,
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: fields.join('&'),
    });
    expect(commit.statusCode).toBe(200);
    expect(commit.body).toContain('Import complete');
    expect(commit.body).toContain('Imported <strong>2</strong>');

    const idPdf = await findResourceByChecksum(checksum(PDF));
    const idPptx = await findResourceByChecksum(checksum(PPTX));
    expect(idPdf).toBeTruthy();
    expect(idPptx).toBeTruthy();
    createdIds.push(idPdf!, idPptx!);
  });

  it('cancel discards a staged batch without importing', async () => {
    const { payload, contentType } = multipart(buildArchive(), 'resources.zip');
    const review = await app.inject({ method: 'POST', url: '/resources/import', headers: { cookie, 'x-csrf-token': token, 'content-type': contentType }, payload });
    const batch = /\/resources\/import\/([0-9a-f-]{36})\/cancel/.exec(review.body)?.[1];
    expect(batch).toBeTruthy();
    const cancel = await app.inject({ method: 'POST', url: `/resources/import/${batch}/cancel`, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: '' });
    expect(cancel.statusCode).toBe(200);
    expect(cancel.body).toContain('Cancelled');
  });
});
