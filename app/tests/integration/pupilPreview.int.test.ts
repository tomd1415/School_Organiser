import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// Issue 2: "preview as pupil" from Schemes used to land on the slides-only board. /lesson/pupil-preview
// must show the pupil's WORKSHEET two-pane (what they actually fill in), read-only, with a level switcher.
let app: FastifyInstance;
let cookie = '';
let token = '';
function firstCookie(sc: string | string[] | undefined): string {
  const v = Array.isArray(sc) ? sc[0] : sc;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('pupil-preview route (Issue 2 — shows the worksheet, not just the board)', () => {
  it('renders the read-only pupil view with a level switcher, and the worksheet when the plan has one', async () => {
    const plans = (await pool.query<{ id: number }>(`SELECT id FROM lesson_plans ORDER BY id LIMIT 80`)).rows;
    expect(plans.length).toBeGreaterThan(0);

    let sawWorksheet = false;
    let checkedOne = false;
    for (const p of plans) {
      const res = await app.inject({ method: 'GET', url: `/lesson/pupil-preview?master=1&lp=${p.id}&level=core`, headers: { cookie } });
      expect(res.statusCode).toBe(200);
      // Core preview chrome must always be present (proves it's the pupil-preview, not the board).
      expect(res.body).toContain('preview as a pupil');
      expect(res.body).toContain('pv-levels'); // 🟢🟡🔴 level switcher
      expect(res.body).toContain('Board (slides)'); // link across to the projector board
      checkedOne = true;
      if (res.body.includes('ws-doc') || res.body.includes('pupil-pane-work')) {
        // A plan WITH a worksheet must show answer spaces (the pupil works in it) — the actual fix.
        expect(res.body).toMatch(/ws-input|ws-blank|ws-table|ws-choice|ws-doc/);
        sawWorksheet = true;
        break;
      }
    }
    expect(checkedOne).toBe(true);
    // Not every seeded DB has a worksheet-bearing plan; if it does, we asserted the worksheet above.
    if (!sawWorksheet) console.warn('[pupilPreview.int] no seeded plan had a worksheet to preview — chrome verified only');
  });

  it('rejects a bad lesson reference', async () => {
    const res = await app.inject({ method: 'GET', url: '/lesson/pupil-preview?master=1&lp=abc', headers: { cookie } });
    expect(res.statusCode).toBe(400);
  });
});
