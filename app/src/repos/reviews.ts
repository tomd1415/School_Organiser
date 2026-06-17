// Phase 11 Wave 5 (idea 8, lean cut) — SQL for the advisory lesson-review store. Reviews never mutate
// a lesson; the teacher Applies (writes the suggestion to the master) or Dismisses. Only 'open' rows
// are surfaced. v1 is master scope only (group_course_id always NULL); the column is reserved for a
// future per-class scope.
import { pool } from '../db/pool';

export interface ReviewFinding {
  issue: string;
  fix: string;
}

export type ReviewVerdict = 'keep' | 'tweak' | 'rework';
export type ReviewState = 'open' | 'applied' | 'dismissed';

export interface ReviewRow {
  id: number;
  lessonPlanId: number;
  groupCourseId: number | null;
  verdict: ReviewVerdict;
  findings: ReviewFinding[];
  suggestedObjectives: string | null;
  suggestedOutline: string | null;
  rationale: string | null;
  model: string | null;
  promptVersion: string | null;
  status: ReviewState;
  createdAt: string;
}

const COLS = `id, lesson_plan_id AS "lessonPlanId", group_course_id AS "groupCourseId", verdict,
              findings, suggested_objectives AS "suggestedObjectives", suggested_outline AS "suggestedOutline",
              rationale, model, prompt_version AS "promptVersion", status,
              to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt"`;

export interface NewReview {
  lessonPlanId: number;
  groupCourseId?: number | null;
  verdict: ReviewVerdict;
  findings: ReviewFinding[];
  suggestedObjectives: string | null;
  suggestedOutline: string | null;
  rationale: string | null;
  model: string | null;
  promptVersion: string | null;
}

// Returns the new id, or null if a concurrent insert already created the open review (the partial
// unique index `lesson_reviews_one_open_idx` makes the service's check-then-insert race-proof — the
// loser of the race is a no-op, treated as a skip).
export async function createReview(r: NewReview): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lesson_reviews
       (lesson_plan_id, group_course_id, verdict, findings, suggested_objectives, suggested_outline, rationale, model, prompt_version)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
     ON CONFLICT DO NOTHING RETURNING id`,
    [
      r.lessonPlanId,
      r.groupCourseId ?? null,
      r.verdict,
      JSON.stringify(r.findings ?? []),
      r.suggestedObjectives,
      r.suggestedOutline,
      r.rationale,
      r.model,
      r.promptVersion,
    ],
  );
  return rows[0]?.id ?? null;
}

// E1: a random not-yet-reviewed master lesson with content, from the active scheme — the spot-check
// sampler picks one so the teacher catches issues across the whole curriculum without reviewing all.
export async function randomReviewableLessonId(): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT lp.id FROM lesson_plans lp
       JOIN units u ON u.id = lp.unit_id
       JOIN schemes_of_work s ON s.id = u.scheme_id
      WHERE s.active AND lp.active
        AND (coalesce(lp.objectives, '') <> '' OR coalesce(lp.outline, '') <> '')
        AND NOT EXISTS (SELECT 1 FROM lesson_reviews r WHERE r.lesson_plan_id = lp.id AND r.group_course_id IS NULL AND r.status = 'open')
      ORDER BY random() LIMIT 1`,
  );
  return rows[0]?.id ?? null;
}

// E3: the findings the teacher has already APPLIED for a course — fed back into the cheap planners so
// they avoid repeating issues a review already flagged. Newest first, capped.
export async function recentAppliedFindings(courseId: number, limit = 8): Promise<ReviewFinding[]> {
  const { rows } = await pool.query<{ findings: ReviewFinding[] }>(
    `SELECT r.findings FROM lesson_reviews r
       JOIN lesson_plans lp ON lp.id = r.lesson_plan_id
      WHERE lp.course_id = $1 AND r.status = 'applied' AND jsonb_array_length(r.findings) > 0
      ORDER BY r.created_at DESC LIMIT 20`,
    [courseId],
  );
  const out: ReviewFinding[] = [];
  for (const row of rows) for (const f of row.findings ?? []) if (out.length < limit && f?.issue) out.push({ issue: f.issue, fix: f.fix });
  return out;
}

/** The cost guard: a lesson with an OPEN master review is skipped by the sweep (no double-spend). */
export async function hasOpenReviewForPlan(planId: number): Promise<boolean> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM lesson_reviews WHERE lesson_plan_id = $1 AND group_course_id IS NULL AND status = 'open'`,
    [planId],
  );
  return (rows[0]?.n ?? 0) > 0;
}

/** The single open master review for a lesson (the one surfaced inline), newest first. */
export async function getOpenReviewForPlan(planId: number): Promise<ReviewRow | null> {
  const { rows } = await pool.query<ReviewRow>(
    `SELECT ${COLS} FROM lesson_reviews
     WHERE lesson_plan_id = $1 AND group_course_id IS NULL AND status = 'open'
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [planId],
  );
  return rows[0] ?? null;
}

export async function getReview(id: number): Promise<ReviewRow | null> {
  const { rows } = await pool.query<ReviewRow>(`SELECT ${COLS} FROM lesson_reviews WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function setReviewStatus(id: number, status: ReviewState): Promise<void> {
  await pool.query(`UPDATE lesson_reviews SET status = $2 WHERE id = $1`, [id, status]);
}

/** Atomically flip an OPEN review to 'applied' and return it — or null if it wasn't open (already
 *  applied/dismissed, or gone). Makes apply a single-winner operation: two quick clicks can't both
 *  apply, and a stale suggestion can't be applied after the review was closed. */
export async function claimOpenReview(id: number): Promise<ReviewRow | null> {
  const { rows } = await pool.query<ReviewRow>(
    `UPDATE lesson_reviews SET status = 'applied' WHERE id = $1 AND status = 'open' RETURNING ${COLS}`,
    [id],
  );
  return rows[0] ?? null;
}

/** Plan ids (within a set) that currently have an open master review — for badging the tree. */
export async function openReviewPlanIds(planIds: number[]): Promise<Set<number>> {
  if (planIds.length === 0) return new Set();
  const { rows } = await pool.query<{ lesson_plan_id: number }>(
    `SELECT DISTINCT lesson_plan_id FROM lesson_reviews
     WHERE group_course_id IS NULL AND status = 'open' AND lesson_plan_id = ANY($1)`,
    [planIds],
  );
  return new Set(rows.map((r) => Number(r.lesson_plan_id)));
}

/** Total open master reviews — a single number for any future "you have N reviews" badge. */
export async function openReviewCount(): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM lesson_reviews WHERE group_course_id IS NULL AND status = 'open'`,
  );
  return rows[0]?.n ?? 0;
}
