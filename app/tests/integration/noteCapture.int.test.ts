import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// idea 12 — smart capture routes. With AI forced off in the integration env, /note/route falls back
// to general notes (the safe default); the private path files to the safeguarding register; and
// /note/route/apply creates the confirmed destinations end-to-end. All test rows carry a marker and
// are deleted in afterAll, keeping the teacher's real data clean.
const MK = 'ZZNOTE12';
let app: FastifyInstance;
let cookie = '';
let token = '';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}
const post = (url: string, payload: string) =>
  app.inject({ method: 'POST', url, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });

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
  await pool.query(`DELETE FROM tasks WHERE title LIKE $1`, [`%${MK}%`]);
  await pool.query(`DELETE FROM events WHERE title LIKE $1`, [`%${MK}%`]);
  await pool.query(`DELETE FROM notes WHERE body LIKE $1`, [`%${MK}%`]);
  await app.close();
  await pool.end();
});

async function count(sql: string): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(sql, [`%${MK}%`]);
  return rows[0]!.n;
}

describe('smart capture routes (integration)', () => {
  it('the modal shell is present on an authed page', async () => {
    const res = await app.inject({ method: 'GET', url: '/', headers: { cookie } });
    expect(res.body).toContain('id="note-modal"');
    expect(res.body).toContain('id="note-btn"');
  });

  it('plain add drops the note into general notes', async () => {
    const res = await post('/note/route/plain', `text=${encodeURIComponent(`${MK} remember the thing`)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('general notes');
    expect(await count(`SELECT count(*)::int n FROM notes WHERE kind='general' AND body LIKE $1`)).toBeGreaterThan(0);
  });

  it('a private note is filed to the safeguarding register, never routed', async () => {
    const res = await post('/note/route', `private=on&text=${encodeURIComponent(`${MK} sensitive disclosure`)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('safeguarding register');
    expect(await count(`SELECT count(*)::int n FROM notes WHERE kind='captured' AND safeguarding AND body LIKE $1`)).toBeGreaterThan(0);
  });

  it('with AI off, /note/route falls back to general notes (never loses the text)', async () => {
    const res = await post('/note/route', `text=${encodeURIComponent(`${MK} route me somewhere`)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('general notes');
    expect(await count(`SELECT count(*)::int n FROM notes WHERE kind='general' AND body LIKE $1`)).toBeGreaterThan(1);
  });

  it('apply creates the ticked destinations (task + event)', async () => {
    const payload = JSON.stringify({
      destinations: [
        { kind: 'task', title: `${MK} do the thing`, summary: 'details', urgency: 'this_week', eventKind: null, dateIso: null, category: null, groupName: null },
        { kind: 'event', title: `${MK} meeting`, summary: 'in the hall', urgency: null, eventKind: 'meeting', dateIso: '2026-07-01', category: null, groupName: null },
      ],
      reason: 'split',
    });
    const res = await post('/note/route/apply', `payload=${encodeURIComponent(payload)}&include_0=1&include_1=1`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Filed:');
    expect(await count(`SELECT count(*)::int n FROM tasks WHERE title LIKE $1`)).toBeGreaterThan(0);
    expect(await count(`SELECT count(*)::int n FROM events WHERE title LIKE $1`)).toBeGreaterThan(0);
  });

  it('apply with nothing ticked files nothing', async () => {
    const payload = JSON.stringify({ destinations: [{ kind: 'note', title: `${MK} unticked`, summary: '', urgency: null, eventKind: null, dateIso: null, category: null, groupName: null }], reason: 'x' });
    const res = await post('/note/route/apply', `payload=${encodeURIComponent(payload)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Nothing ticked');
  });
});
