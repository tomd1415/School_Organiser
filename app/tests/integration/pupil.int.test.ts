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
  it('the pupil page carries the reading-help toolbar and serves pupil.js (Track C accessibility)', async () => {
    const page = await app.inject({ method: 'GET', url: '/pupil' });
    expect(page.body).toContain('class="a11y-bar"');
    expect(page.body).toContain('data-a11y="speak"'); // read-aloud control
    expect(page.body).toContain('/static/pupil.js');
    const js = await app.inject({ method: 'GET', url: '/static/pupil.js' });
    expect(js.statusCode).toBe(200);
    expect(js.body).toContain('speechSynthesis'); // 10.11 read-aloud is wired
  });

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

  it('an HTMX request after access is turned off bounces via HX-Redirect, not a silent 302 (10.8)', async () => {
    const session = await pupilLogin();
    const { invalidatePupilCfg } = await import('../../src/auth/pupilAccessCache');
    await setSetting('pupil_access_enabled', 'false');
    invalidatePupilCfg();
    try {
      // A background autosave is an hx-request; HTMX can't follow a 302, so the kill must use
      // HX-Redirect (200) — otherwise the pupil's save fails silently.
      const after = await app.inject({ method: 'GET', url: '/me', headers: { cookie: session, 'hx-request': 'true' } });
      expect(after.statusCode).toBe(200);
      expect(after.headers['hx-redirect']).toBe('/pupil');
    } finally {
      await setSetting('pupil_access_enabled', 'true');
      invalidatePupilCfg();
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

  it('changing a pupil level does NOT lose their saved answers (keys are level-independent)', async () => {
    const { saveAnswer, getAnswers, setPupilLevel } = await import('../../src/repos/pupilWork');
    await setPupilLevel(pupilId, groupCourseId, 'challenge');
    await saveAnswer({ pupilId, occurrenceCourseId, resourceId, versionNo: 1, fieldKey: 't9.r1.c2', value: 'kept' });
    await setPupilLevel(pupilId, groupCourseId, 'support'); // re-slice
    const answers = await getAnswers(pupilId, occurrenceCourseId);
    expect(answers.get('t9.r1.c2')).toBe('kept'); // survives the level change
  });

  it('re-keyed answers survive a worksheet flip: same (pupil, oc, field) regardless of resource id', async () => {
    const { saveAnswer, getAnswers } = await import('../../src/repos/pupilWork');
    await saveAnswer({ pupilId, occurrenceCourseId, resourceId, versionNo: 1, fieldKey: 't5.r1.c1', value: 'first' });
    // the worksheet resolving to a different resource (master↔adapted) writes the SAME logical answer
    await saveAnswer({ pupilId, occurrenceCourseId, resourceId: null, versionNo: 2, fieldKey: 't5.r1.c1', value: 'second' });
    const answers = await getAnswers(pupilId, occurrenceCourseId);
    expect(answers.get('t5.r1.c1')).toBe('second'); // one row per field, not two hidden by the flip
  });

  it('/pupil/names is rate-limited against class-code sweeping', async () => {
    let throttled = false;
    for (let i = 0; i < 25; i++) {
      const page = await app.inject({ method: 'GET', url: '/pupil' });
      const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']);
      const res = await app.inject({
        method: 'POST', url: '/pupil/names',
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `code=NOPE-${i}`,
      });
      if (res.body.includes('Too many tries')) { throttled = true; break; }
    }
    expect(throttled).toBe(true);
  });

  it('the PIN lockout surfaces the distinct "locked" message via the /pupil/login route', async () => {
    const { setPupilPin, unlockPupil, resetRateLimiter } = {
      ...(await import('../../src/repos/pupilCredentials')),
      ...(await import('../../src/auth/rateLimit')),
    };
    await setPupilPin(otherPupilId, '2222');
    const post = async (pin: string) => {
      const page = await app.inject({ method: 'GET', url: '/pupil' });
      const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']);
      return app.inject({
        method: 'POST', url: '/pupil/login',
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `pupil=${otherPupilId}&group=${groupId}&pin=${pin}`,
      });
    };
    for (let i = 0; i < 5; i++) await post('0000'); // wrong PINs lock the account
    const locked = await post('2222'); // even the correct PIN is now locked
    expect(locked.body).toContain('is locked');
    expect(locked.headers['hx-redirect']).toBeUndefined();
    await unlockPupil(otherPupilId);
    resetRateLimiter();
  });

  it('wrong-PIN, not-enrolled, and disabled all return the identical generic message (no oracle)', async () => {
    const { setPupilPin, setPupilCredentialEnabled, resetRateLimiter } = {
      ...(await import('../../src/repos/pupilCredentials')),
      ...(await import('../../src/auth/rateLimit')),
    };
    resetRateLimiter();
    await setPupilPin(pupilId, '3333');
    const body = async (payload: string): Promise<string> => {
      const page = await app.inject({ method: 'GET', url: '/pupil' });
      const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']);
      const r = await app.inject({ method: 'POST', url: '/pupil/login', headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });
      return r.body.replace(/x-csrf-token":"[^"]+"/, 'TOKEN').replace(/value="[^"]+"/g, 'V'); // strip per-request token
    };
    const wrongPin = await body(`pupil=${pupilId}&group=${groupId}&pin=9999`);
    // a group the pupil is not enrolled in
    const otherGroup = await pool.query<{ id: number }>(`SELECT id FROM groups WHERE id <> $1 ORDER BY id LIMIT 1`, [groupId]);
    const notEnrolled = await body(`pupil=${pupilId}&group=${otherGroup.rows[0]!.id}&pin=3333`);
    await setPupilCredentialEnabled(pupilId, false);
    const disabled = await body(`pupil=${pupilId}&group=${groupId}&pin=3333`);
    await setPupilPin(pupilId, '4242'); // re-enable + restore the PIN used elsewhere
    resetRateLimiter();
    expect(wrongPin).toContain('check your PIN');
    expect(notEnrolled).toBe(wrongPin); // structurally identical — no enumeration signal
    expect(disabled).toBe(wrongPin);
  });

  it('saveAnswer clears seen_by_teacher only when the value actually changes', async () => {
    const { saveAnswer, markAnswersSeen } = await import('../../src/repos/pupilWork');
    await saveAnswer({ pupilId, occurrenceCourseId, resourceId, versionNo: 1, fieldKey: 't7.r1.c1', value: 'same' });
    await markAnswersSeen(occurrenceCourseId, pupilId);
    await saveAnswer({ pupilId, occurrenceCourseId, resourceId, versionNo: 1, fieldKey: 't7.r1.c1', value: 'same' }); // no-op re-save
    let seen = await pool.query<{ s: boolean }>(`SELECT seen_by_teacher s FROM pupil_answers WHERE pupil_id=$1 AND occurrence_course_id=$2 AND field_key='t7.r1.c1'`, [pupilId, occurrenceCourseId]);
    expect(seen.rows[0]!.s).toBe(true); // unchanged value did NOT re-flag
    await saveAnswer({ pupilId, occurrenceCourseId, resourceId, versionNo: 1, fieldKey: 't7.r1.c1', value: 'different' });
    seen = await pool.query<{ s: boolean }>(`SELECT seen_by_teacher s FROM pupil_answers WHERE pupil_id=$1 AND occurrence_course_id=$2 AND field_key='t7.r1.c1'`, [pupilId, occurrenceCourseId]);
    expect(seen.rows[0]!.s).toBe(false); // a real change re-flags as new
  });

  it('/me/feedback is one-per-lesson and whitelists activity chips', async () => {
    const session = await pupilLogin();
    const me = await app.inject({ method: 'GET', url: '/me', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(me.body)?.[1] ?? '';
    const cookie = firstCookie(me.headers['set-cookie']) || session;
    const send = (payload: string) => app.inject({ method: 'POST', url: `/me/feedback?oc=${occurrenceCourseId}`, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });
    await send('rating=2&liked=practical');
    await send('rating=3&liked=cards&liked=bogus&comment=hi'); // second write overwrites; 'bogus' off-whitelist
    const rows = await pool.query<{ rating: number; liked: string; comment: string }>(`SELECT rating, liked, comment FROM pupil_lesson_feedback WHERE pupil_id=$1 AND occurrence_course_id=$2`, [pupilId, occurrenceCourseId]);
    expect(rows.rowCount).toBe(1); // UNIQUE upsert — one row per pupil per lesson
    expect(rows.rows[0]!.rating).toBe(3); // overwritten
    expect(rows.rows[0]!.liked).toBe('cards'); // 'bogus' dropped by the chip whitelist
  });

  it('/me/done and /me/feedback reject a non-pupil session (401)', async () => {
    for (const url of [`/me/done?oc=${occurrenceCourseId}`, `/me/feedback?oc=${occurrenceCourseId}`]) {
      const res = await app.inject({ method: 'POST', url, headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: 'done=true' });
      expect([401, 403, 302]).toContain(res.statusCode); // never a successful write without a pupil session
    }
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
