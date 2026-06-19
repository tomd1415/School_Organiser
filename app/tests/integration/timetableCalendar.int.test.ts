import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// The week timetable must respect the calendar (no teaching on holidays/INSET/out-of-term) and roll to
// the right academic year as you look ahead/back. The setup Timetable editor must order rows by time.
// Seeded calendar (data.ts): 2025/26 is current (…→2026-07-20); 2026-07-20 = Summer INSET, then
// Summer holiday to 2026-08-31; 2026/27 (2026-09-01→) is a draft with full terms.
let app: FastifyInstance;
let session = '';

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({
    method: 'POST',
    url: '/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
    payload: `_csrf=${encodeURIComponent(token)}&password=test`,
  });
  session = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('timetable calendar + year (integration — needs the dev DB up)', () => {
  it('greys non-teaching days and shows no lessons on a holiday/INSET week', async () => {
    // Week of Mon 2026-07-20: INSET that day, Summer holiday for the rest — every day non-teaching,
    // even though the (current) year has lessons on those weekdays.
    const res = await app.inject({ method: 'GET', url: '/timetable?date=2026-07-20', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('tt-off'); // greyed columns
    expect(res.body).toContain('INSET');
    expect(res.body).toContain('Holiday');
    expect(res.body).not.toContain('8PFA'); // a seeded current-year group — suppressed on a non-teaching week
  });

  it('looking ahead to September rolls to next year’s structure, not the current one', async () => {
    // Week of Mon 2026-09-07 sits in the 2026/27 Autumn term (a different academic year).
    const res = await app.inject({ method: 'GET', url: '/timetable?date=2026-09-07', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('2026/27'); // resolved to next year and labelled
    expect(res.body).not.toContain('8PFA'); // current-year lessons are NOT shown in next year's week
  });

  it('a week beyond every set-up year is labelled, not silently shown as the current one', async () => {
    const res = await app.inject({ method: 'GET', url: '/timetable?date=2099-03-02', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('no academic year set up for this week');
    expect(res.body).not.toContain('8PFA');
  });

  it('preserves an explicit ?year= preview across Prev/Next week navigation (BUG-036)', async () => {
    const yr = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE NOT is_current ORDER BY start_date LIMIT 1`);
    const yid = yr.rows[0]!.id;
    const res = await app.inject({ method: 'GET', url: `/timetable?year=${yid}&date=2026-09-07`, headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    // Both Prev and Next links carry the previewed year (This week deliberately drops it = exit preview).
    const navLinks = [...res.body.matchAll(/href="\/timetable\?date=[^"]*"/g)].map((m) => m[0]);
    expect(navLinks.length).toBeGreaterThanOrEqual(2);
    expect(navLinks.every((h) => h.includes(`year=${yid}`))).toBe(true);
    expect(res.body).toContain('exit preview');
  });

  it('the Setup Timetable editor orders rows by time, not by slot_order', async () => {
    // A draft year with an early period given a LATER slot_order than a midday one — the old editor
    // sorted by slot_order and put 07:30 at the bottom; it must now sort by start time.
    const yr = await pool.query<{ id: number }>(
      `INSERT INTO academic_years (name, start_date, end_date, is_current)
       VALUES ('ZZTEST/ORD','2095-09-01','2096-08-31', false) RETURNING id`,
    );
    const yearId = yr.rows[0]!.id;
    try {
      await pool.query(
        `INSERT INTO period_definitions (academic_year_id, weekday, slot_order, slot_type, label, start_time, end_time, teachable)
         VALUES ($1, 1, 1, 'lesson', 'ZZ Afternoon', '14:00', '15:00', true),
                ($1, 1, 2, 'before_school', 'ZZ Make coffee', '07:30', '07:45', false)`,
        [yearId],
      );
      const res = await app.inject({ method: 'GET', url: `/setup?tab=timetable&year=${yearId}`, headers: { cookie: session } });
      expect(res.statusCode).toBe(200);
      const early = res.body.indexOf('ZZ Make coffee');
      const later = res.body.indexOf('ZZ Afternoon');
      expect(early).toBeGreaterThan(-1);
      expect(later).toBeGreaterThan(-1);
      expect(early).toBeLessThan(later); // 07:30 row comes before the 14:00 row
    } finally {
      await pool.query(`DELETE FROM period_definitions WHERE academic_year_id = $1`, [yearId]);
      await pool.query(`DELETE FROM academic_years WHERE id = $1`, [yearId]);
    }
  });
});
