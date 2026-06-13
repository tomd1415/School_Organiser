import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { findOrCreateOccurrence } from '../../src/repos/occurrence';
import {
  addFollowup,
  createNote,
  deleteNote,
  setOccurrenceCourseStopping,
  toggleFollowup,
  updateNoteBody,
} from '../../src/repos/notes';

// Exercises the notes DB layer against the dev DB on a far-future test date.
const TEST_DATE = '2099-02-02';

describe('notes (integration — needs the dev DB up)', () => {
  let lessonId = 0;
  let occurrenceId = 0;
  let occurrenceCourseId = 0;

  beforeAll(async () => {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT tl.id FROM timetabled_lessons tl
       JOIN timetabled_lesson_courses tlc ON tlc.timetabled_lesson_id = tl.id
       GROUP BY tl.id ORDER BY tl.id LIMIT 1`,
    );
    if (!rows[0]) throw new Error('no timetabled lesson with a course — run npm run seed');
    lessonId = rows[0].id;
    occurrenceId = await findOrCreateOccurrence(lessonId, TEST_DATE);
    const oc = await pool.query<{ id: number }>(
      `SELECT id FROM occurrence_courses WHERE occurrence_id = $1 ORDER BY id LIMIT 1`,
      [occurrenceId],
    );
    if (!oc.rows[0]) throw new Error('occurrence has no courses');
    occurrenceCourseId = oc.rows[0].id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM lesson_occurrences WHERE timetabled_lesson_id = $1 AND date = $2`, [
      lessonId,
      TEST_DATE,
    ]);
    await pool.end();
  });

  it('creates, autosaves and deletes a note', async () => {
    const { id } = await createNote({ kind: 'lesson', occurrenceId });
    await updateNoteBody(id, 'good engagement, got to star/mesh');
    const { rows } = await pool.query<{ body: string }>(`SELECT body FROM notes WHERE id = $1`, [id]);
    expect(rows[0]?.body).toBe('good engagement, got to star/mesh');
    await deleteNote(id);
    const after = await pool.query(`SELECT 1 FROM notes WHERE id = $1`, [id]);
    expect(after.rowCount).toBe(0);
  });

  it('optimistic concurrency (10.10): a stale tab cannot clobber a newer note edit', async () => {
    const { id, rev: rev1 } = await createNote({ kind: 'lesson', occurrenceId });
    const r1 = await updateNoteBody(id, 'first edit', rev1);
    expect(r1.ok).toBe(true);
    expect(r1.rev).not.toBe(rev1); // the token advanced
    // A second tab still holding rev1 tries to save — refused, body unchanged.
    const stale = await updateNoteBody(id, 'clobber from a stale tab', rev1);
    expect(stale.ok).toBe(false);
    expect((await pool.query<{ body: string }>(`SELECT body FROM notes WHERE id=$1`, [id])).rows[0]!.body).toBe('first edit');
    // The up-to-date tab (holding the advanced token) saves fine.
    const r2 = await updateNoteBody(id, 'second edit', r1.rev!);
    expect(r2.ok).toBe(true);
    // No token → plain last-write-wins (surfaces that haven't adopted the guard).
    expect((await updateNoteBody(id, 'no-guard edit')).ok).toBe(true);
    await deleteNote(id);
  });

  it('adds and toggles a follow-up, which cascades on note delete', async () => {
    const { id } = await createNote({ kind: 'lesson', occurrenceId });
    const fu = await addFollowup(id, 'reteach subnetting');
    expect(fu.done).toBe(false);
    const toggled = await toggleFollowup(fu.id);
    expect(toggled?.done).toBe(true);
    await deleteNote(id);
    const after = await pool.query(`SELECT 1 FROM note_followups WHERE id = $1`, [fu.id]);
    expect(after.rowCount).toBe(0);
  });

  it('sets a per-course stopping point (the source for "last time")', async () => {
    await setOccurrenceCourseStopping(occurrenceCourseId, 'packet switching, mid-way');
    const { rows } = await pool.query<{ stopping_point: string }>(
      `SELECT stopping_point FROM occurrence_courses WHERE id = $1`,
      [occurrenceCourseId],
    );
    expect(rows[0]?.stopping_point).toBe('packet switching, mid-way');
  });
});
