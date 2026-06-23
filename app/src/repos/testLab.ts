// Test Lab teardown. Test runs live on is_test lesson_occurrences (migration 0062); removing those rows
// returns the DB to a no-test state. The FK cascade from lesson_occurrences sweeps occurrence_courses →
// pupil_answers / pupil_marks / pupil_done / pupil_lesson_feedback / pupil_lesson_comments / pupil_atl /
// ta_feedback / marking_queue / occurrence_prep / resource_links. Three FKs are NO ACTION (no cascade) and
// MUST be cleared first or the DELETE throws: notes / tasks / time_entries (.occurrence_id). Pupil
// screenshots live on the resource volume (the DB holds only an `img:` pointer), so they are tombstoned +
// unlinked the same way disposePupil does.
import { pool, withTransaction } from '../db/pool';
import { clearFileDeletion, enqueueFileDeletion } from './fileDeletions';
import { removeStored } from '../lib/resourceStore';

/**
 * Remove Test Lab runs and all their work. `staleOnly` (the boot/periodic reaper) limits removal to runs
 * older than ~1 day by **created_at** — NOT by the lesson date, because a Test Lab run can be on any date
 * (even far-future), which a date-based reaper would never catch. Returns the number of occurrences wiped.
 */
export async function wipeTestOccurrences(staleOnly = false): Promise<number> {
  const staleClause = staleOnly ? `AND created_at < now() - interval '1 day'` : '';
  const { tombstones, removed } = await withTransaction(async (db) => {
    const occs = (
      await db.query<{ id: number }>(`SELECT id FROM lesson_occurrences WHERE is_test ${staleClause} FOR UPDATE`)
    ).rows.map((r) => r.id);
    if (occs.length === 0) return { tombstones: [] as Array<{ id: number; rel: string }>, removed: 0 };

    // Screenshot pointers, captured while the rows still exist; the files are unlinked after COMMIT.
    const imgPaths = (
      await db.query<{ value: string }>(
        `SELECT pa.value FROM pupil_answers pa
         JOIN occurrence_courses oc ON oc.id = pa.occurrence_course_id
         WHERE oc.occurrence_id = ANY($1) AND pa.value LIKE 'img:%'`,
        [occs],
      )
    ).rows
      .map((r) => r.value.slice(4))
      .filter((p) => p.startsWith('pupil-work/') && !p.includes('..'));
    const tombstones: Array<{ id: number; rel: string }> = [];
    for (const rel of imgPaths) tombstones.push({ id: await enqueueFileDeletion(db, rel, 'test-lab-wipe'), rel });

    // Clear the NO-ACTION FKs first. A note IS its occurrence's context → drop; a task / time entry may be
    // independently meaningful → just unlink (the columns are nullable).
    await db.query(`DELETE FROM notes WHERE occurrence_id = ANY($1)`, [occs]);
    await db.query(`UPDATE tasks SET occurrence_id = NULL WHERE occurrence_id = ANY($1)`, [occs]);
    await db.query(`UPDATE time_entries SET occurrence_id = NULL WHERE occurrence_id = ANY($1)`, [occs]);

    const { rowCount } = await db.query(`DELETE FROM lesson_occurrences WHERE id = ANY($1)`, [occs]);
    return { tombstones, removed: rowCount ?? 0 };
  });

  // Unlink now; a failure leaves the durable tombstone for the periodic file-deletion sweep.
  for (const t of tombstones) {
    try {
      await removeStored(t.rel);
      await clearFileDeletion(t.id);
    } catch (err) {
      console.warn(`wipeTestOccurrences: deferred unlink of ${t.rel} to the sweep:`, err);
    }
  }
  return removed;
}

/** How many Test Lab runs currently exist (for the launcher's "Reset (N runs)" button). */
export async function countTestOccurrences(): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM lesson_occurrences WHERE is_test`);
  return rows[0]?.n ?? 0;
}

/** "Test this lesson by topic": a lesson PLAN isn't tied to a slot, so to sandbox it we pick a real class
 *  (an active group_course) that takes the plan's course, and one of that class's timetable slots — that
 *  gives the sandbox occurrence a class context (worksheet level, slides) to render against. Returns null
 *  when the plan's course has no timetabled class yet (nothing to test it against). */
export async function pickTestSlotForPlan(planId: number): Promise<{ lessonId: number; groupCourseId: number } | null> {
  const { rows } = await pool.query<{ lessonId: number; groupCourseId: number }>(
    `SELECT tlc.timetabled_lesson_id AS "lessonId", gc.id AS "groupCourseId"
     FROM lesson_plans lp
     JOIN group_courses gc ON gc.course_id = lp.course_id AND gc.active
     JOIN timetabled_lesson_courses tlc ON tlc.group_course_id = gc.id
     JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
     WHERE lp.id = $1
     ORDER BY gc.id, tl.id
     LIMIT 1`,
    [planId],
  );
  return rows[0] ?? null;
}
