import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSetting } from '../../src/repos/settings';
import { standingPrefItems } from '../../src/services/standingPrefs';

// idea 3 — saving standing prefs through the validated /settings/ai endpoint persists them, enforces
// the per-key length cap, and the service turns them into context[] items the generators spread in.
let app: FastifyInstance;
let savedStyle: string | null = null;
let savedFeature: string | null = null;
let cookie = '';
let token = '';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  [savedStyle, savedFeature] = await Promise.all([getSetting('ai_style_prefs'), getSetting('ai_feature_prefs')]);
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
  await restore('ai_style_prefs', savedStyle);
  await restore('ai_feature_prefs', savedFeature);
  await app.close();
  await pool.end();
});

const setAi = (key: string, value: string) =>
  app.inject({ method: 'POST', url: '/settings/ai', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: `key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}` });

describe('standing prefs in Settings (integration)', () => {
  it('saves both standing-pref keys', async () => {
    expect((await setAi('ai_style_prefs', 'plain UK English, short sentences')).statusCode).toBe(200);
    expect((await setAi('ai_feature_prefs', 'always include a retrieval starter')).statusCode).toBe(200);
    expect(await getSetting('ai_style_prefs')).toBe('plain UK English, short sentences');
    expect(await getSetting('ai_feature_prefs')).toBe('always include a retrieval starter');
  });

  it('the service turns the saved prefs into two labelled context items', async () => {
    const items = await standingPrefItems();
    expect(items).toHaveLength(2);
    expect(items[0]!.text).toContain('plain UK English');
    expect(items[1]!.text).toContain('retrieval starter');
  });

  it('rejects an unknown settings key (registry-validated)', async () => {
    expect((await setAi('ai_bogus_key', 'x')).statusCode).toBe(400);
  });

  it('rejects a value over the per-key cap (2001 chars)', async () => {
    expect((await setAi('ai_style_prefs', 'x'.repeat(2001))).statusCode).toBe(400);
  });

  it('the Settings page renders the standing-prefs textareas with the saved values', async () => {
    const res = await app.inject({ method: 'GET', url: '/settings', headers: { cookie } });
    expect(res.body).toContain('ai_style_prefs');
    expect(res.body).toContain('plain UK English, short sentences');
  });
});
