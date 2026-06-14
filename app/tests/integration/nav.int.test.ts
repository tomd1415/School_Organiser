import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSetting } from '../../src/repos/settings';
import { setNavDailyOverride } from '../../src/lib/nav';

// idea 6 — the configurable daily-vs-setup nav: saving a daily set persists it AND the very next
// page render (the layout chrome) reflects it via the write-through value, with no reboot.
let app: FastifyInstance;
let saved: string | null = null;
let cookie = '';
let token = '';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  saved = await getSetting('nav_daily');
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
  if (saved === null) await pool.query(`DELETE FROM settings WHERE key = 'nav_daily'`);
  else await pool.query(`UPDATE settings SET value = $1 WHERE key = 'nav_daily'`, [saved]);
  setNavDailyOverride(saved ? (JSON.parse(saved) as string[]) : null); // leave the in-memory value as we found it
  await app.close();
  await pool.end();
});

const saveNav = (payload: string) =>
  app.inject({ method: 'POST', url: '/settings/nav', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });

describe('configurable nav (integration)', () => {
  it('the Settings page offers the navigation picker with every link as a checkbox', async () => {
    const res = await app.inject({ method: 'GET', url: '/settings', headers: { cookie } });
    expect(res.body).toContain('<h2>Navigation</h2>');
    expect(res.body).toContain('name="daily" value="/settings"');
    expect(res.body).toContain('name="daily" value="/captured"');
  });

  it('saving a daily set persists it as JSON (unknowns dropped, model order)', async () => {
    const res = await saveNav('daily=%2Fschemes&daily=%2F&daily=%2Fnope'); // /schemes, /, /nope
    expect(res.statusCode).toBe(200);
    expect(JSON.parse((await getSetting('nav_daily')) ?? '[]')).toEqual(['/', '/schemes']);
  });

  it('the next page render reflects the new daily set with no reboot', async () => {
    const res = await app.inject({ method: 'GET', url: '/', headers: { cookie } });
    // Now and Schemes are pinned; the rest fold into the Setup & admin menu.
    expect(res.body).toContain('<a href="/">Now</a><a href="/schemes">Schemes</a><details class="nav-more">');
    expect(res.body).toContain('⚙ Setup &amp; admin');
    expect(res.body).toContain('window.__NAV__='); // the keyboard map is emitted for app.js
  });

  it('an empty submission falls back to the default daily set (the bar is never empty)', async () => {
    const res = await saveNav('');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse((await getSetting('nav_daily')) ?? '[]')).toEqual([]);
    const home = await app.inject({ method: 'GET', url: '/', headers: { cookie } });
    expect(home.body).toContain('<a href="/">Now</a><a href="/focus">Focus</a>'); // default five inline
  });
});
