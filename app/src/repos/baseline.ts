// Phase 16A.7 — thin SQL for the start-of-year baseline (PII; never to AI; cleared on pupil erasure). The
// placement logic is pure (services/baseline.ts); this records the outcome and drives the "set baselines
// for this class" screen.
import { pool } from '../db/pool';
import type { BaselineConfidence } from '../services/baseline';

export interface RecordBaselineInput {
  pupilId: number;
  groupCourseId: number;
  academicYearId: number;
  assessmentId?: number | null;
  mode: 'cold_start' | 'warm_start';
  placedStageId?: number | null;
  placedPerStrand: Record<number, number | null>;
  confidence: BaselineConfidence;
}

/** Record (or update) a pupil's baseline placement — one per (pupil, class, year). */
export async function recordBaseline(input: RecordBaselineInput): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO pupil_baseline (pupil_id, group_course_id, academic_year_id, assessment_id, mode, placed_stage_id, placed_per_strand, confidence)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
     ON CONFLICT (pupil_id, group_course_id, academic_year_id)
       DO UPDATE SET assessment_id = EXCLUDED.assessment_id, mode = EXCLUDED.mode, placed_stage_id = EXCLUDED.placed_stage_id,
                     placed_per_strand = EXCLUDED.placed_per_strand, confidence = EXCLUDED.confidence, taken_at = now()
     RETURNING id`,
    [input.pupilId, input.groupCourseId, input.academicYearId, input.assessmentId ?? null, input.mode, input.placedStageId ?? null, JSON.stringify(input.placedPerStrand), input.confidence],
  );
  return rows[0]!.id;
}

export interface BaselineStatusRow {
  pupilId: number;
  displayName: string;
  mode: string | null;
  confidence: string | null;
  placedStageId: number | null;
  baselineMissing: boolean;
}

/**
 * Who in a class still needs a baseline this year, and which are low-confidence (random-clicking guard) —
 * surfaced missing-first, then low-confidence, then settled. Drives the start-of-year "set baselines" screen.
 */
export async function baselineStatusForClass(groupCourseId: number, academicYearId: number): Promise<BaselineStatusRow[]> {
  const { rows } = await pool.query<BaselineStatusRow>(
    `SELECT p.id AS "pupilId", p.display_name AS "displayName",
            b.mode, b.confidence, b.placed_stage_id AS "placedStageId",
            (b.id IS NULL) AS "baselineMissing"
     FROM group_courses gc
     JOIN enrolments en ON en.group_id = gc.group_id AND en.active
     JOIN pupils     p  ON p.id = en.pupil_id
     LEFT JOIN pupil_baseline b
            ON b.pupil_id = p.id AND b.group_course_id = gc.id AND b.academic_year_id = $2
     WHERE gc.id = $1
     ORDER BY (b.id IS NULL) DESC, (b.confidence <> 'ok') DESC, p.display_name`,
    [groupCourseId, academicYearId],
  );
  return rows;
}

export async function getBaseline(pupilId: number, groupCourseId: number, academicYearId: number): Promise<{ confidence: string; placedPerStrand: Record<number, number | null> } | null> {
  const { rows } = await pool.query<{ confidence: string; placed_per_strand: Record<number, number | null> }>(
    `SELECT confidence, placed_per_strand FROM pupil_baseline WHERE pupil_id = $1 AND group_course_id = $2 AND academic_year_id = $3`,
    [pupilId, groupCourseId, academicYearId],
  );
  return rows[0] ? { confidence: rows[0].confidence, placedPerStrand: rows[0].placed_per_strand } : null;
}
