import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  findOrCreateOccurrence,
  getOccurrenceCourses,
  getOccurrenceHeader,
} from '../../src/repos/occurrence';

// Exercises the real find-or-create against the dev DB. Uses a far-future date so
// it never collides with real data, and cleans up after itself.
const TEST_DATE = '2099-01-05';

describe('occurrence find-or-create (integration — needs the dev DB up)', () => {
  let splitLessonId = 0;

  beforeAll(async () => {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT tl.id
       FROM timetabled_lessons tl
       JOIN timetabled_lesson_courses tlc ON tlc.timetabled_lesson_id = tl.id
       GROUP BY tl.id
       HAVING count(*) > 1
       ORDER BY count(*) DESC, tl.id
       LIMIT 1`,
    );
    if (!rows[0]) throw new Error('no split lesson in the seed — run npm run seed');
    splitLessonId = rows[0].id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM lesson_occurrences WHERE timetabled_lesson_id = $1 AND date = $2`, [
      splitLessonId,
      TEST_DATE,
    ]);
    await pool.end();
  });

  it('is idempotent: same lesson+date returns the same occurrence', async () => {
    const a = await findOrCreateOccurrence(splitLessonId, TEST_DATE);
    const b = await findOrCreateOccurrence(splitLessonId, TEST_DATE);
    expect(a).toBe(b);
  });

  it('materialises one occurrence_course per course in the slot (split → several)', async () => {
    const id = await findOrCreateOccurrence(splitLessonId, TEST_DATE);
    const courses = await getOccurrenceCourses(id);
    expect(courses.length).toBeGreaterThan(1);

    // Re-running must not duplicate them.
    await findOrCreateOccurrence(splitLessonId, TEST_DATE);
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM occurrence_courses WHERE occurrence_id = $1`,
      [id],
    );
    expect(rows[0]?.n).toBe(courses.length);
  });

  it('the header reports the right date and lesson', async () => {
    const id = await findOrCreateOccurrence(splitLessonId, TEST_DATE);
    const header = await getOccurrenceHeader(id);
    expect(header?.date).toBe(TEST_DATE);
    expect(header?.lessonId).toBe(splitLessonId);
  });
});
