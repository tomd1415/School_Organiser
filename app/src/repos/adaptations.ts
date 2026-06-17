// Phase 5.1: per-group adaptation of master lessons. The master lesson_plans row stays canonical;
// a group stores only its overrides. Resolution: a group's effective lesson = its adaptation where
// present, else the master. Every change is logged (lesson_adaptation_history).
import { pool } from '../db/pool';
import type { GuidedAccess } from '../llm/prompts/accessConstraints';

export interface MasterContent {
  objectives: string | null;
  outline: string | null;
}

export interface EffectiveLesson {
  adapted: boolean;
  objectives: string | null;
  outline: string | null;
  adaptationNote: string | null;
  adaptationId: number | null;
}

export async function getAdaptation(
  groupCourseId: number,
  lessonPlanId: number,
): Promise<{ id: number; objectives: string | null; outline: string | null; adaptationNote: string | null } | null> {
  const { rows } = await pool.query<{ id: number; objectives: string | null; outline: string | null; adaptationNote: string | null }>(
    `SELECT id, objectives, outline, adaptation_note AS "adaptationNote"
     FROM lesson_adaptations WHERE group_course_id = $1 AND lesson_plan_id = $2`,
    [groupCourseId, lessonPlanId],
  );
  return rows[0] ?? null;
}

/** The group's effective lesson — its override where present, else the master (the resolution rule). */
export async function getEffectiveLesson(
  groupCourseId: number,
  lessonPlanId: number,
  master: MasterContent,
): Promise<EffectiveLesson> {
  const a = await getAdaptation(groupCourseId, lessonPlanId);
  if (!a) {
    return { adapted: false, objectives: master.objectives, outline: master.outline, adaptationNote: null, adaptationId: null };
  }
  return {
    adapted: true,
    objectives: a.objectives ?? master.objectives,
    outline: a.outline ?? master.outline,
    adaptationNote: a.adaptationNote,
    adaptationId: a.id,
  };
}

export interface AdaptationInput {
  groupCourseId: number;
  lessonPlanId: number;
  objectives: string | null;
  outline: string | null;
  adaptationNote: string | null;
  changeSummary: string;
  author?: 'teacher' | 'ai';
}

/** Create or update a group's adaptation, appending a history row. Never touches the master. */
export async function upsertAdaptation(input: AdaptationInput): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO lesson_adaptations (group_course_id, lesson_plan_id, objectives, outline, adaptation_note, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (group_course_id, lesson_plan_id)
       DO UPDATE SET objectives = EXCLUDED.objectives, outline = EXCLUDED.outline,
                     adaptation_note = EXCLUDED.adaptation_note, updated_at = now()
       RETURNING id`,
      [input.groupCourseId, input.lessonPlanId, input.objectives, input.outline, input.adaptationNote],
    );
    const id = rows[0]!.id;
    await client.query(
      `INSERT INTO lesson_adaptation_history (adaptation_id, objectives, outline, adaptation_note, change_summary, author)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, input.objectives, input.outline, input.adaptationNote, input.changeSummary, input.author ?? 'teacher'],
    );
    await client.query('COMMIT');
    return id;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export interface HistoryRow {
  id: number;
  changeSummary: string | null;
  author: string;
  createdAt: string;
}

export async function listAdaptationHistory(adaptationId: number): Promise<HistoryRow[]> {
  const { rows } = await pool.query<HistoryRow>(
    `SELECT id, change_summary AS "changeSummary", author, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt"
     FROM lesson_adaptation_history WHERE adaptation_id = $1 ORDER BY created_at DESC, id DESC`,
    [adaptationId],
  );
  return rows;
}

/** Reset a group's lesson to the master (deletes the override; history cascades away with it). */
export async function resetAdaptation(groupCourseId: number, lessonPlanId: number): Promise<void> {
  await pool.query(`DELETE FROM lesson_adaptations WHERE group_course_id = $1 AND lesson_plan_id = $2`, [groupCourseId, lessonPlanId]);
}

// ── 5.5: the feedback loop — what recently happened in this group's lessons ────────────────────

export interface GroupCourseInfo {
  courseId: number;
  courseName: string;
  groupName: string | null;
}

export async function getGroupCourseInfo(groupCourseId: number): Promise<GroupCourseInfo | null> {
  const { rows } = await pool.query<GroupCourseInfo>(
    `SELECT c.id AS "courseId", c.name AS "courseName", g.name AS "groupName"
     FROM group_courses gc
     JOIN courses c ON c.id = gc.course_id
     LEFT JOIN groups g ON g.id = gc.group_id
     WHERE gc.id = $1`,
    [groupCourseId],
  );
  return rows[0] ?? null;
}

/** A class's year group ("Y8", "Y11", "Post-16") — sharpens the GCSE-proximity signal (B5). */
export async function getGroupYearGroup(groupCourseId: number): Promise<string | null> {
  const { rows } = await pool.query<{ yg: string | null }>(
    `SELECT g.year_group AS yg FROM group_courses gc JOIN groups g ON g.id = gc.group_id WHERE gc.id = $1`,
    [groupCourseId],
  );
  return rows[0]?.yg ?? null;
}

// 5.9: optional per-class teaching-context (adds to the course-level default, never replaces it).
export async function getGroupTeachingContext(groupCourseId: number): Promise<string | null> {
  const { rows } = await pool.query<{ teachingContext: string | null }>(
    `SELECT teaching_context AS "teachingContext" FROM group_courses WHERE id = $1`,
    [groupCourseId],
  );
  return rows[0]?.teachingContext ?? null;
}

export async function setGroupTeachingContext(groupCourseId: number, text: string): Promise<void> {
  await pool.query(`UPDATE group_courses SET teaching_context = $2 WHERE id = $1`, [groupCourseId, text.trim() || null]);
}

// idea 7 — the per-class guided-access questionnaire (optional). Raw answers as JSONB; a deterministic
// builder derives the constraint lines the AI sees. An empty object stores NULL (a no-op).
export async function getGuidedAccess(groupCourseId: number): Promise<GuidedAccess | null> {
  const { rows } = await pool.query<{ guidedAccess: GuidedAccess | null }>(
    `SELECT guided_access AS "guidedAccess" FROM group_courses WHERE id = $1`,
    [groupCourseId],
  );
  return rows[0]?.guidedAccess ?? null;
}

export async function setGuidedAccess(groupCourseId: number, answers: GuidedAccess): Promise<void> {
  const empty = !answers || Object.keys(answers).length === 0;
  await pool.query(`UPDATE group_courses SET guided_access = $2::jsonb WHERE id = $1`, [
    groupCourseId,
    empty ? null : JSON.stringify(answers),
  ]);
}

// Phase 11 — the class-intake "covered so far" summary (free prose; fed to planning).
export async function getCoveredSummary(groupCourseId: number): Promise<string | null> {
  const { rows } = await pool.query<{ s: string | null }>(`SELECT covered_summary AS s FROM group_courses WHERE id = $1`, [groupCourseId]);
  return rows[0]?.s ?? null;
}

export async function setCoveredSummary(groupCourseId: number, text: string): Promise<void> {
  await pool.query(`UPDATE group_courses SET covered_summary = $2 WHERE id = $1`, [groupCourseId, text.trim() || null]);
}

// Phase 11 — one-shot flag for auto-adapting a class's scheme once it first has context (+ a scheme).
export async function groupCourseAutoAdapted(groupCourseId: number): Promise<boolean> {
  const { rows } = await pool.query<{ x: boolean }>(`SELECT scheme_auto_adapted AS x FROM group_courses WHERE id = $1`, [groupCourseId]);
  return rows[0]?.x ?? true; // unknown class → treat as done so we never fire against a missing row
}

export async function setGroupCourseAutoAdapted(groupCourseId: number, value: boolean): Promise<void> {
  await pool.query(`UPDATE group_courses SET scheme_auto_adapted = $2 WHERE id = $1`, [groupCourseId, value]);
}

// idea 2 — recent lessons for a class that carry a pace signal: the step the class reached
// (progress_step) and the plan outline it was reached against. Only rows with a recorded step count;
// the master plan outline is a reasonable proxy for the planned-step count (the soft band tolerates it).
export async function recentPaceSamples(groupCourseId: number, limit = 6): Promise<Array<{ progressStep: number | null; outline: string | null }>> {
  const { rows } = await pool.query<{ progressStep: number | null; outline: string | null }>(
    `SELECT oc.progress_step AS "progressStep", lp.outline AS outline
     FROM occurrence_courses oc
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
     WHERE oc.group_course_id = $1 AND o.date <= CURRENT_DATE AND oc.progress_step IS NOT NULL
     ORDER BY o.date DESC
     LIMIT $2`,
    [groupCourseId, limit],
  );
  return rows;
}

/** The class's recorded ability midpoint — the anchor the three differentiation levels sit around. */
export async function getGroupAbility(groupCourseId: number): Promise<string | null> {
  const { rows } = await pool.query<{ a: string | null }>(`SELECT ability_midpoint a FROM group_courses WHERE id = $1`, [groupCourseId]);
  return rows[0]?.a ?? null;
}

export async function setGroupAbility(groupCourseId: number, text: string): Promise<void> {
  await pool.query(`UPDATE group_courses SET ability_midpoint = $2 WHERE id = $1`, [groupCourseId, text.trim() || null]);
}

export interface GroupHistoryEntry {
  date: string;
  stoppingPoint: string | null;
  planTitle: string | null;
  notes: Array<{ body: string; safeguarding: boolean }>;
  taFeedback: Array<{ pupils: string; lesson: string; safeguarding: boolean }>;
}

/** The group's most recent taught lessons (stopping point + notes), newest first.
 * Notes keep their safeguarding flag so the AI boundary can withhold flagged ones entirely. */
export async function recentGroupHistory(groupCourseId: number, limit = 4): Promise<GroupHistoryEntry[]> {
  const { rows } = await pool.query<GroupHistoryEntry>(
    `SELECT to_char(o.date, 'YYYY-MM-DD') AS date,
            oc.stopping_point AS "stoppingPoint",
            lp.title AS "planTitle",
            COALESCE((SELECT json_agg(json_build_object('body', n.body, 'safeguarding', n.safeguarding) ORDER BY n.created_at)
                      FROM notes n WHERE n.occurrence_id = o.id AND n.body <> ''), '[]') AS notes,
            COALESCE((SELECT json_agg(json_build_object('pupils', tf.pupils_text, 'lesson', tf.lesson_text, 'safeguarding', tf.safeguarding) ORDER BY tf.created_at)
                      FROM ta_feedback tf WHERE tf.occurrence_course_id = oc.id), '[]') AS "taFeedback"
     FROM occurrence_courses oc
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     LEFT JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
     WHERE oc.group_course_id = $1 AND o.date <= CURRENT_DATE
       AND (oc.stopping_point IS NOT NULL
            OR EXISTS (SELECT 1 FROM notes n WHERE n.occurrence_id = o.id AND n.body <> '')
            OR EXISTS (SELECT 1 FROM ta_feedback tf WHERE tf.occurrence_course_id = oc.id))
     ORDER BY o.date DESC
     LIMIT $2`,
    [groupCourseId, limit],
  );
  return rows;
}
