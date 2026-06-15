import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { activateSchemeVersion, deletePlan, deleteUnit, getActiveScheme } from '../../src/repos/schemes';
import { createPupil } from '../../src/repos/pupils';

// Regression tests for the 2026-06-14 review fixes (#6 delete-FK, #9 pupil ai_token). Uses throwaway
// occurrences at far-future dates over an existing timetabled lesson + group-course (read-only), so
// the teacher's real data is never touched.
let tlId = 0;
let gcId = 0;
let schemeId = 0;
let unitId = 0;
const occIds: number[] = [];

beforeAll(async () => {
  tlId = Number((await pool.query<{ id: number }>(`SELECT id FROM timetabled_lessons ORDER BY id LIMIT 1`)).rows[0]!.id);
  const gc = (await pool.query<{ id: number; course_id: number }>(`SELECT id, course_id FROM group_courses ORDER BY id LIMIT 1`)).rows[0]!;
  gcId = Number(gc.id);
  const s = await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'ZZFIX scheme', 94, false) RETURNING id`, [Number(gc.course_id)]);
  schemeId = Number(s.rows[0]!.id);
  const u = await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'ZZFIX unit', 1) RETURNING id`, [schemeId]);
  unitId = Number(u.rows[0]!.id);
});

afterAll(async () => {
  if (occIds.length) await pool.query(`DELETE FROM lesson_occurrences WHERE id = ANY($1)`, [occIds]); // cascades occurrence_courses
  await pool.query(`DELETE FROM lesson_plans WHERE unit_id IN (SELECT id FROM units WHERE scheme_id = $1)`, [schemeId]);
  await pool.query(`DELETE FROM units WHERE scheme_id = $1`, [schemeId]);
  await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
  await pool.query(`DELETE FROM pupils WHERE display_name LIKE 'ZZFIX %'`);
  await pool.end();
});

async function makeOccurrenceCourse(date: string, planId: number): Promise<number> {
  const occ = await pool.query<{ id: number }>(`INSERT INTO lesson_occurrences (timetabled_lesson_id, date) VALUES ($1, $2) RETURNING id`, [tlId, date]);
  const occId = Number(occ.rows[0]!.id);
  occIds.push(occId);
  const oc = await pool.query<{ id: number }>(`INSERT INTO occurrence_courses (occurrence_id, group_course_id, lesson_plan_id) VALUES ($1, $2, $3) RETURNING id`, [occId, gcId, planId]);
  return Number(oc.rows[0]!.id);
}

describe('#6 — deleting a lesson plan/unit that has been taught no longer 500s (FK nulled first)', () => {
  it('deletePlan succeeds and nulls the occurrence_course binding', async () => {
    const p = await pool.query<{ id: number }>(`INSERT INTO lesson_plans (unit_id, course_id, title, display_order) SELECT $1, course_id, 'ZZFIX plan A', 1 FROM units u JOIN schemes_of_work s ON s.id=u.scheme_id WHERE u.id=$1 RETURNING id`, [unitId]);
    const planId = Number(p.rows[0]!.id);
    const ocId = await makeOccurrenceCourse('2099-01-02', planId);

    await expect(deletePlan(planId)).resolves.toBeUndefined(); // used to throw a FK violation
    expect((await pool.query(`SELECT 1 FROM lesson_plans WHERE id = $1`, [planId])).rowCount).toBe(0);
    const oc = await pool.query<{ lesson_plan_id: number | null }>(`SELECT lesson_plan_id FROM occurrence_courses WHERE id = $1`, [ocId]);
    expect(oc.rows[0]!.lesson_plan_id).toBeNull(); // binding nulled, not orphaned
  });

  it('deleteUnit succeeds even when a plan in it has been taught', async () => {
    const u = await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'ZZFIX unit 2', 2) RETURNING id`, [schemeId]);
    const u2 = Number(u.rows[0]!.id);
    const p = await pool.query<{ id: number }>(`INSERT INTO lesson_plans (unit_id, course_id, title, display_order) SELECT $1, course_id, 'ZZFIX plan B', 1 FROM units uu JOIN schemes_of_work s ON s.id=uu.scheme_id WHERE uu.id=$1 RETURNING id`, [u2]);
    const planId = Number(p.rows[0]!.id);
    const ocId = await makeOccurrenceCourse('2099-01-03', planId);

    await expect(deleteUnit(u2)).resolves.toBeUndefined();
    expect((await pool.query(`SELECT 1 FROM lesson_plans WHERE id = $1`, [planId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM units WHERE id = $1`, [u2])).rowCount).toBe(0);
    expect((await pool.query<{ lesson_plan_id: number | null }>(`SELECT lesson_plan_id FROM occurrence_courses WHERE id = $1`, [ocId])).rows[0]!.lesson_plan_id).toBeNull();
  });
});

describe('#2 — a draft scheme version can be made live (the rollover dead-end fix)', () => {
  it('activateSchemeVersion makes the target live and demotes the others to drafts', async () => {
    // A throwaway course (activate deactivates ALL active schemes for the course — never use a real one).
    const c = await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZFIX course ' || gen_random_uuid()) RETURNING id`);
    const courseId = Number(c.rows[0]!.id);
    const v1 = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'v1', 1, true) RETURNING id`, [courseId])).rows[0]!.id);
    const v2 = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'v2', 2, false) RETURNING id`, [courseId])).rows[0]!.id);
    try {
      expect((await getActiveScheme(courseId))?.id).toBe(v1); // v1 live initially; v2 a draft
      expect(await activateSchemeVersion(v2)).toBe(true);
      expect((await getActiveScheme(courseId))?.id).toBe(v2); // v2 now drives coverage/lessons/adapt
      const actives = await pool.query<{ id: number }>(`SELECT id FROM schemes_of_work WHERE course_id = $1 AND active`, [courseId]);
      expect(actives.rows.map((r) => Number(r.id))).toEqual([v2]); // exactly one active
    } finally {
      await pool.query(`DELETE FROM schemes_of_work WHERE course_id = $1`, [courseId]);
      await pool.query(`DELETE FROM courses WHERE id = $1`, [courseId]);
    }
  });
});

describe('#26 — apply-review is a single-winner atomic claim (no double-apply)', () => {
  it('claimOpenReview returns the row once, then null (two clicks cannot both apply)', async () => {
    const { createReview, claimOpenReview } = await import('../../src/repos/reviews');
    // a throwaway plan in the ZZFIX scheme's unit
    const p = await pool.query<{ id: number }>(`INSERT INTO lesson_plans (unit_id, course_id, title, display_order) SELECT $1, course_id, 'ZZFIX review plan', 9 FROM units uu JOIN schemes_of_work s ON s.id=uu.scheme_id WHERE uu.id=$1 RETURNING id`, [unitId]);
    const planId = Number(p.rows[0]!.id);
    const rid = await createReview({ lessonPlanId: planId, groupCourseId: null, verdict: 'tweak', findings: [], suggestedObjectives: 'X', suggestedOutline: 'Y', rationale: 'r', model: null, promptVersion: null });
    try {
      const first = await claimOpenReview(rid!);
      expect(first?.id).toBe(rid);
      expect(first?.status).toBe('applied');
      const second = await claimOpenReview(rid!);
      expect(second).toBeNull(); // already claimed — the second click is a no-op
    } finally {
      await pool.query(`DELETE FROM lesson_reviews WHERE id = $1`, [rid]);
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [planId]);
    }
  });
});

describe('#21 — email intake is idempotent (a re-seen message is not re-imported)', () => {
  it('markEmailProcessed / emailAlreadyProcessed round-trip (dedup store)', async () => {
    const { emailAlreadyProcessed, markEmailProcessed } = await import('../../src/repos/tasks');
    const key = 'ZZFIX-msg-' + Math.random().toString(36).slice(2);
    try {
      expect(await emailAlreadyProcessed(key)).toBe(false); // first sight
      await markEmailProcessed(key);
      expect(await emailAlreadyProcessed(key)).toBe(true); // re-seen → would be skipped
      await markEmailProcessed(key); // ON CONFLICT DO NOTHING — no throw on a repeat
    } finally {
      await pool.query(`DELETE FROM processed_emails WHERE dedup_key = $1`, [key]);
    }
  });
});

describe('#9 — pupil ai_token is derived from the row id (no collision, no reuse)', () => {
  it('assigns PUPIL_<id> tokens that are unique and match the row id', async () => {
    const a = await createPupil('ZZFIX Anna Lee');
    const b = await createPupil('ZZFIX Bo');
    expect(a.aiToken).toBe(`PUPIL_${a.id}`);
    expect(b.aiToken).toBe(`PUPIL_${b.id}`);
    expect(a.aiToken).not.toBe(b.aiToken);
  });
});
