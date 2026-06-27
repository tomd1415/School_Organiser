// Phase 16A — thin SQL over the progression tables (repos layer). Reads feed the PURE roll-up in
// services/progression.ts; writes are the teacher's manual ticks / scheme binding. Pupil evidence is PII
// — never sent to AI; cleared by the Phase-10 erasure path. See docs/LEVEL_SYSTEM_DB_DESIGN.md.
import { pool } from '../db/pool';
import type { ProgCriterion } from '../services/progression';

export interface SchemeRow {
  id: number;
  name: string;
  kind: 'year_ladder' | 'gcse_grades' | 'qualification';
  examBoard: string | null;
  isActive: boolean;
}

export async function listSchemes(): Promise<SchemeRow[]> {
  const { rows } = await pool.query<SchemeRow>(
    `SELECT id, name, kind, exam_board AS "examBoard", is_active AS "isActive"
     FROM progression_schemes ORDER BY is_active DESC, name`,
  );
  return rows;
}

export async function getSchemeForClass(groupCourseId: number): Promise<number | null> {
  const { rows } = await pool.query<{ scheme_id: number }>(
    `SELECT scheme_id FROM group_course_scheme WHERE group_course_id = $1`,
    [groupCourseId],
  );
  return rows[0]?.scheme_id ?? null;
}

/** Bind (or re-bind) a class to a scheme — one scheme per class. */
export async function bindClassToScheme(groupCourseId: number, schemeId: number): Promise<void> {
  await pool.query(
    `INSERT INTO group_course_scheme (group_course_id, scheme_id) VALUES ($1, $2)
     ON CONFLICT (group_course_id) DO UPDATE SET scheme_id = EXCLUDED.scheme_id, assigned_at = now()`,
    [groupCourseId, schemeId],
  );
}

export interface StrandRow {
  id: number;
  code: string;
  name: string;
  displayOrder: number;
}

export async function listStrands(schemeId: number): Promise<StrandRow[]> {
  const { rows } = await pool.query<StrandRow>(
    `SELECT id, code, name, display_order AS "displayOrder"
     FROM prog_strands WHERE scheme_id = $1 ORDER BY display_order, name`,
    [schemeId],
  );
  return rows;
}

export interface StageRow {
  id: number;
  ordinal: number;
  label: string;
  yearGroup: number | null;
  keyStage: string | null;
}

export async function listStages(schemeId: number): Promise<StageRow[]> {
  const { rows } = await pool.query<StageRow>(
    `SELECT id, ordinal, label, year_group AS "yearGroup", key_stage AS "keyStage"
     FROM prog_stages WHERE scheme_id = $1 ORDER BY ordinal`,
    [schemeId],
  );
  return rows;
}

/** Every criterion of a scheme, tagged with its stage ordinal + strand — the input to the pure roll-up. */
export async function criteriaForScheme(schemeId: number): Promise<ProgCriterion[]> {
  const { rows } = await pool.query<{ id: number; stageOrdinal: number; strandId: number }>(
    `SELECT c.id, st.ordinal AS "stageOrdinal", c.strand_id AS "strandId"
     FROM prog_criteria c
     JOIN prog_stages st ON st.id = c.stage_id
     WHERE st.scheme_id = $1
     ORDER BY st.ordinal, c.strand_id, c.display_order`,
    [schemeId],
  );
  return rows;
}

/** The set of criterion ids a pupil has evidenced (any source). The roll-up takes only ids. */
export async function evidencedCriterionIds(pupilId: number): Promise<Set<number>> {
  const { rows } = await pool.query<{ criterion_id: number }>(
    `SELECT criterion_id FROM pupil_criteria_evidence WHERE pupil_id = $1`,
    [pupilId],
  );
  return new Set(rows.map((r) => Number(r.criterion_id)));
}

export interface EvidenceInput {
  pupilId: number;
  criterionId: number;
  tickedBy?: string | null;
  sourceKind?: 'manual' | 'assessment' | 'worksheet' | 'observation' | 'baseline' | null;
  sourceRefId?: number | null;
  note?: string | null;
}

/** Tick a criterion for a pupil (idempotent on (pupil, criterion)). Returns true if a new row was written. */
export async function addEvidence(e: EvidenceInput): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO pupil_criteria_evidence (pupil_id, criterion_id, ticked_by, source_kind, source_ref_id, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (pupil_id, criterion_id) DO NOTHING`,
    [e.pupilId, e.criterionId, e.tickedBy ?? null, e.sourceKind ?? 'manual', e.sourceRefId ?? null, e.note ?? null],
  );
  return (rowCount ?? 0) > 0;
}

/** Untick a criterion for a pupil (the manual fallback / correction). */
export async function removeEvidence(pupilId: number, criterionId: number): Promise<void> {
  await pool.query(`DELETE FROM pupil_criteria_evidence WHERE pupil_id = $1 AND criterion_id = $2`, [pupilId, criterionId]);
}
