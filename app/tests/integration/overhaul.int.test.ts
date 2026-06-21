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

describe('UI Shell overhaul integration tests', () => {
  it('renders next shell by default with overhauled styles and scripts', async () => {
    // Verify page renders next shell attributes
    const page = await app.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    });
    expect(page.body).toContain('data-shell="next"');
    expect(page.body).toContain('/static/styles.css');
    expect(page.body).toContain('/static/app.js');
  });

  it('opens a scheme lesson in the read-only live cockpit preview', async () => {
    const plan = await pool.query<{ id: number }>(
      `SELECT lp.id FROM lesson_plans lp
       JOIN units u ON u.id = lp.unit_id
       JOIN schemes_of_work s ON s.id = u.scheme_id
       ORDER BY lp.id LIMIT 1`,
    );
    const id = plan.rows[0]?.id;
    expect(id).toBeTruthy();

    const page = await app.inject({
      method: 'GET',
      url: `/lesson/preview?plan=${id}`,
      headers: { cookie },
    });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('Lesson preview · not live');
    expect(page.body).toContain('No lesson occurrence or pupil record is created');
    expect(page.body).toContain(`/lesson/pupil-view?master=1&amp;lp=${id}`);
    expect(page.body).not.toContain('/lesson/oc/0/');
    expect(page.body).not.toContain('/occurrence-course/0/');
  });
});
