import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { migrate } from '../../src/db/migrate';
import {
  countTaughtLessons,
  findOccurrence,
  findOrCreateOccurrence,
  getOccurrenceCourses,
  occurrenceCourseIsTest,
  setOccurrenceProgress,
} from '../../src/repos/occurrence';
import { saveAnswer } from '../../src/repos/pupilWork';
import { marksBacklog, recentMarkedOccurrenceCourses, writeMark } from '../../src/repos/marking';
import { slotSchedule, classSchedule } from '../../src/repos/delivery';
import { countTestOccurrences, wipeTestOccurrences } from '../../src/repos/testLab';
import { ensureTestPupil } from '../../src/repos/pupils';

// Test Lab isolation (Phase 1). A Test Lab run lives on an is_test occurrence on the SAME real slot+date as
// the real lesson but a DISJOINT occurrence_course_id. Prove: (1) the partition is distinct, (2) a test
// run's progress/marks/stopping-point never appear in the real taught-count / "last time" / marking
// backlog / planner schedules, and (3) wipeTestOccurrences() removes the test run (incl. a NO-ACTION-FK
// note) while leaving the real occurrence + its data untouched.
const DATE = '2099-09-09'; // far-future throwaway slot — never a real teaching record

let lessonId = 0;
let gcId = 0;
let realPupil = 0;
let testPupil = 0;

function ocFor(rows: Awaited<ReturnType<typeof getOccurrenceCourses>>, gc: number): number {
  return Number((rows.find((r) => Number(r.groupCourseId) === gc) ?? rows[0]!).occurrenceCourseId);
}

beforeAll(async () => {
  await migrate(); // ensure 0062 (is_test) is applied — this suite talks to the pool directly
  const row = (
    await pool.query<{ l: number; g: number }>(
      `SELECT tlc.timetabled_lesson_id AS l, tlc.group_course_id AS g
       FROM timetabled_lesson_courses tlc JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
       JOIN group_courses gc ON gc.id = tlc.group_course_id
       WHERE tl.purpose = 'teaching' AND gc.active LIMIT 1`,
    )
  ).rows[0]!;
  lessonId = Number(row.l);
  gcId = Number(row.g);
  realPupil = Number((await pool.query<{ id: number }>(`SELECT id FROM pupils WHERE NOT is_test ORDER BY id LIMIT 1`)).rows[0]!.id);
  testPupil = Number((await ensureTestPupil()).id);
});

afterAll(async () => {
  // Remove EVERYTHING this test created on the throwaway date (real + any leftover test occurrence) so the
  // suite's global-count assertions stay at baseline. Cascade clears occurrence_courses + all work.
  await pool.query(`DELETE FROM lesson_occurrences WHERE timetabled_lesson_id = $1 AND date = $2`, [lessonId, DATE]);
  await pool.end();
});

describe('Test Lab isolation', () => {
  it('mints a DISJOINT occurrence for the same slot+date and never converges on the real one', async () => {
    const realOcc = await findOrCreateOccurrence(lessonId, DATE, false);
    const testOcc = await findOrCreateOccurrence(lessonId, DATE, true);
    expect(testOcc).not.toBe(realOcc);
    expect(await findOccurrence(lessonId, DATE, false)).toBe(realOcc);
    expect(await findOccurrence(lessonId, DATE, true)).toBe(testOcc);

    const realOc = ocFor(await getOccurrenceCourses(realOcc), gcId);
    const testOc = ocFor(await getOccurrenceCourses(testOcc), gcId);
    expect(testOc).not.toBe(realOc);
    expect(await occurrenceCourseIsTest(testOc)).toBe(true);
    expect(await occurrenceCourseIsTest(realOc)).toBe(false);
  });

  it('a test run does not inflate the taught-lessons count', async () => {
    const testOc = ocFor(await getOccurrenceCourses((await findOrCreateOccurrence(lessonId, DATE, true))), gcId);
    const base = await countTaughtLessons();
    await setOccurrenceProgress(testOc, 3, 'Test Lab step');
    expect(await countTaughtLessons()).toBe(base); // test progress is NOT counted

    const realOc = ocFor(await getOccurrenceCourses((await findOrCreateOccurrence(lessonId, DATE, false))), gcId);
    await setOccurrenceProgress(realOc, 2, 'Real step');
    expect(await countTaughtLessons()).toBe(base + 1); // the real one IS
  });

  it('a test stopping-point never shows as the real "last time"', async () => {
    // both real + test have a stopping point on DATE (set above); the guard must surface only the real one
    const { getLastStoppingPoints } = await import('../../src/repos/occurrence');
    const last = await getLastStoppingPoints(lessonId, '2099-12-31');
    const forGc = last.find((l) => Number(l.groupCourseId) === gcId);
    expect(forGc?.stoppingPoint).toBe('Real step');
    expect(last.some((l) => l.stoppingPoint === 'Test Lab step')).toBe(false);
  });

  it('test answers + marks stay out of the marking backlog and recent-marked list', async () => {
    const realOc = ocFor(await getOccurrenceCourses((await findOrCreateOccurrence(lessonId, DATE, false))), gcId);
    const testOc = ocFor(await getOccurrenceCourses((await findOrCreateOccurrence(lessonId, DATE, true))), gcId);
    const mark = async (pupilId: number, oc: number): Promise<void> => {
      await saveAnswer({ pupilId, occurrenceCourseId: oc, resourceId: null, versionNo: null, fieldKey: 'q1', value: 'an answer' });
      const ansId = Number(
        (await pool.query<{ id: number }>(`SELECT id FROM pupil_answers WHERE pupil_id = $1 AND occurrence_course_id = $2 AND field_key = 'q1'`, [pupilId, oc])).rows[0]!.id,
      );
      await writeMark({ pupilAnswerId: ansId, marksAwarded: 1, marksTotal: 2, pointsHit: [], evidence: [], marker: 'ai', confidence: 0.5, status: 'suggested', needsReview: true, feedback: '' });
    };
    await mark(realPupil, realOc);
    await mark(testPupil, testOc);

    const backlogOcs = (await marksBacklog()).map((r) => Number(r.occurrenceCourseId));
    expect(backlogOcs).toContain(realOc);
    expect(backlogOcs).not.toContain(testOc);

    const recent = await recentMarkedOccurrenceCourses(gcId, 20);
    expect(recent).toContain(realOc);
    expect(recent).not.toContain(testOc);
  });

  it('a test run is not a phantom in the delivery planner schedules', async () => {
    const datesIn = (entries: Array<{ date: string }>): number => entries.filter((e) => e.date === DATE).length;
    // real + test occurrence both exist on DATE for this slot/class; the guard must show only ONE (the real)
    expect(datesIn(await slotSchedule(lessonId, gcId, '2099-01-01', '2099-12-31'))).toBe(1);
    expect(datesIn(await classSchedule(gcId, '2099-01-01', '2099-12-31'))).toBe(1);
  });

  it('wipeTestOccurrences() removes the test run (incl. its notes) and leaves the real one intact', async () => {
    const realOcc = await findOrCreateOccurrence(lessonId, DATE, false);
    const testOcc = await findOrCreateOccurrence(lessonId, DATE, true);
    const testOc = ocFor(await getOccurrenceCourses(testOcc), gcId);
    // a note on the test occurrence exercises the NO-ACTION (no-cascade) FK that wipe must clear first
    await pool.query(`INSERT INTO notes (occurrence_id, kind, body) VALUES ($1, 'lesson', 'test-lab note')`, [testOcc]);
    expect(await countTestOccurrences()).toBeGreaterThan(0);

    const removed = await wipeTestOccurrences();
    expect(removed).toBeGreaterThan(0);

    // test run + all its work gone
    expect(await findOccurrence(lessonId, DATE, true)).toBeNull();
    expect(Number((await pool.query<{ n: number }>(`SELECT count(*)::int n FROM pupil_answers WHERE occurrence_course_id = $1`, [testOc])).rows[0]!.n)).toBe(0);
    expect(Number((await pool.query<{ n: number }>(`SELECT count(*)::int n FROM notes WHERE occurrence_id = $1`, [testOcc])).rows[0]!.n)).toBe(0);

    // real occurrence + its data untouched
    expect(await findOccurrence(lessonId, DATE, false)).toBe(realOcc);
    const realOc = ocFor(await getOccurrenceCourses(realOcc), gcId);
    expect(Number((await pool.query<{ n: number }>(`SELECT count(*)::int n FROM pupil_answers WHERE occurrence_course_id = $1`, [realOc])).rows[0]!.n)).toBe(1);
  });
});
