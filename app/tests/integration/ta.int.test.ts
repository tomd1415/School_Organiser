import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { hashPassword } from '../../src/lib/passwords';

// TA read/feedback access: separate password → locked-down view; feedback reaches the teacher's
// lesson page and the AI history. Snapshot/restore the ta_password_hash (shared dev DB).
let app: FastifyInstance;
let taSession = '';
let savedHash: string | null = null;

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  savedHash = (await pool.query<{ v: string }>(`SELECT value v FROM settings WHERE key = 'ta_password_hash'`)).rows[0]?.v ?? null;
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('ta_password_hash', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [hashPassword('ta-test-pass')],
  );
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({
    method: 'POST',
    url: '/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
    payload: `_csrf=${encodeURIComponent(token)}&password=ta-test-pass`,
  });
  expect(res.statusCode).toBe(302);
  expect(res.headers.location).toBe('/ta'); // TA password routes to the TA surface
  taSession = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await app.close();
  if (savedHash === null) await pool.query(`DELETE FROM settings WHERE key = 'ta_password_hash'`);
  else await pool.query(`UPDATE settings SET value = $1 WHERE key = 'ta_password_hash'`, [savedHash]);
  await pool.end();
});

describe('TA access (integration)', () => {
  it('TA view renders with the lesson tabs', async () => {
    const res = await app.inject({ method: 'GET', url: '/ta', headers: { cookie: taSession } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('TA view');
    expect(res.body).toContain('This lesson');
    expect(res.body).toContain('Next lesson');
    expect(res.body).not.toContain('href="/schemes"'); // no teacher nav
  });

  it('everything else bounces back to /ta', async () => {
    for (const url of ['/', '/tasks', '/schemes', '/settings', '/notes', '/pupils']) {
      const res = await app.inject({ method: 'GET', url, headers: { cookie: taSession } });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/ta');
    }
  });

  it('feedback lands, shows for the teacher, and joins the AI history', async () => {
    const slot = await pool.query<{ id: number }>(`SELECT id FROM timetabled_lessons WHERE purpose='teaching' ORDER BY id LIMIT 1`);
    const { findOccurrence, findOrCreateOccurrence, getOccurrenceCourses } = await import('../../src/repos/occurrence');
    // TODAY's lesson: a shared-account TA may only feedback on a lesson happening today (the security
    // scope), and recentGroupHistory includes it (date <= CURRENT_DATE). The dev DB is the teacher's
    // REAL data — today's occurrence may already exist (with real notes). Only delete it in cleanup if
    // WE created it, never a pre-existing real one (which would cascade away real teaching records).
    const today = new Date().toISOString().slice(0, 10);
    const preExisting = await findOccurrence(slot.rows[0]!.id, today);
    const occId = preExisting ?? (await findOrCreateOccurrence(slot.rows[0]!.id, today));
    const oc = (await getOccurrenceCourses(occId))[0]!;
    const page = await app.inject({ method: 'GET', url: '/ta', headers: { cookie: taSession } });
    // outside lesson time the card has no hx-headers; the logout form always carries the token
    const token = (/x-csrf-token":"([^"]+)"/.exec(page.body) ?? /name="_csrf" value="([^"]+)"/.exec(page.body))?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || taSession;
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/ta/feedback',
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `oc=${oc.occurrenceCourseId}&pupils=${encodeURIComponent('Settled well, two needed breaks')}&lesson=${encodeURIComponent('Card sort worked')}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Sent to the teacher');
      // teacher sees it on the lesson page (need a teacher session)
      const { listTaFeedback } = await import('../../src/repos/taFeedback');
      const rows = await listTaFeedback(oc.occurrenceCourseId);
      expect(rows.some((r) => r.pupilsText.includes('Settled well'))).toBe(true);
      // AI history includes it with the safeguarding flag honoured
      const { recentGroupHistory } = await import('../../src/repos/adaptations');
      const hist = await recentGroupHistory(Number(oc.groupCourseId), 50);
      const entry = hist.find((h) => h.date === today);
      expect(entry).toBeDefined();
      expect(entry!.taFeedback.some((f) => f.pupils.includes('Settled well'))).toBe(true);
      // and the prompt items carry it
      const { historyItems } = await import('../../src/llm/prompts/adaptLesson');
      const items = historyItems([entry!]);
      expect(items.some((i) => i.text.includes('TA feedback') && i.text.includes('Card sort worked'))).toBe(true);
    } finally {
      // Delete only the feedback THIS test wrote (not any real TA feedback on a real occurrence).
      await pool.query(`DELETE FROM ta_feedback WHERE occurrence_course_id = $1 AND pupils_text LIKE 'Settled well%'`, [oc.occurrenceCourseId]);
      if (!preExisting) await pool.query(`DELETE FROM lesson_occurrences WHERE id = $1`, [occId]); // only if WE created it
    }
  });

  it('a TA cannot fetch a resource that is not part of one of their lessons (IDOR scope)', async () => {
    const { createResource } = await import('../../src/repos/resources');
    const rid = await createResource('ZZTA orphan resource', 'document', 'text/markdown', 'ai_generated');
    try {
      for (const path of ['view', 'download', 'present', 'download.docx']) {
        const res = await app.inject({ method: 'GET', url: `/resources/${rid}/${path}`, headers: { cookie: taSession } });
        expect(res.statusCode).toBe(403); // not linked to any of the TA's / today's lessons
      }
    } finally {
      await pool.query(`DELETE FROM resources WHERE id = $1`, [rid]);
    }
  });

  it('safeguarding-flagged feedback is withheld from AI items', async () => {
    const { historyItems } = await import('../../src/llm/prompts/adaptLesson');
    const { withholdSafeguarding } = await import('../../src/services/redact');
    const items = historyItems([
      { date: '2026-06-01', stoppingPoint: null, planTitle: null, notes: [], taFeedback: [{ pupils: 'disclosure made', lesson: '', safeguarding: true }] },
    ]);
    const kept = withholdSafeguarding(items);
    expect(kept.some((i) => i.text.includes('disclosure'))).toBe(false);
  });
});
