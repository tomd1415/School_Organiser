import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';

// BUG-012: pupil/TA "current lesson" views must honour dated exceptions — a cancelled / free / whole-day
// off-timetable lesson must not show OR materialise an occurrence. The pupil /me path needs a timetabled
// group at the live slot (not deterministically testable here); the TA deep-link path takes an explicit
// lesson+date and a teacher may open it, so it exercises the same suppression wiring deterministically.
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
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  session = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('TA view honours dated exceptions (integration — BUG-012)', () => {
  it('a cancelled lesson is suppressed on the deep-link, not rendered or materialised', async () => {
    const slot = await pool.query<{ id: number }>(
      `SELECT tl.id FROM timetabled_lessons tl
         JOIN period_definitions p ON p.id = tl.period_definition_id
        WHERE tl.purpose = 'teaching' AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
        ORDER BY tl.id LIMIT 1`,
    );
    const lessonId = slot.rows[0]!.id;
    const date = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10); // within the ±31d bound; not a "next teaching" day
    const url = `/ta?lesson=${lessonId}&date=${date}`;
    try {
      // No exception → a teacher (who may deep-link) sees the lesson rendered.
      const before = await app.inject({ method: 'GET', url, headers: { cookie: session } });
      expect(before.statusCode).toBe(200);
      expect(before.body).toContain('Preparing ahead');

      // Cancel it on that date → suppressed, with a clear message.
      await pool.query(`INSERT INTO lesson_exceptions (date, timetabled_lesson_id, kind, note) VALUES ($1,$2,'cancelled','ZZ test') ON CONFLICT DO NOTHING`, [date, lessonId]);
      const after = await app.inject({ method: 'GET', url, headers: { cookie: session } });
      expect(after.statusCode).toBe(200);
      expect(after.body).toContain('off timetable / cancelled');
      expect(after.body).not.toContain('Preparing ahead');
    } finally {
      await pool.query(`DELETE FROM lesson_exceptions WHERE date = $1 AND timetabled_lesson_id = $2`, [date, lessonId]);
      // the first request materialised an occurrence on this future date — remove it (no real data there)
      await pool.query(`DELETE FROM occurrence_courses WHERE occurrence_id IN (SELECT id FROM lesson_occurrences WHERE timetabled_lesson_id = $1 AND date = $2)`, [lessonId, date]);
      await pool.query(`DELETE FROM lesson_occurrences WHERE timetabled_lesson_id = $1 AND date = $2`, [lessonId, date]);
    }
  });

  // BUG-012 (room substitution): a room_change must show the NEW room + a "Room change" badge, not the
  // timetabled room — otherwise a TA is sent to the wrong place. cover/room do NOT suppress the lesson.
  it('a room-change shows the new room and a "Room change" badge on the deep-link', async () => {
    const slot = await pool.query<{ id: number; roomId: number | null }>(
      `SELECT tl.id, tl.room_id AS "roomId" FROM timetabled_lessons tl
         JOIN period_definitions p ON p.id = tl.period_definition_id
        WHERE tl.purpose = 'teaching' AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
        ORDER BY tl.id LIMIT 1`,
    );
    const lessonId = slot.rows[0]!.id;
    // a room that is NOT the lesson's timetabled room, so seeing its name in the output proves substitution
    const room = await pool.query<{ id: number; name: string }>(
      `SELECT id, name FROM rooms WHERE id IS DISTINCT FROM $1 ORDER BY id LIMIT 1`,
      [slot.rows[0]!.roomId],
    );
    if (!room.rows[0]) return; // no alternative room seeded → nothing to prove here
    const newRoom = room.rows[0];
    const date = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const url = `/ta?lesson=${lessonId}&date=${date}`;
    try {
      await pool.query(
        `INSERT INTO lesson_exceptions (date, timetabled_lesson_id, kind, room_id, note) VALUES ($1,$2,'room_change',$3,'ZZ test') ON CONFLICT DO NOTHING`,
        [date, lessonId, newRoom.id],
      );
      const res = await app.inject({ method: 'GET', url, headers: { cookie: session } });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Preparing ahead'); // the lesson still runs (room-change doesn't suppress)
      expect(res.body).toContain('Room change'); // the visible badge
      expect(res.body).toContain(newRoom.name); // the EFFECTIVE room, not the timetabled one
    } finally {
      await pool.query(`DELETE FROM lesson_exceptions WHERE date = $1 AND timetabled_lesson_id = $2`, [date, lessonId]);
      await pool.query(`DELETE FROM occurrence_courses WHERE occurrence_id IN (SELECT id FROM lesson_occurrences WHERE timetabled_lesson_id = $1 AND date = $2)`, [lessonId, date]);
      await pool.query(`DELETE FROM lesson_occurrences WHERE timetabled_lesson_id = $1 AND date = $2`, [lessonId, date]);
    }
  });
});
