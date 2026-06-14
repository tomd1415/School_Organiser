import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { listCourseDocs, listCourseDocsWithContent, getCourseDoc } from '../../src/repos/courseDocs';
import { listCourses } from '../../src/repos/schemes';

// idea 9 — official course documents. A real multipart .txt upload extracts + stores; the editor
// route updates the text; delete removes it. All test docs carry a marker and are cleaned up.
const MK = 'ZZDOC';
let app: FastifyInstance;
let cookie = '';
let token = '';
let courseId = 0;

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
  courseId = (await listCourses())[0]!.id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM course_documents WHERE title LIKE $1`, [`${MK}%`]);
  await app.close();
  await pool.end();
});

function multipart(fields: Record<string, string>, file: { name: string; filename: string; content: string }): { body: string; headers: Record<string, string> } {
  const b = '----zztest';
  let s = '';
  for (const [k, v] of Object.entries(fields)) s += `--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
  s += `--${b}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: text/plain\r\n\r\n${file.content}\r\n--${b}--\r\n`;
  return { body: s, headers: { 'content-type': `multipart/form-data; boundary=${b}`, cookie, 'x-csrf-token': token } };
}

describe('official course documents (integration)', () => {
  it('the coverage page shows the documents section + upload form', async () => {
    const res = await app.inject({ method: 'GET', url: `/coverage?course=${courseId}`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Official documents');
    expect(res.body).toContain('/coverage/doc/upload');
  });

  it('a multipart upload extracts the text and stores it', async () => {
    const mp = multipart({ course: String(courseId), role: 'spec', title: `${MK} J277 spec` }, { name: 'file', filename: 'spec.txt', content: `${MK} binary representation, the CPU, hexadecimal` });
    const res = await app.inject({ method: 'POST', url: '/coverage/doc/upload', headers: mp.headers, payload: mp.body });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(`${MK} J277 spec`);
    const doc = (await listCourseDocsWithContent(courseId)).find((d) => d.title === `${MK} J277 spec`)!;
    expect(doc.content).toContain('binary representation');
    expect(doc.role).toBe('spec');
  });

  it('the editor route updates the extracted text', async () => {
    const doc = (await listCourseDocs(courseId)).find((d) => d.title === `${MK} J277 spec`)!;
    const res = await app.inject({ method: 'POST', url: `/coverage/doc/${doc.id}`, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: `text=${encodeURIComponent(`${MK} edited spec text`)}` });
    expect(res.statusCode).toBe(200);
    expect((await getCourseDoc(doc.id))!.content).toBe(`${MK} edited spec text`);
  });

  it('delete removes the document', async () => {
    const doc = (await listCourseDocs(courseId)).find((d) => d.title === `${MK} J277 spec`)!;
    const res = await app.inject({ method: 'POST', url: `/coverage/doc/${doc.id}/delete`, headers: { cookie, 'x-csrf-token': token } });
    expect(res.statusCode).toBe(200);
    expect(await getCourseDoc(doc.id)).toBeNull();
  });
});
