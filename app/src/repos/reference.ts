// Phase 17 — thin SQL for the reference-lesson library: the activity-type catalogue, marking a resource as
// a reference lesson, the criterion/unit links (with the AI overview's advisory verify state), and the
// library lookups + review queue. Extends the existing resource store; no rebuild.
import { pool } from '../db/pool';
import { ACTIVITY_TYPES } from '../services/referenceImport';

/** Seed the activity-type catalogue (idempotent on code). */
export async function seedActivityTypes(): Promise<void> {
  for (let i = 0; i < ACTIVITY_TYPES.length; i++) {
    const a = ACTIVITY_TYPES[i]!;
    await pool.query(
      `INSERT INTO activity_types (code, name, description, display_order) VALUES ($1,$2,$3,$4)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, display_order = EXCLUDED.display_order`,
      [a.code, a.name, a.description, i],
    );
  }
}

/** True if a resource version with this checksum already exists — for idempotent re-import (dedupe). */
export async function checksumExists(sum: string): Promise<boolean> {
  const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM resource_versions WHERE checksum = $1`, [sum]);
  return (rows[0]?.n ?? 0) > 0;
}

export interface ActivityType {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export async function listActivityTypes(): Promise<ActivityType[]> {
  const { rows } = await pool.query<ActivityType>(`SELECT id, code, name, description FROM activity_types ORDER BY display_order, name`);
  return rows;
}

/** Mark a resource as a reference lesson and stamp its Teach Computing coordinates + activity type. */
export async function setResourceReference(
  resourceId: number,
  meta: { tccUnitKey?: string | null; tccLessonNo?: number | null; activityType?: string | null },
): Promise<void> {
  await pool.query(
    `UPDATE resources SET is_reference = true, tcc_unit_key = $2, tcc_lesson_no = $3, activity_type = $4 WHERE id = $1`,
    [resourceId, meta.tccUnitKey ?? null, meta.tccLessonNo ?? null, meta.activityType ?? null],
  );
}

export async function linkResourceUnit(resourceId: number, progUnitId: number): Promise<void> {
  await pool.query(`INSERT INTO resource_prog_unit (resource_id, prog_unit_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [resourceId, progUnitId]);
}

export type LinkOrigin = 'structure' | 'ai_suggested' | 'manual';
export type VerifyState = 'unverified' | 'confirmed' | 'needs_review' | 'mismatch';

/** Link a reference resource to a criterion it teaches (idempotent; updates origin/verify on re-link). */
export async function linkResourceCriterion(
  resourceId: number,
  criterionId: number,
  opts: { origin?: LinkOrigin; verifyState?: VerifyState; verifyNote?: string | null; confirmedBy?: string | null } = {},
): Promise<void> {
  await pool.query(
    `INSERT INTO resource_criteria (resource_id, criterion_id, origin, verify_state, verify_note, confirmed_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (resource_id, criterion_id)
       DO UPDATE SET origin = EXCLUDED.origin, verify_state = EXCLUDED.verify_state,
                     verify_note = COALESCE(EXCLUDED.verify_note, resource_criteria.verify_note),
                     confirmed_by = COALESCE(EXCLUDED.confirmed_by, resource_criteria.confirmed_by)`,
    [resourceId, criterionId, opts.origin ?? 'structure', opts.verifyState ?? 'unverified', opts.verifyNote ?? null, opts.confirmedBy ?? null],
  );
}

export async function unlinkResourceCriterion(resourceId: number, criterionId: number): Promise<void> {
  await pool.query(`DELETE FROM resource_criteria WHERE resource_id = $1 AND criterion_id = $2`, [resourceId, criterionId]);
}

/** Teacher confirms (or corrects) a link's verify state. */
export async function confirmResourceCriterion(resourceId: number, criterionId: number, by: string, verifyState: VerifyState = 'confirmed'): Promise<void> {
  await pool.query(`UPDATE resource_criteria SET verify_state = $3, confirmed_by = $4 WHERE resource_id = $1 AND criterion_id = $2`, [resourceId, criterionId, verifyState, by]);
}

export interface ReferenceLessonRow {
  resourceId: number;
  title: string;
  kind: string;
  activityType: string | null;
  verifyState: string;
}

/** (a) Reference lessons that teach a given criterion — confirmed first, mismatches excluded. */
export async function referencesForCriterion(criterionId: number): Promise<ReferenceLessonRow[]> {
  const { rows } = await pool.query<ReferenceLessonRow>(
    `SELECT r.id AS "resourceId", r.title, r.kind, r.activity_type AS "activityType", rc.verify_state AS "verifyState"
     FROM resource_criteria rc JOIN resources r ON r.id = rc.resource_id
     WHERE rc.criterion_id = $1 AND r.is_reference AND r.active AND rc.verify_state <> 'mismatch'
     ORDER BY (rc.verify_state = 'confirmed') DESC, r.title`,
    [criterionId],
  );
  return rows;
}

// ── 17.4: a pupil's own saved edit of an editable (worksheet/doc) reference file (PII) ──────────────────

/** Save (upsert) a pupil's edited copy of a resource for a lesson context. The master is untouched. */
export async function savePupilResourceEdit(pupilId: number, resourceId: number, lessonPlanId: number | null, body: string): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_resource_edits (pupil_id, resource_id, lesson_plan_id, body, updated_at)
     VALUES ($1,$2,$3,$4, now())
     ON CONFLICT (pupil_id, resource_id, lesson_plan_id)
       DO UPDATE SET body = EXCLUDED.body, updated_at = now()`,
    [pupilId, resourceId, lessonPlanId, body.slice(0, 200_000)],
  );
}

export async function getPupilResourceEdit(pupilId: number, resourceId: number, lessonPlanId: number | null): Promise<string | null> {
  const { rows } = await pool.query<{ body: string | null }>(
    `SELECT body FROM pupil_resource_edits WHERE pupil_id = $1 AND resource_id = $2 AND lesson_plan_id IS NOT DISTINCT FROM $3`,
    [pupilId, resourceId, lessonPlanId],
  );
  return rows[0]?.body ?? null;
}

export interface ReviewQueueRow {
  resourceId: number;
  title: string;
  criterion: string;
  origin: string;
  verifyState: string;
  verifyNote: string | null;
}

/** (d) The AI-overview review queue — links the teacher still needs to confirm/correct. */
export async function reviewQueue(limit = 200): Promise<ReviewQueueRow[]> {
  const { rows } = await pool.query<ReviewQueueRow>(
    `SELECT r.id AS "resourceId", r.title, c.descriptor AS criterion, rc.origin, rc.verify_state AS "verifyState", rc.verify_note AS "verifyNote"
     FROM resource_criteria rc
     JOIN resources r     ON r.id = rc.resource_id
     JOIN prog_criteria c ON c.id = rc.criterion_id
     WHERE rc.confirmed_by IS NULL AND rc.verify_state IN ('needs_review','mismatch','unverified')
     ORDER BY (rc.verify_state = 'mismatch') DESC, r.title
     LIMIT $1`,
    [limit],
  );
  return rows;
}
