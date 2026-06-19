import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import AdmZip from 'adm-zip';
import { rm } from 'node:fs/promises';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { checksum } from '../../src/lib/resourceStore';
import { findResourceByChecksum } from '../../src/repos/resources';
import { RESOURCE_STORE_PATH } from '../../src/config/resources';

// The full browser flow over HTTP for a FOLDER upload (webkitdirectory sends each file with its
// relative path). The integration config forces an empty API key, so titles/unit fall back to the
// folder + filenames and the user fills the unit fields in — which is what we post on commit.
let app: FastifyInstance;
let cookie = '';
let token = '';

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}

function makeDocx(text: string): Buffer {
  const z = new AdmZip();
  z.addFile('word/document.xml', Buffer.from(`<w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>`));
  return z.toBuffer();
}
function zipOf(name: string, content: Buffer): Buffer {
  const z = new AdmZip();
  z.addFile(name, content);
  return z.toBuffer();
}

const SLIDES = Buffer.from('ZZROUTE-slides-b7');
const QUIZ = Buffer.from('ZZROUTE-quiz-b7');

// A unit folder selected wholesale: number-named folder, a Word description, one zip per lesson.
function folderParts(): Array<{ field: string; filename: string; content: Buffer }> {
  return [
    { field: 'folder', filename: '9/overview.docx', content: makeDocx('This is Unit 5: Intro to Python, for Year 9.') },
    { field: 'folder', filename: '9/Lesson 1.zip', content: zipOf('slides.pptx', SLIDES) },
    { field: 'folder', filename: '9/Lesson 2.zip', content: zipOf('quiz.pdf', QUIZ) },
  ];
}

function multipart(parts: Array<{ field: string; filename: string; content: Buffer }>): { payload: Buffer; contentType: string } {
  const boundary = '----wsimportfolder';
  const chunks: Buffer[] = [];
  for (const p of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${p.field}"; filename="${p.filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
    chunks.push(p.content, Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { payload: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
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

describe('resource import routes — folder upload (integration — needs the dev DB up)', () => {
  it('GET /resources/import offers a folder picker and states the size limit', async () => {
    const r = await app.inject({ method: 'GET', url: '/resources/import', headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('webkitdirectory'); // folder picker
    expect(r.body).toContain('Maximum upload size'); // #3
  });

  it('uploads a whole folder, groups it as a unit, and commits unit + year group onto each file', async () => {
    const { payload, contentType } = multipart(folderParts());
    const review = await app.inject({ method: 'POST', url: '/resources/import', headers: { cookie, 'x-csrf-token': token, 'content-type': contentType }, payload });
    expect(review.statusCode).toBe(200);
    expect(review.body).toContain('Review import');
    expect(review.body).toContain('Year group'); // per-unit fields rendered
    expect(review.body).toContain('name="unit_0"');

    const batch = /\/resources\/import\/([0-9a-f-]{36})\/commit/.exec(review.body)?.[1];
    expect(batch).toBeTruthy();
    const folder0 = /name="folder_0" value="([^"]*)"/.exec(review.body)?.[1] ?? '';
    expect(folder0).toBe('9'); // the opaque number folder

    // Collect the file rows and tick them all, supplying the unit identity the folder couldn't.
    const idxs = [...review.body.matchAll(/name="path_(\d+)" value="([^"]+)"/g)].map((m) => ({ i: m[1]!, path: m[2]! }));
    expect(idxs.length).toBe(3); // overview.docx + slides.pptx + quiz.pdf
    const fields = [
      `count=${idxs.length}`,
      `folder_0=${encodeURIComponent(folder0)}`,
      `unit_0=${encodeURIComponent('Unit 5: Intro to Python')}`,
      `yeargroup_0=${encodeURIComponent('Year 9')}`,
    ];
    for (const { i, path } of idxs) {
      fields.push(`inc_${i}=1`, `path_${i}=${encodeURIComponent(path)}`, `title_${i}=${encodeURIComponent(`L? ${path}`)}`, `grp_${i}=0`);
    }
    const commit = await app.inject({
      method: 'POST',
      url: `/resources/import/${batch}/commit`,
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: fields.join('&'),
    });
    expect(commit.statusCode).toBe(200);
    expect(commit.body).toContain('Import complete');

    const idSlides = await findResourceByChecksum(checksum(SLIDES));
    const idQuiz = await findResourceByChecksum(checksum(QUIZ));
    expect(idSlides).toBeTruthy();
    expect(idQuiz).toBeTruthy();
    createdIds.push(idSlides!, idQuiz!);

    const row = await pool.query<{ unit: string; year_group: string }>(`SELECT unit, year_group FROM resources WHERE id = $1`, [idSlides]);
    expect(row.rows[0]!.unit).toBe('Unit 5: Intro to Python'); // stamped on a lesson file from the unit doc
    expect(row.rows[0]!.year_group).toBe('Year 9');

    // and the overview.docx imported too (3rd file) — track it for cleanup
    const idDoc = await findResourceByChecksum(checksum(makeDocx('This is Unit 5: Intro to Python, for Year 9.')));
    if (idDoc) createdIds.push(idDoc);
  });
});
