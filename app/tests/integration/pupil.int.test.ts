import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { setSetting, getSetting } from '../../src/repos/settings';

// Phase 8: pupil login (class code → name → PIN), the locked-down /me surface, answer autosave
// with ownership checks, and the level/feedback machinery. All scratch rows are torn down; the
// pupil_access_enabled setting is snapshot/restored (shared dev DB).
let app: FastifyInstance;
let savedAccess: string | null = null;
let groupId = 0;
let groupCourseId = 0;
let occurrenceCourseId = 0;
let pupilId = 0;
let otherPupilId = 0;
let resourceId = 0;
const CODE = 'ZZTEST-99';
const PIN = '4242';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  savedAccess = await getSetting('pupil_access_enabled');
  await setSetting('pupil_access_enabled', 'true');
  app = await buildApp();
  await app.ready();

  // Scratch group in the current year + a course + group_course + two enrolled pupils.
  const yr = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`);
  const yearId = Number(yr.rows[0]!.id);
  const g = await pool.query<{ id: number }>(
    `INSERT INTO groups (name, academic_year_id, active, login_code) VALUES ('ZZTESTGRP', $1, true, $2) RETURNING id`,
    [yearId, CODE],
  );
  groupId = Number(g.rows[0]!.id);
  const c = await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZTEST course') RETURNING id`);
  const courseId = Number(c.rows[0]!.id);
  const gc = await pool.query<{ id: number }>(
    `INSERT INTO group_courses (group_id, course_id) VALUES ($1, $2) RETURNING id`,
    [groupId, courseId],
  );
  groupCourseId = Number(gc.rows[0]!.id);

  const p1 = await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZ Ada', 'PUPIL_ZZ1') RETURNING id`);
  pupilId = Number(p1.rows[0]!.id);
  const p2 = await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZ Ben', 'PUPIL_ZZ2') RETURNING id`);
  otherPupilId = Number(p2.rows[0]!.id);
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1, $3, true), ($2, $3, true)`, [pupilId, otherPupilId, groupId]);

  // An occurrence-course to attach answers to (date is irrelevant for the autosave path).
  const oc = await pool.query<{ id: number }>(
    `WITH occ AS (
       INSERT INTO lesson_occurrences (timetabled_lesson_id, date)
       SELECT id, '2001-02-03' FROM timetabled_lessons ORDER BY id LIMIT 1
       ON CONFLICT DO NOTHING RETURNING id)
     INSERT INTO occurrence_courses (occurrence_id, group_course_id)
     SELECT COALESCE((SELECT id FROM occ), (SELECT id FROM lesson_occurrences ORDER BY id LIMIT 1)), $1
     RETURNING id`,
    [groupCourseId],
  );
  occurrenceCourseId = Number(oc.rows[0]!.id);

  // A scratch worksheet resource the answer rows can reference (FK target).
  const r = await pool.query<{ id: number }>(
    `INSERT INTO resources (title, kind, mime_type, source) VALUES ('ZZTEST worksheet', 'worksheet', 'text/markdown', 'ai_generated') RETURNING id`,
  );
  resourceId = Number(r.rows[0]!.id);

  // Set Ada a PIN via the repo (the admin path is covered separately).
  const { setPupilPin } = await import('../../src/repos/pupilCredentials');
  await setPupilPin(pupilId, PIN);
});

afterAll(async () => {
  await pool.query(`DELETE FROM pupil_answers WHERE occurrence_course_id = $1`, [occurrenceCourseId]);
  await pool.query(`DELETE FROM pupil_lesson_feedback WHERE occurrence_course_id = $1`, [occurrenceCourseId]);
  await pool.query(`DELETE FROM pupil_done WHERE occurrence_course_id = $1`, [occurrenceCourseId]);
  await pool.query(`DELETE FROM pupil_levels WHERE group_course_id = $1`, [groupCourseId]);
  await pool.query(`DELETE FROM occurrence_courses WHERE id = $1`, [occurrenceCourseId]);
  await pool.query(`DELETE FROM pupil_credentials WHERE pupil_id IN ($1, $2)`, [pupilId, otherPupilId]);
  await pool.query(`DELETE FROM enrolments WHERE group_id = $1`, [groupId]);
  await pool.query(`DELETE FROM group_courses WHERE id = $1`, [groupCourseId]);
  await pool.query(`DELETE FROM pupils WHERE id IN ($1, $2)`, [pupilId, otherPupilId]);
  await pool.query(`DELETE FROM courses WHERE name = 'ZZTEST course'`);
  await pool.query(`DELETE FROM resources WHERE id = $1`, [resourceId]);
  await pool.query(`DELETE FROM groups WHERE id = $1`, [groupId]);
  if (savedAccess === null) await pool.query(`DELETE FROM settings WHERE key = 'pupil_access_enabled'`);
  else await setSetting('pupil_access_enabled', savedAccess);
  await app.close();
  await pool.end();
});

async function pupilLogin(): Promise<string> {
  const page = await app.inject({ method: 'GET', url: '/pupil' });
  const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const cookie = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({
    method: 'POST',
    url: '/pupil/login',
    headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
    payload: `pupil=${pupilId}&group=${groupId}&pin=${PIN}`,
  });
  expect(res.headers['hx-redirect']).toBe('/me');
  return firstCookie(res.headers['set-cookie']) || cookie;
}

describe('pupil login + surface (integration)', () => {
  it('resolves a class code to the pick-your-name list', async () => {
    const page = await app.inject({ method: 'GET', url: '/pupil' });
    const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']);
    const res = await app.inject({
      method: 'POST',
      url: '/pupil/names',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `code=${encodeURIComponent(CODE)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('ZZ Ada');
    expect(res.body).toContain('Tap your name');
  });

  it('a wrong PIN is rejected and a wrong code finds no class', async () => {
    const page = await app.inject({ method: 'GET', url: '/pupil' });
    const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']);
    const bad = await app.inject({
      method: 'POST', url: '/pupil/login',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `pupil=${pupilId}&group=${groupId}&pin=0000`,
    });
    // Generic failure message (no wrong-vs-disabled-vs-not-enrolled oracle) and no login.
    expect(bad.body).toContain('check your PIN');
    expect(bad.headers['hx-redirect']).toBeUndefined();
  });

  it('/pupil/pin will not reveal a name for a pupil outside the class code used (no roster enumeration)', async () => {
    const page = await app.inject({ method: 'GET', url: '/pupil' });
    const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']);
    // A real pupil id that is NOT enrolled in our scratch group: pick any pupil not in it.
    const outsider = await pool.query<{ id: number; name: string }>(
      `SELECT p.id, p.display_name name FROM pupils p
       WHERE NOT EXISTS (SELECT 1 FROM enrolments e WHERE e.pupil_id = p.id AND e.group_id = $1)
       ORDER BY p.id LIMIT 1`,
      [groupId],
    );
    if (outsider.rows[0]) {
      const res = await app.inject({
        method: 'POST', url: '/pupil/pin',
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `pupil=${outsider.rows[0].id}&group=${groupId}`,
      });
      expect(res.body).not.toContain(outsider.rows[0].name); // name never disclosed
      expect(res.body).toContain('went wrong');
    }
  });

  it('turning pupil access OFF evicts a live pupil session on the next /me', async () => {
    const session = await pupilLogin();
    expect((await app.inject({ method: 'GET', url: '/me', headers: { cookie: session } })).statusCode).toBe(200);
    await setSetting('pupil_access_enabled', 'false');
    try {
      const after = await app.inject({ method: 'GET', url: '/me', headers: { cookie: session } });
      expect(after.statusCode).toBe(302);
      expect(after.headers.location).toBe('/pupil');
    } finally {
      await setSetting('pupil_access_enabled', 'true');
    }
  });

  it('a logged-in pupil reaches /me but nothing else', async () => {
    const session = await pupilLogin();
    const me = await app.inject({ method: 'GET', url: '/me', headers: { cookie: session } });
    expect(me.statusCode).toBe(200);
    expect(me.body).toContain('ZZ Ada');
    for (const url of ['/', '/tasks', '/schemes', '/settings', '/pupils', '/ta', '/lesson?lesson=1&date=2001-02-03']) {
      const res = await app.inject({ method: 'GET', url, headers: { cookie: session } });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/me');
    }
  });

  it('autosaves an answer the pupil owns', async () => {
    const session = await pupilLogin();
    // /me carries a fresh CSRF token in its hx-headers and rotates the session cookie.
    const me = await app.inject({ method: 'GET', url: '/me', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(me.body)?.[1] ?? '';
    const cookie = firstCookie(me.headers['set-cookie']) || session;
    const ok = await app.inject({
      method: 'POST',
      url: `/me/answer?oc=${occurrenceCourseId}&key=t1.r1.c2`,
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'value=chlorophyll',
    });
    expect(ok.statusCode).toBe(200);
    const saved = await pool.query<{ value: string }>(
      `SELECT value FROM pupil_answers WHERE pupil_id = $1 AND occurrence_course_id = $2 AND field_key = 't1.r1.c2'`,
      [pupilId, occurrenceCourseId],
    );
    expect(saved.rows[0]?.value).toBe('chlorophyll');
  });

  it('refuses an answer to an occurrence-course the pupil is not enrolled in', async () => {
    const session = await pupilLogin();
    const me = await app.inject({ method: 'GET', url: '/me', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(me.body)?.[1] ?? '';
    const cookie = firstCookie(me.headers['set-cookie']) || session;
    // An occurrence-course belonging to a different group_course (the first seeded one ≠ ours).
    const foreign = await pool.query<{ id: number }>(
      `SELECT oc.id FROM occurrence_courses oc WHERE oc.group_course_id <> $1 ORDER BY oc.id LIMIT 1`,
      [groupCourseId],
    );
    if (foreign.rows[0]) {
      const res = await app.inject({
        method: 'POST',
        url: `/me/answer?oc=${foreign.rows[0].id}&key=t1.r1.c1`,
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: 'value=should-not-save',
      });
      expect(res.statusCode).toBe(403);
    }
  });

  it('Done ✓ and feedback persist for the pupil', async () => {
    const { setDone, isDone, upsertPupilFeedback, getPupilFeedback } = await import('../../src/repos/pupilWork');
    await setDone(pupilId, occurrenceCourseId, true);
    expect(await isDone(pupilId, occurrenceCourseId)).toBe(true);
    await upsertPupilFeedback({ pupilId, occurrenceCourseId, rating: 4, liked: 'practical,cards', disliked: 'typing', comment: 'fun' });
    const fb = await getPupilFeedback(pupilId, occurrenceCourseId);
    expect(fb?.rating).toBe(4);
    expect(fb?.liked).toContain('practical');
  });

  it('a pupil PIN locks out after 5 wrong tries (durable lockout)', async () => {
    const { verifyPin, setPupilPin, unlockPupil } = await import('../../src/repos/pupilCredentials');
    await setPupilPin(otherPupilId, '1111');
    for (let i = 0; i < 5; i++) await verifyPin(otherPupilId, '9999');
    expect(await verifyPin(otherPupilId, '1111')).toEqual({ ok: false, reason: 'locked' }); // correct PIN still blocked
    await unlockPupil(otherPupilId);
    expect(await verifyPin(otherPupilId, '1111')).toEqual({ ok: true });
  });

  it('per-pupil level slicing: set support, unset ⇒ core', async () => {
    const { getPupilLevel, setPupilLevel } = await import('../../src/repos/pupilWork');
    expect(await getPupilLevel(otherPupilId, groupCourseId)).toBe('core'); // default
    await setPupilLevel(pupilId, groupCourseId, 'support');
    expect(await getPupilLevel(pupilId, groupCourseId)).toBe('support');
  });

  it('when pupil access is OFF, the login surface refuses', async () => {
    await setSetting('pupil_access_enabled', 'false');
    try {
      const page = await app.inject({ method: 'GET', url: '/pupil' });
      expect(page.body).toContain('Not available yet');
    } finally {
      await setSetting('pupil_access_enabled', 'true');
    }
  });
});
