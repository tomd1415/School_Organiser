import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSetting } from '../../src/repos/settings';
import { resolveApiKey } from '../../src/llm/client';

// (a) The teacher can store their own Anthropic key in Settings (overriding nothing in test).
// This exercises the store/clear route AND re-asserts the safety net at the integration layer:
// even with a key sitting in the shared dev DB, test mode resolves NO key, so no real call.
let app: FastifyInstance;
let saved: string | null = null;
let cookie = '';
let token = '';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  saved = await getSetting('ai_api_key');
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
  if (saved === null) await pool.query(`DELETE FROM settings WHERE key = 'ai_api_key'`);
  else await pool.query(`UPDATE settings SET value = $1 WHERE key = 'ai_api_key'`, [saved]);
  await app.close();
  await pool.end();
});

const post = (payload: string) =>
  app.inject({ method: 'POST', url: '/settings/ai-key', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });

describe('AI key in Settings (integration)', () => {
  it('saves a pasted key to the settings table', async () => {
    const res = await post('key=sk-ant-test-PLACEHOLDER-not-real');
    expect(res.statusCode).toBe(200);
    expect(await getSetting('ai_api_key')).toBe('sk-ant-test-PLACEHOLDER-not-real');
  });

  it('STILL resolves no usable key in test mode — a stored key never causes a real call', async () => {
    expect(await resolveApiKey()).toBe(''); // the test-mode guarantee survives a stored key
  });

  it('the Settings page shows the key as set (in Settings)', async () => {
    const res = await app.inject({ method: 'GET', url: '/settings', headers: { cookie } });
    expect(res.body).toContain('set (in Settings)');
  });

  it('rejects an obviously-too-short key', async () => {
    const res = await post('key=short');
    expect(res.body).toContain('valid key');
  });

  it('clears the stored key on request', async () => {
    const res = await post('clear=1');
    expect(res.statusCode).toBe(200);
    expect((await getSetting('ai_api_key')) ?? '').toBe('');
  });
});
