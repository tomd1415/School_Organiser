// Assessment authoring repo: CRUD + atomic materialise of an AI/teacher-authored draft, and the full
// question tree for review/take/results. Mirrors repos/schemes.ts (materialiseScheme) for the atomic insert.
// No pupil identity here — assessments are cohort curriculum content.
import { pool, withTransaction } from '../db/pool';
import {
  buildAssessmentTree,
  type AssessmentRow,
  type AssessmentStyle,
  type AssessmentTree,
  type MarkPointRow,
  type MisconceptionRow,
  type PartRow,
  type QuestionRow,
} from '../services/assessment';
import type { MarkKind } from '../lib/deterministicMarker';

// The validated draft shape materialiseAssessment persists (produced by the generator/validator or tests).
export interface DraftMarkPoint { text: string; marks: number; isRequired: boolean; acceptedAlternatives: string[]; kind: MarkKind }
export interface DraftMisconception { label: string; description: string }
export interface DraftPart {
  partLabel: string;
  prompt: string;
  marks: number;
  expectedResponseType: string;
  partConfig?: unknown | null;
  modelAnswer?: string | null;
  markPoints: DraftMarkPoint[];
  misconceptions?: DraftMisconception[];
}
export interface DraftQuestion {
  stem: string;
  specPointId: number | null;
  isUncovered: boolean;
  commandWordCode?: string | null;
  archetypeCode?: string | null;
  difficultyBand?: number | null;
  difficultyStep?: number | null;
  modelAnswer?: string | null;
  parts: DraftPart[];
}
export interface MaterialiseInput {
  unitId: number;
  schemeId: number;
  courseId: number;
  title: string;
  style: AssessmentStyle;
  examBoard: string | null;
  blueprint: unknown;
  sourceType?: 'ai_generated' | 'teacher' | 'imported';
  promptVersion?: string | null;
  questions: DraftQuestion[];
}

const A_COLS =
  `id, unit_id AS "unitId", scheme_id AS "schemeId", course_id AS "courseId", title, style, exam_board AS "examBoard",
   status, marks_total AS "marksTotal", blueprint, source_type AS "sourceType", prompt_version AS "promptVersion"`;

export async function getAssessment(id: number): Promise<AssessmentRow | null> {
  const { rows } = await pool.query<AssessmentRow>(`SELECT ${A_COLS} FROM assessments WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export interface AssessmentSummary {
  id: number;
  title: string;
  style: AssessmentStyle;
  status: string;
  marksTotal: number;
  questionCount: number;
  assignedClasses: number;
}
export async function listAssessmentsForUnit(unitId: number): Promise<AssessmentSummary[]> {
  const { rows } = await pool.query<AssessmentSummary>(
    `SELECT a.id, a.title, a.style, a.status, a.marks_total AS "marksTotal",
            (SELECT count(*)::int FROM assessment_questions q WHERE q.assessment_id = a.id) AS "questionCount",
            (SELECT count(*)::int FROM assessment_classes c WHERE c.assessment_id = a.id) AS "assignedClasses"
     FROM assessments a WHERE a.unit_id = $1 ORDER BY a.created_at DESC`,
    [unitId],
  );
  return rows;
}

export async function setAssessmentStatus(id: number, status: 'draft' | 'ready' | 'archived'): Promise<void> {
  await pool.query(`UPDATE assessments SET status = $2, updated_at = now() WHERE id = $1`, [id, status]);
}

/** Atomic insert of assessment + questions + parts + mark_points + misconceptions; recomputes marks_total. */
export async function materialiseAssessment(input: MaterialiseInput): Promise<number> {
  return withTransaction(async (db) => {
    const a = await db.query<{ id: number }>(
      `INSERT INTO assessments (unit_id, scheme_id, course_id, title, style, exam_board, status, blueprint, source_type, prompt_version)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',$7::jsonb,$8,$9) RETURNING id`,
      [input.unitId, input.schemeId, input.courseId, input.title.slice(0, 300), input.style, input.examBoard,
       JSON.stringify(input.blueprint ?? {}), input.sourceType ?? 'ai_generated', input.promptVersion ?? null],
    );
    const assessmentId = a.rows[0]!.id;
    let qOrder = 0;
    let marksTotal = 0;
    for (const q of input.questions) {
      const qMarks = q.parts.reduce((s, p) => s + (p.marks || 0), 0);
      marksTotal += qMarks;
      const qr = await db.query<{ id: number }>(
        `INSERT INTO assessment_questions
           (assessment_id, display_order, command_word_code, archetype_code, stem, spec_point_id, is_uncovered, difficulty_band, difficulty_step, marks_total, model_answer)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [assessmentId, qOrder++, q.commandWordCode ?? null, q.archetypeCode ?? null, q.stem, q.specPointId,
         q.isUncovered, q.difficultyBand ?? null, q.difficultyStep ?? null, qMarks, q.modelAnswer ?? null],
      );
      const questionId = qr.rows[0]!.id;
      let pOrder = 0;
      for (const p of q.parts) {
        const pr = await db.query<{ id: number }>(
          `INSERT INTO assessment_question_parts
             (question_id, part_label, display_order, prompt, marks, expected_response_type, part_config, model_answer)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8) RETURNING id`,
          [questionId, p.partLabel, pOrder++, p.prompt, p.marks, p.expectedResponseType,
           p.partConfig == null ? null : JSON.stringify(p.partConfig), p.modelAnswer ?? null],
        );
        const partId = pr.rows[0]!.id;
        let mOrder = 0;
        for (const mp of p.markPoints) {
          await db.query(
            `INSERT INTO assessment_mark_points (part_id, display_order, text, marks, is_required, accepted_alternatives, kind)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [partId, mOrder++, mp.text, mp.marks, mp.isRequired, mp.acceptedAlternatives ?? [], mp.kind],
          );
        }
        for (const m of p.misconceptions ?? []) {
          await db.query(`INSERT INTO assessment_misconceptions (part_id, label, description) VALUES ($1,$2,$3)`, [partId, m.label, m.description]);
        }
      }
    }
    await db.query(`UPDATE assessments SET marks_total = $2 WHERE id = $1`, [assessmentId, marksTotal]);
    return assessmentId;
  });
}

// ── Phase 1: light editing of a DRAFT paper (the route gates editing to status === 'draft') ──────────
// Each helper is scoped by assessment_id in its WHERE, so a forged child id from a DIFFERENT assessment
// can't be edited through this assessment's routes. Marks live on the PART (the authoritative tariff the
// materialiser sums); editing them re-rolls the question + assessment totals via recomputeAssessmentMarks.

const clampPartMarks = (n: number): number => Math.max(0, Math.min(20, Math.round(Number.isFinite(n) ? n : 0)));

/** Update a draft question's stem. Returns true if the question belongs to this assessment. */
export async function updateQuestionStem(assessmentId: number, questionId: number, stem: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE assessment_questions SET stem = $3 WHERE id = $2 AND assessment_id = $1`,
    [assessmentId, questionId, stem.slice(0, 4000)],
  );
  return (rowCount ?? 0) > 0;
}

/** Update a part's prompt and/or marks. When marks change, the question + assessment totals are recomputed. */
export async function updatePartFields(
  assessmentId: number,
  partId: number,
  fields: { prompt?: string; marks?: number },
): Promise<boolean> {
  const prompt = fields.prompt == null ? null : fields.prompt.slice(0, 4000);
  const marks = fields.marks == null ? null : clampPartMarks(fields.marks);
  const { rowCount } = await pool.query(
    `UPDATE assessment_question_parts p SET prompt = COALESCE($3, p.prompt), marks = COALESCE($4, p.marks)
     FROM assessment_questions q
     WHERE p.id = $2 AND q.id = p.question_id AND q.assessment_id = $1`,
    [assessmentId, partId, prompt, marks],
  );
  const ok = (rowCount ?? 0) > 0;
  if (ok && marks != null) await recomputeAssessmentMarks(assessmentId);
  return ok;
}

/** Update a mark point's text / marks / kind (marks here are per-point and don't change the part tariff). */
export async function updateMarkPointFields(
  assessmentId: number,
  markPointId: number,
  fields: { text?: string; marks?: number; kind?: MarkKind },
): Promise<boolean> {
  const text = fields.text == null ? null : fields.text.slice(0, 2000);
  const marks = fields.marks == null ? null : clampPartMarks(fields.marks);
  const { rowCount } = await pool.query(
    `UPDATE assessment_mark_points mp
       SET text = COALESCE($3, mp.text), marks = COALESCE($4, mp.marks), kind = COALESCE($5, mp.kind)
     FROM assessment_question_parts p
     JOIN assessment_questions q ON q.id = p.question_id
     WHERE mp.id = $2 AND p.id = mp.part_id AND q.assessment_id = $1`,
    [assessmentId, markPointId, text, marks, fields.kind ?? null],
  );
  return (rowCount ?? 0) > 0;
}

/** Recompute each question's marks_total (= Σ its parts' marks) and the assessment's marks_total
 *  (= Σ its questions' totals), atomically. Mirrors the totals materialiseAssessment computes on insert. */
export async function recomputeAssessmentMarks(assessmentId: number): Promise<void> {
  await withTransaction(async (db) => {
    await db.query(
      `UPDATE assessment_questions q
         SET marks_total = COALESCE((SELECT SUM(p.marks) FROM assessment_question_parts p WHERE p.question_id = q.id), 0)
       WHERE q.assessment_id = $1`,
      [assessmentId],
    );
    await db.query(
      `UPDATE assessments
         SET marks_total = COALESCE((SELECT SUM(q.marks_total) FROM assessment_questions q WHERE q.assessment_id = $1), 0),
             updated_at = now()
       WHERE id = $1`,
      [assessmentId],
    );
  });
}

/** The full question→part→mark-point/misconception tree for review/take/results. */
export async function assessmentWithQuestions(id: number): Promise<AssessmentTree | null> {
  const assessment = await getAssessment(id);
  if (!assessment) return null;
  const [questions, parts, markPoints, misconceptions] = await Promise.all([
    pool.query<QuestionRow>(
      `SELECT id, assessment_id AS "assessmentId", display_order AS "displayOrder", command_word_code AS "commandWordCode",
              archetype_code AS "archetypeCode", stem, spec_point_id AS "specPointId", is_uncovered AS "isUncovered",
              difficulty_band AS "difficultyBand", difficulty_step AS "difficultyStep", marks_total AS "marksTotal", model_answer AS "modelAnswer"
       FROM assessment_questions WHERE assessment_id = $1`, [id]),
    pool.query<PartRow>(
      `SELECT p.id, p.question_id AS "questionId", p.part_label AS "partLabel", p.display_order AS "displayOrder",
              p.prompt, p.marks, p.expected_response_type AS "expectedResponseType", p.part_config AS "partConfig", p.model_answer AS "modelAnswer"
       FROM assessment_question_parts p JOIN assessment_questions q ON q.id = p.question_id WHERE q.assessment_id = $1`, [id]),
    pool.query<MarkPointRow>(
      `SELECT mp.id, mp.part_id AS "partId", mp.display_order AS "displayOrder", mp.text, mp.marks,
              mp.is_required AS "isRequired", mp.accepted_alternatives AS "acceptedAlternatives", mp.kind
       FROM assessment_mark_points mp JOIN assessment_question_parts p ON p.id = mp.part_id
       JOIN assessment_questions q ON q.id = p.question_id WHERE q.assessment_id = $1`, [id]),
    pool.query<MisconceptionRow>(
      `SELECT mi.id, mi.part_id AS "partId", mi.label, mi.description
       FROM assessment_misconceptions mi JOIN assessment_question_parts p ON p.id = mi.part_id
       JOIN assessment_questions q ON q.id = p.question_id WHERE q.assessment_id = $1`, [id]),
  ]);
  return buildAssessmentTree(assessment, questions.rows, parts.rows, markPoints.rows, misconceptions.rows);
}
