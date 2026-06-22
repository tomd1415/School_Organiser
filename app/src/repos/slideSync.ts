// Live slide-sync state, persisted per occurrence_course so a late-joining pupil (or the projector
// board) lands on the teacher's current slide, and a reload keeps the lock. The broadcast that pushes
// changes to connected clients lives in services/slideSync.ts; this is just the durable read/write.
import { pool } from '../db/pool';

export interface SlideState {
  currentSlide: number;
  slidesLocked: boolean;
}

/** Read the persisted slide position + lock for one class's lesson (defaults if the row is missing). */
export async function getSlideState(occurrenceCourseId: number): Promise<SlideState> {
  const { rows } = await pool.query<{ currentSlide: number; slidesLocked: boolean }>(
    `SELECT current_slide AS "currentSlide", slides_locked AS "slidesLocked"
     FROM occurrence_courses WHERE id = $1`,
    [occurrenceCourseId],
  );
  return { currentSlide: rows[0]?.currentSlide ?? 0, slidesLocked: rows[0]?.slidesLocked ?? false };
}

/** Persist the teacher's current slide index (clamped to ≥0). */
export async function setSlide(occurrenceCourseId: number, index: number): Promise<void> {
  await pool.query(`UPDATE occurrence_courses SET current_slide = $2 WHERE id = $1`, [
    occurrenceCourseId,
    Math.max(0, Math.floor(index)),
  ]);
}

/** Lock pupils + board to the teacher's slide (true) or release them to roam (false). */
export async function setSlidesLocked(occurrenceCourseId: number, locked: boolean): Promise<void> {
  await pool.query(`UPDATE occurrence_courses SET slides_locked = $2 WHERE id = $1`, [occurrenceCourseId, locked]);
}
