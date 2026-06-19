import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSetting, setSetting } from '../../src/repos/settings';

// BUG-050: the stored IMAP password must never be echoed into the Settings HTML, and a blank submit
// must preserve it (only an explicitly typed new value overwrites).
let app: FastifyInstance;
let saved: string | null = null;
let cookie = '';
let token = '';
const SECRET = 'zzimap-secret-7f3';

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  saved = await getSetting('email_imap_password');
  await setSetting('email_imap_password', SECRET);
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  if (saved === null) await pool.query(`DELETE FROM settings WHERE key = 'email_imap_password'`);
  else await pool.query(`UPDATE settings SET value = $1 WHERE key = 'email_imap_password'`, [saved]);
  await app.close();
  await pool.end();
});

const postPassword = (value: string) =>
  app.inject({
    method: 'POST',
    url: '/settings/email?key=email_imap_password',
    headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
    payload: `email_imap_password=${encodeURIComponent(value)}`,
  });

describe('IMAP password secrecy in Settings (integration — BUG-050)', () => {
  it('never renders the stored password into the Settings HTML', async () => {
    const res = await app.inject({ method: 'GET', url: '/settings', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain(SECRET); // the secret is not in the DOM…
    expect(res.body).toContain('configured ✓'); // …but the page shows one is stored
    expect(res.body).toContain('name="email_imap_password" value=""'); // field is empty
  });

  it('a blank submit keeps the saved password (only an explicit value overwrites)', async () => {
    const blank = await postPassword('');
    expect(blank.statusCode).toBe(200);
    expect(await getSetting('email_imap_password')).toBe(SECRET); // unchanged

    const replaced = await postPassword('zznew-secret-9a2');
    expect(replaced.statusCode).toBe(200);
    expect(await getSetting('email_imap_password')).toBe('zznew-secret-9a2'); // overwritten
  });
});
