import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('phase 0 smoke', () => {
  it('redirects an unauthenticated root request to /login', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('serves the login page with a CSRF field', async () => {
    const res = await app.inject({ method: 'GET', url: '/login' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Log in');
    expect(res.body).toContain('name="_csrf"');
  });

  it('rejects login with the wrong password (and enforces CSRF)', async () => {
    const page = await app.inject({ method: 'GET', url: '/login' });
    const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
    // Use the raw Set-Cookie value (URL-encoded) so the session round-trips intact —
    // the secure-session value contains a ';' that the parsed .cookies form decodes.
    const rawSetCookie = page.headers['set-cookie'];
    const setCookie = Array.isArray(rawSetCookie) ? rawSetCookie[0] : rawSetCookie;
    const cookiePair = (setCookie ?? '').split(';')[0];

    const res = await app.inject({
      method: 'POST',
      url: '/login',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: cookiePair,
      },
      payload: `_csrf=${encodeURIComponent(token)}&password=definitely-wrong`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('enforces CSRF when the token/secret are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/login',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'password=whatever',
    });
    expect(res.statusCode).toBe(403);
  });
});
