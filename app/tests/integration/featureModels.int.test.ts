import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSetting, modelFor, modelForFeature } from '../../src/repos/settings';

// idea 5 — per-feature model overrides: the validated endpoint saves only known model ids for known
// features, modelForFeature() prefers the override and falls back to the role model, and the picker
// renders. Touches only ai_model_feature_draft_lesson; snapshotted and restored.
let app: FastifyInstance;
let cookie = '';
let token = '';
let saved: string | null = null;

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  saved = await getSetting('ai_model_feature_draft_lesson');
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
  if (saved === null) await pool.query(`DELETE FROM settings WHERE key = 'ai_model_feature_draft_lesson'`);
  else await pool.query(`INSERT INTO settings (key, value, updated_at) VALUES ('ai_model_feature_draft_lesson', $1, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [saved]);
  await app.close();
  await pool.end();
});

const setAi = (key: string, value: string) =>
  app.inject({ method: 'POST', url: '/settings/ai', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: `key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}` });

describe('per-feature model selection (integration)', () => {
  it('saves a per-feature override to a known model id', async () => {
    expect((await setAi('ai_model_feature_draft_lesson', 'claude-haiku-4-5')).statusCode).toBe(200);
    expect(await getSetting('ai_model_feature_draft_lesson')).toBe('claude-haiku-4-5');
  });

  it('modelForFeature prefers the override over the role model', async () => {
    expect(await modelForFeature('draft_lesson', 'plan')).toBe('claude-haiku-4-5');
  });

  it('clearing the override falls back to the role model exactly', async () => {
    expect((await setAi('ai_model_feature_draft_lesson', '')).statusCode).toBe(200);
    expect(await getSetting('ai_model_feature_draft_lesson')).toBe('');
    expect(await modelForFeature('draft_lesson', 'plan')).toBe(await modelFor('plan'));
  });

  it('rejects an unpriced model id and an unknown feature key', async () => {
    expect((await setAi('ai_model_feature_draft_lesson', 'gpt-4o')).statusCode).toBe(400);
    expect((await setAi('ai_model_feature_not_a_feature', 'claude-haiku-4-5')).statusCode).toBe(400);
  });

  it('the Settings page renders the per-feature picker', async () => {
    const res = await app.inject({ method: 'GET', url: '/settings', headers: { cookie } });
    expect(res.body).toContain('Per-feature models');
    expect(res.body).toContain('ai_model_feature_draft_lesson');
    expect(res.body).toContain('Opus 4.8');
  });
});
