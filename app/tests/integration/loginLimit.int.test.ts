import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getSetting, setSetting } from '../../src/repos/settings';
import { hashPassword } from '../../src/lib/passwords';
import { resetRateLimiter } from '../../src/auth/rateLimit';

// BUG-040: the login IP rate-limit must NOT be reset by a successful lower-privilege (TA) login —
// otherwise a TA who knows their own password could clear the brake and brute-force the teacher
// password. The teacher password is 'test' (APP_PASSWORD_HASH in the integration config).
let app: FastifyInstance;
let savedTaHash: string | null = null;
const TA_PW = 'ta-limit-pass-9z';

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}

// One login attempt: a fresh GET /login (NOT rate-limited) for a valid CSRF token + cookie, then the
// POST (which IS rate-limited, keyed by IP — constant across inject calls).
async function attempt(password: string): Promise<number> {
  const page = await app.inject({ method: 'GET', url: '/login' });
  const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const cookie = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({
    method: 'POST',
    url: '/login',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    payload: `_csrf=${encodeURIComponent(token)}&password=${encodeURIComponent(password)}`,
  });
  return res.statusCode;
}

beforeAll(async () => {
  savedTaHash = await getSetting('ta_password_hash');
  await setSetting('ta_password_hash', hashPassword(TA_PW));
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  resetRateLimiter();
  if (savedTaHash === null) await pool.query(`DELETE FROM settings WHERE key = 'ta_password_hash'`);
  else await setSetting('ta_password_hash', savedTaHash);
  await app.close();
  await pool.end();
});

describe('login rate limit (integration — BUG-040)', () => {
  it('a successful TA login does not reset the teacher-login IP brake', async () => {
    resetRateLimiter();
    // 5 wrong teacher guesses (the limit is 10 / minute / IP)
    for (let i = 0; i < 5; i++) expect(await attempt('definitely-wrong')).toBe(401);
    // a SUCCESSFUL TA login — pre-fix this cleared the shared counter
    expect(await attempt(TA_PW)).toBe(302);
    // 4 more wrong guesses → 10 attempts have now been made on this IP
    for (let i = 0; i < 4; i++) await attempt('definitely-wrong');
    // …so the 11th is blocked. With the bug, the TA success would have reset the counter and this would
    // still be a 401 (more guesses allowed).
    expect(await attempt('definitely-wrong')).toBe(429);
  });
});
