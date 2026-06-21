import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getTimetabledLessons } from '../../src/repos/timetable';
import { getClubRecord, setClubRecord, listClubHistory } from '../../src/repos/clubSessions';
import { getClockContext } from '../../src/repos/clock';

// Club session records + the clock commitments (migration 0060). Test rows use far-future dates and are
// removed in afterAll, keeping the teacher's real data clean.
let app: FastifyInstance;
let lessonId = 0;
const D1 = '2099-05-05';
const D2 = '2099-05-12';

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const lessons = await getTimetabledLessons();
  lessonId = lessons[0]?.lessonId ?? 0;
});

afterAll(async () => {
  await pool.query(`DELETE FROM club_sessions WHERE timetabled_lesson_id = $1`, [lessonId]).catch(() => {});
  await app.close();
});

describe('club session records (integration)', () => {
  it('records a session, reads it back, lists it as history, and upserts', async () => {
    expect(lessonId).toBeGreaterThan(0);
    await setClubRecord(lessonId, D1, 'Built the intro circuit; Sam stuck on resistors.');
    expect(await getClubRecord(lessonId, D1)).toContain('intro circuit');
    // a later session sees the earlier one in its history (continuity)
    expect((await listClubHistory(lessonId, D2)).map((h) => h.date)).toContain(D1);
    // saving again overwrites rather than duplicating
    await setClubRecord(lessonId, D1, 'Updated note.');
    expect(await getClubRecord(lessonId, D1)).toBe('Updated note.');
  });
});

describe('clock context commitments (integration)', () => {
  it('getClockContext returns a commitments array', async () => {
    const ctx = await getClockContext();
    expect(Array.isArray(ctx.commitments)).toBe(true);
  });
});
