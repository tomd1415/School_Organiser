import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSetting } from '../../src/repos/settings';
import { setNavDailyOverride, setExperienceMode } from '../../src/lib/nav';

// idea 6 + Rail & Stage: saving a daily set pins items into the rail's "Today" group AND the very next
// page render reflects it via the write-through value, with no reboot; the experience switch reveals
// the Advanced rail section the same way.
let app: FastifyInstance;
let saved: string | null = null;
let savedExp: string | null = null;
let savedNudge: string | null = null;
let cookie = '';
let token = '';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  saved = await getSetting('nav_daily');
  savedExp = await getSetting('experience');
  savedNudge = await getSetting('experience_nudge_dismissed');
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
  if (savedExp === null) await pool.query(`DELETE FROM settings WHERE key = 'experience'`);
  else await pool.query(`UPDATE settings SET value = $1 WHERE key = 'experience'`, [savedExp]);
  setExperienceMode(savedExp);
  if (savedNudge === null) await pool.query(`DELETE FROM settings WHERE key = 'experience_nudge_dismissed'`);
  else await pool.query(`UPDATE settings SET value = $1 WHERE key = 'experience_nudge_dismissed'`, [savedNudge]);
  await app.close();
  await pool.end();
});

const saveNav = (payload: string) =>
  app.inject({ method: 'POST', url: '/settings/nav', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });
const setExp = (experience: string) =>
  app.inject({ method: 'POST', url: '/settings/experience', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: `experience=${experience}` });

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

  it('the next page render pins the new set into the rail Today group with no reboot', async () => {
    const res = await app.inject({ method: 'GET', url: '/', headers: { cookie } });
    expect(res.body).toContain('class="rail"');
    expect(res.body).toContain('<a href="/">Now</a>');
    expect(res.body).toContain('<a href="/schemes">Schemes</a>'); // pinned into Today
    expect(res.body).toContain('class="rail-link rail-sg" href="/safeguarding"'); // always pinned
    expect(res.body).toContain('window.__NAV__='); // the keyboard map is emitted for app.js
  });

  it('an empty submission falls back to the default daily set (Today is never empty)', async () => {
    const res = await saveNav('');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse((await getSetting('nav_daily')) ?? '[]')).toEqual([]);
    const home = await app.inject({ method: 'GET', url: '/', headers: { cookie } });
    for (const h of ['/', '/focus', '/timetable', '/tasks', '/captured']) {
      expect(home.body).toContain(`<a href="${h}">`); // the default five back in Today
    }
  });
});

describe('experience switch (integration)', () => {
  it('everyday (default) hides the Advanced rail section and its pages', async () => {
    await setExp('everyday');
    const res = await app.inject({ method: 'GET', url: '/', headers: { cookie } });
    expect(res.body).toContain('data-experience="everyday"');
    expect(res.body).not.toContain('rail-adv');
    expect(res.body).not.toContain('<a href="/setup">'); // a power page, hidden in everyday
  });

  it('flipping to power reveals the Advanced section + its pages on the next render', async () => {
    const res = await setExp('power');
    expect(res.statusCode).toBe(200);
    const home = await app.inject({ method: 'GET', url: '/', headers: { cookie } });
    expect(home.body).toContain('data-experience="power"');
    expect(home.body).toContain('rail-adv');
    expect(home.body).toContain('<a href="/setup">');
    expect(home.body).toContain('<a href="/settings">');
  });

  it('rejects a bogus experience value', async () => {
    const res = await setExp('wizard');
    expect(res.statusCode).toBe(400);
  });

  it('dismissing the earned-unlock nudge persists the choice', async () => {
    const res = await app.inject({ method: 'POST', url: '/settings/experience-nudge/dismiss', headers: { cookie, 'x-csrf-token': token } });
    expect(res.statusCode).toBe(200);
    expect(await getSetting('experience_nudge_dismissed')).toBe('true');
  });
});
