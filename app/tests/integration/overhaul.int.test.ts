import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSetting } from '../../src/repos/settings';
import { getUiShell, setUiShell } from '../../src/lib/nav';

let app: FastifyInstance;
let savedUiShell: string | null = null;
let cookie = '';
let token = '';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  savedUiShell = await getSetting('ui_shell').catch(() => null);
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

async function restore(key: string, value: string | null): Promise<void> {
  if (value === null) await pool.query(`DELETE FROM settings WHERE key = $1`, [key]);
  else await pool.query(`INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [key, value]);
}

afterAll(async () => {
  await restore('ui_shell', savedUiShell);
  setUiShell(savedUiShell || 'classic');
  await app.close();
  await pool.end();
});

describe('UI Shell toggle and overhaul integration tests', () => {
  it('toggles setting to next via POST /settings/ui-shell', async () => {
    // Start with classic
    await restore('ui_shell', 'classic');
    setUiShell('classic');

    const res = await app.inject({
      method: 'POST',
      url: '/settings/ui-shell',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'next=1'
    });
    expect(res.statusCode).toBe(200);

    // Verify database setting is updated
    expect(await getSetting('ui_shell')).toBe('next');

    // Verify memory cache is updated
    expect(getUiShell()).toBe('next');

    // Verify page renders next shell attributes
    const page = await app.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    });
    expect(page.body).toContain('data-shell="next"');
    expect(page.body).toContain('/static/styles-overhaul.css');
    expect(page.body).toContain('/static/app-overhaul.js');
  });

  it('toggles setting back to classic via POST /settings/ui-shell', async () => {
    // Start with next
    await restore('ui_shell', 'next');
    setUiShell('next');

    const res = await app.inject({
      method: 'POST',
      url: '/settings/ui-shell',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'next=0' // or empty or omit next
    });
    expect(res.statusCode).toBe(200);

    // Verify database setting is updated
    expect(await getSetting('ui_shell')).toBe('classic');

    // Verify memory cache is updated
    expect(getUiShell()).toBe('classic');

    // Verify page renders classic shell attributes
    const page = await app.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    });
    expect(page.body).toContain('data-shell="classic"');
    expect(page.body).not.toContain('/static/styles-overhaul.css');
    expect(page.body).not.toContain('/static/app-overhaul.js');
  });
});
