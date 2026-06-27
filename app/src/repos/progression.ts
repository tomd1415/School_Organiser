// Phase 16A — thin SQL over the progression tables (repos layer). Reads feed the PURE roll-up in
// services/progression.ts; writes are the teacher's manual ticks / scheme binding. Pupil evidence is PII
// — never sent to AI; cleared by the Phase-10 erasure path. See docs/LEVEL_SYSTEM_DB_DESIGN.md.
import { pool } from '../db/pool';
import type { ProgCriterion, SpecLink } from '../services/progression';

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

export interface SchemeWithCounts extends SchemeRow {
  strands: number;
  stages: number;
  units: number;
  criteria: number;
}

/** Every scheme with its content counts — for the progression admin list. */
export async function listSchemesWithCounts(): Promise<SchemeWithCounts[]> {
  const { rows } = await pool.query<SchemeWithCounts>(
    `SELECT s.id, s.name, s.kind, s.exam_board AS "examBoard", s.is_active AS "isActive",
            (SELECT count(*)::int FROM prog_strands  WHERE scheme_id = s.id) AS strands,
            (SELECT count(*)::int FROM prog_stages   WHERE scheme_id = s.id) AS stages,
            (SELECT count(*)::int FROM prog_units    WHERE scheme_id = s.id) AS units,
            (SELECT count(*)::int FROM prog_criteria c JOIN prog_stages st ON st.id = c.stage_id WHERE st.scheme_id = s.id) AS criteria
     FROM progression_schemes s ORDER BY s.is_active DESC, s.name`,
  );
  return rows;
}

export interface GridCell {
  stageOrdinal: number;
  stageLabel: string;
  strandId: number;
  strandCode: string;
  strandName: string;
  strandOrder: number;
  units: number;
  criteria: number;
}

/** The Stage × Strand grid for a scheme: unit + criteria counts per cell (the course-planning view). */
export async function schemeGrid(schemeId: number): Promise<GridCell[]> {
  const { rows } = await pool.query<GridCell>(
    `SELECT st.ordinal AS "stageOrdinal", st.label AS "stageLabel",
            sd.id AS "strandId", sd.code AS "strandCode", sd.name AS "strandName", sd.display_order AS "strandOrder",
            count(DISTINCT u.id)::int AS units,
            count(c.id)::int AS criteria
     FROM prog_stages st
     JOIN prog_strands sd ON sd.scheme_id = st.scheme_id
     LEFT JOIN prog_units u    ON u.stage_id = st.id AND u.strand_id = sd.id
     LEFT JOIN prog_criteria c ON c.stage_id = st.id AND c.strand_id = sd.id
     WHERE st.scheme_id = $1
     GROUP BY st.ordinal, st.label, sd.id, sd.code, sd.name, sd.display_order
     ORDER BY st.ordinal, sd.display_order`,
    [schemeId],
  );
  return rows;
}

export interface ClassSchemeRow {
  groupCourseId: number;
  label: string;
  schemeId: number | null;
  schemeName: string | null;
}

/** Each teaching class (group_course) with the progression scheme it's bound to (or none) — for assigning. */
export async function listClassesWithScheme(): Promise<ClassSchemeRow[]> {
  const { rows } = await pool.query<ClassSchemeRow>(
    `SELECT gc.id AS "groupCourseId", g.name || ' · ' || co.name AS label,
            gcs.scheme_id AS "schemeId", s.name AS "schemeName"
     FROM group_courses gc
     JOIN groups g  ON g.id = gc.group_id
     JOIN courses co ON co.id = gc.course_id
     LEFT JOIN group_course_scheme gcs ON gcs.group_course_id = gc.id
     LEFT JOIN progression_schemes s   ON s.id = gcs.scheme_id
     WHERE gc.active
     ORDER BY g.name, co.name`,
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

/** Clear a class's scheme binding (the "— none —" choice). */
export async function unbindClassScheme(groupCourseId: number): Promise<void> {
  await pool.query(`DELETE FROM group_course_scheme WHERE group_course_id = $1`, [groupCourseId]);
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

export interface PupilRow {
  id: number;
  displayName: string;
}

/** The active pupils enrolled in a class (group_course → its group). */
export async function enrolledPupilsForClass(groupCourseId: number): Promise<PupilRow[]> {
  const { rows } = await pool.query<PupilRow>(
    `SELECT p.id, p.display_name AS "displayName"
     FROM group_courses gc
     JOIN enrolments en ON en.group_id = gc.group_id AND en.active
     JOIN pupils p ON p.id = en.pupil_id
     WHERE gc.id = $1
     ORDER BY p.display_name`,
    [groupCourseId],
  );
  return rows;
}

/** Evidence sets for several pupils at once (one query) — for the class heat-map. */
export async function evidencedForPupils(pupilIds: number[]): Promise<Map<number, Set<number>>> {
  const out = new Map<number, Set<number>>();
  if (!pupilIds.length) return out;
  const { rows } = await pool.query<{ pupil_id: number; criterion_id: number }>(
    `SELECT pupil_id, criterion_id FROM pupil_criteria_evidence WHERE pupil_id = ANY($1::bigint[])`,
    [pupilIds],
  );
  for (const r of rows) {
    const pid = Number(r.pupil_id);
    let set = out.get(pid);
    if (!set) {
      set = new Set();
      out.set(pid, set);
    }
    set.add(Number(r.criterion_id));
  }
  return out;
}

export interface PupilClassRow {
  groupCourseId: number;
  label: string;
  schemeId: number;
  schemeName: string;
}

/** The classes a pupil is in that have a progression scheme bound — for the per-pupil ladder view. */
export async function pupilClassesWithScheme(pupilId: number): Promise<PupilClassRow[]> {
  const { rows } = await pool.query<PupilClassRow>(
    `SELECT gc.id AS "groupCourseId", g.name || ' · ' || co.name AS label, gcs.scheme_id AS "schemeId", s.name AS "schemeName"
     FROM enrolments en
     JOIN group_courses gc ON gc.group_id = en.group_id AND gc.active
     JOIN groups g  ON g.id = gc.group_id
     JOIN courses co ON co.id = gc.course_id
     JOIN group_course_scheme gcs ON gcs.group_course_id = gc.id
     JOIN progression_schemes s   ON s.id = gcs.scheme_id
     WHERE en.pupil_id = $1 AND en.active
     ORDER BY g.name, co.name`,
    [pupilId],
  );
  return rows;
}

export async function getPupilName(pupilId: number): Promise<string | null> {
  const { rows } = await pool.query<{ display_name: string }>(`SELECT display_name FROM pupils WHERE id = $1`, [pupilId]);
  return rows[0]?.display_name ?? null;
}

// ── 16A.4: auto-suggest evidence from marking (no AI) ───────────────────────────────────────────────────

/** Link a criterion to a course spec point (teacher-editable). Idempotent. */
export async function addSpecLink(criterionId: number, specPointId: number): Promise<void> {
  await pool.query(
    `INSERT INTO prog_spec_links (criterion_id, spec_point_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [criterionId, specPointId],
  );
}

export async function removeSpecLink(criterionId: number, specPointId: number): Promise<void> {
  await pool.query(`DELETE FROM prog_spec_links WHERE criterion_id = $1 AND spec_point_id = $2`, [criterionId, specPointId]);
}

/** The scheme a criterion belongs to (for redirecting back to its map after an edit). */
export async function schemeIdForCriterion(criterionId: number): Promise<number | null> {
  const { rows } = await pool.query<{ scheme_id: number }>(
    `SELECT st.scheme_id FROM prog_criteria c JOIN prog_stages st ON st.id = c.stage_id WHERE c.id = $1`,
    [criterionId],
  );
  return rows[0] ? Number(rows[0].scheme_id) : null;
}

/** Every criterion↔spec-point link in a scheme — the input to the pure suggest. */
export async function specLinksForScheme(schemeId: number): Promise<SpecLink[]> {
  const { rows } = await pool.query<{ criterionId: number; specPointId: number }>(
    `SELECT sl.criterion_id AS "criterionId", sl.spec_point_id AS "specPointId"
     FROM prog_spec_links sl
     JOIN prog_criteria c ON c.id = sl.criterion_id
     JOIN prog_stages st  ON st.id = c.stage_id
     WHERE st.scheme_id = $1`,
    [schemeId],
  );
  return rows;
}

/** The spec points a pupil has MASTERED — aggregate score across their (non-test) attempts ≥ threshold. */
export async function masteredSpecPointsForPupil(pupilId: number, thresholdPct = 70): Promise<Set<number>> {
  const { rows } = await pool.query<{ spec_point_id: number }>(
    `SELECT r.spec_point_id
     FROM assessment_spec_point_results r
     JOIN assessment_attempts at ON at.id = r.attempt_id AND at.pupil_id = $1 AND NOT at.is_test
     GROUP BY r.spec_point_id
     HAVING sum(r.marks_total) > 0 AND (100.0 * sum(r.marks_awarded) / sum(r.marks_total)) >= $2`,
    [pupilId, thresholdPct],
  );
  return new Set(rows.map((r) => Number(r.spec_point_id)));
}

export interface CriterionDetail {
  id: number;
  descriptor: string;
  stageOrdinal: number;
  stageLabel: string;
  strandCode: string;
}

/** Display detail for a set of criterion ids (descriptor + stage + strand). */
export async function criteriaDetails(criterionIds: number[]): Promise<CriterionDetail[]> {
  if (!criterionIds.length) return [];
  const { rows } = await pool.query<CriterionDetail>(
    `SELECT c.id, c.descriptor, st.ordinal AS "stageOrdinal", st.label AS "stageLabel", sd.code AS "strandCode"
     FROM prog_criteria c
     JOIN prog_stages st  ON st.id = c.stage_id
     JOIN prog_strands sd ON sd.id = c.strand_id
     WHERE c.id = ANY($1::bigint[])
     ORDER BY st.ordinal, sd.display_order, c.display_order`,
    [criterionIds],
  );
  return rows;
}

export interface CourseRef {
  courseId: number;
  courseName: string;
}

/** The distinct courses taught by classes bound to a scheme — whose spec points can map to its criteria. */
export async function coursesForScheme(schemeId: number): Promise<CourseRef[]> {
  const { rows } = await pool.query<CourseRef>(
    `SELECT DISTINCT co.id AS "courseId", co.name AS "courseName"
     FROM group_course_scheme gcs
     JOIN group_courses gc ON gc.id = gcs.group_course_id
     JOIN courses co ON co.id = gc.course_id
     WHERE gcs.scheme_id = $1
     ORDER BY co.name`,
    [schemeId],
  );
  return rows;
}

// ── 16A.8: assessments as stage evidence (direct question→criterion tags + per-unit placement) ──────────

/** Tag an assessment question to the stage criterion it evidences (the direct path, vs prog_spec_links). */
export async function tagQuestionCriterion(questionId: number, criterionId: number): Promise<void> {
  await pool.query(`INSERT INTO assessment_question_criteria (question_id, criterion_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [questionId, criterionId]);
}

export async function untagQuestionCriterion(questionId: number, criterionId: number): Promise<void> {
  await pool.query(`DELETE FROM assessment_question_criteria WHERE question_id = $1 AND criterion_id = $2`, [questionId, criterionId]);
}

/**
 * Criteria a pupil EVIDENCED in one attempt: those tagged to questions the pupil scored ≥ threshold on
 * (sum of the question's parts' awarded ÷ total). The deterministic "marks → stage evidence" path that
 * turns an end-of-unit paper into per-criterion ticks. Excludes nothing about test attempts here — the
 * caller passes a real attempt id.
 */
export async function criteriaEvidencedByAttempt(attemptId: number, thresholdPct = 70): Promise<Set<number>> {
  const { rows } = await pool.query<{ criterion_id: number }>(
    `SELECT aqc.criterion_id
     FROM assessment_question_criteria aqc
     JOIN assessment_question_parts p ON p.question_id = aqc.question_id
     JOIN assessment_answers ans ON ans.part_id = p.id AND ans.attempt_id = $1
     LEFT JOIN assessment_awarded_marks am ON am.answer_id = ans.id
     GROUP BY aqc.criterion_id
     HAVING sum(p.marks) > 0 AND (100.0 * sum(coalesce(am.marks_awarded, 0)) / sum(p.marks)) >= $2`,
    [attemptId, thresholdPct],
  );
  return new Set(rows.map((r) => Number(r.criterion_id)));
}

/** The criteria of a unit (its stage × strand band) — input to a per-unit placement computation. */
export async function criteriaForUnit(unitId: number): Promise<ProgCriterion[]> {
  const { rows } = await pool.query<{ id: number; stageOrdinal: number; strandId: number }>(
    `SELECT c.id, st.ordinal AS "stageOrdinal", c.strand_id AS "strandId"
     FROM prog_criteria c
     JOIN prog_lessons l ON l.id = c.lesson_id
     JOIN prog_stages  st ON st.id = c.stage_id
     WHERE l.unit_id = $1`,
    [unitId],
  );
  return rows;
}

/** Record the per-strand stage an end-of-unit assessment placed a pupil at (one row per pupil+unit). */
export async function recordUnitPlacement(input: {
  pupilId: number;
  unitId: number;
  assessmentId?: number | null;
  individualised?: boolean;
  placedPerStrand: Record<number, number | null>;
}): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_unit_placement (pupil_id, unit_id, assessment_id, individualised, placed_per_strand)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT (pupil_id, unit_id)
       DO UPDATE SET assessment_id = EXCLUDED.assessment_id, individualised = EXCLUDED.individualised,
                     placed_per_strand = EXCLUDED.placed_per_strand, taken_at = now()`,
    [input.pupilId, input.unitId, input.assessmentId ?? null, input.individualised ?? false, JSON.stringify(input.placedPerStrand)],
  );
}

export async function getUnitPlacement(pupilId: number, unitId: number): Promise<{ placedPerStrand: Record<number, number | null>; individualised: boolean } | null> {
  const { rows } = await pool.query<{ placed_per_strand: Record<number, number | null>; individualised: boolean }>(
    `SELECT placed_per_strand, individualised FROM pupil_unit_placement WHERE pupil_id = $1 AND unit_id = $2`,
    [pupilId, unitId],
  );
  return rows[0] ? { placedPerStrand: rows[0].placed_per_strand, individualised: rows[0].individualised } : null;
}

export interface SchemeCriterionWithLinks {
  id: number;
  descriptor: string;
  stageOrdinal: number;
  stageLabel: string;
  strandCode: string;
  specPointIds: number[];
}

/** A scheme's criteria with their current spec-point links — for the mapping editor. */
export async function schemeCriteriaWithLinks(schemeId: number): Promise<SchemeCriterionWithLinks[]> {
  const { rows } = await pool.query<SchemeCriterionWithLinks & { specPointIds: number[] | null }>(
    `SELECT c.id, c.descriptor, st.ordinal AS "stageOrdinal", st.label AS "stageLabel", sd.code AS "strandCode",
            coalesce(array_agg(sl.spec_point_id) FILTER (WHERE sl.spec_point_id IS NOT NULL), '{}') AS "specPointIds"
     FROM prog_criteria c
     JOIN prog_stages st  ON st.id = c.stage_id
     JOIN prog_strands sd ON sd.id = c.strand_id
     LEFT JOIN prog_spec_links sl ON sl.criterion_id = c.id
     WHERE st.scheme_id = $1
     GROUP BY c.id, c.descriptor, st.ordinal, st.label, sd.code, sd.display_order, c.display_order
     ORDER BY st.ordinal, sd.display_order, c.display_order`,
    [schemeId],
  );
  return rows.map((r) => ({ ...r, specPointIds: (r.specPointIds ?? []).map(Number) }));
}

/**
 * 16A.5 — the year-end overall ANCHOR per pupil for a scheme: the stage ordinal recorded in
 * pupil_year_assessment (a year-end overall paper / teacher confirmation). Fed to overallRollUp so the
 * overall is the confirmed year-end stage rather than the computed mean. Returns pupilId → stage ordinal.
 */
export async function yearAnchorsForScheme(pupilIds: number[], schemeId: number): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (!pupilIds.length) return out;
  const { rows } = await pool.query<{ pupil_id: number; ordinal: number }>(
    `SELECT ya.pupil_id, st.ordinal
     FROM pupil_year_assessment ya
     JOIN prog_stages st ON st.id = ya.stage_id
     WHERE st.scheme_id = $1 AND ya.pupil_id = ANY($2::bigint[])`,
    [schemeId, pupilIds],
  );
  // a pupil could (in principle) have anchors at several stages of a scheme — take the highest ordinal.
  for (const r of rows) {
    const pid = Number(r.pupil_id);
    const ord = Number(r.ordinal);
    if (!out.has(pid) || ord > out.get(pid)!) out.set(pid, ord);
  }
  return out;
}

/** Record (or update) a pupil's year-end overall anchor at a stage. One row per (pupil, stage). */
export async function recordYearAssessment(input: { pupilId: number; stageId: number; assessmentId?: number | null; overallLabel?: string | null }): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_year_assessment (pupil_id, stage_id, assessment_id, overall_label)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (pupil_id, stage_id)
       DO UPDATE SET assessment_id = EXCLUDED.assessment_id, overall_label = EXCLUDED.overall_label, recorded_at = now()`,
    [input.pupilId, input.stageId, input.assessmentId ?? null, input.overallLabel ?? null],
  );
}
