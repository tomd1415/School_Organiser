import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { createResource, addVersion, getCurrentVersion } from '../../src/repos/resources';
import { checksum, readStored, relPathFor, storeBuffer } from '../../src/lib/resourceStore';

// In-browser editing of a generated Markdown resource: the teacher opens the editor, the live
// preview renders it "as it appears", and Save writes a NEW version (the old one is kept).
let app: FastifyInstance;
let cookie = '';
let token = '';
let rid = 0;

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

  // A throwaway worksheet resource (v1).
  rid = await createResource('ZZEDIT worksheet.md', 'worksheet', 'text/markdown', 'ai_generated');
  const v1 = Buffer.from('# Old\n\n| Q | Type your answer here |\n|---|---|\n| Old question? | |\n', 'utf8');
  const rel = relPathFor(rid, 1, 'ZZEDIT worksheet.md');
  await storeBuffer(rel, v1);
  await addVersion(rid, rel, v1.length, checksum(v1), 'ai', 'AI-generated');
});

afterAll(async () => {
  await pool.query(`DELETE FROM resources WHERE id = $1`, [rid]); // cascades resource_versions
  await pool.end();
});

const post = (url: string, payload: string) =>
  app.inject({ method: 'POST', url, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });

describe('resource editing (integration)', () => {
  it('the raw-Markdown editor (?raw=1) shows the source in an editable area', async () => {
    // /edit now defaults to the block editor; ?raw=1 is the raw-Markdown escape hatch.
    const r = await app.inject({ method: 'GET', url: `/resources/${rid}/edit?raw=1`, headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('md-edit-area');
    expect(r.body).toContain('Old question?'); // the current content is loaded for editing
  });

  it('the editor page defaults to the block editor', async () => {
    const r = await app.inject({ method: 'GET', url: `/resources/${rid}/edit`, headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('ws-ed-list');
    expect(r.body).toContain('window.__WSBLOCKS__');
  });

  it('live preview renders a worksheet "as it appears" (an answer box), without saving', async () => {
    const r = await post(`/resources/${rid}/edit/preview`, `content=${encodeURIComponent('# P\n\n| Q | Type your answer here |\n|---|---|\n| Preview only? | |\n')}`);
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('ws-doc-preview');
    expect(r.body).toContain('<textarea'); // the answer space shows
    // not saved — current version is still v1
    expect((await getCurrentVersion(rid))!.versionNo).toBe(1);
  });

  it('saving writes a new version with the edited content; the old version is kept', async () => {
    const edited = '# New title\n\n| Q | Type your answer here |\n|---|---|\n| Brand new question? | |\n';
    const r = await post(`/resources/${rid}/edit`, `content=${encodeURIComponent(edited)}`);
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('saved ✓');
    const v = await getCurrentVersion(rid);
    expect(v!.versionNo).toBe(2); // a NEW version, not an overwrite
    expect((await readStored(v!.storagePath)).toString('utf8')).toBe(edited);
  });

  it('refuses to save an empty document', async () => {
    const r = await post(`/resources/${rid}/edit`, `content=`);
    expect(r.body).toContain('empty');
    expect((await getCurrentVersion(rid))!.versionNo).toBe(2); // unchanged
  });
});
