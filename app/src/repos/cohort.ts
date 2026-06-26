// Pupils §11 cohort-analytics: per-class roster with level · completion % · ATL trend, plus the class's
// ability midpoint. Teacher-only, never AI-bound (the redaction roster still tokenises any egress). All
// derived from existing tables — pupil_levels, pupil_done, pupil_atl, enrolments, group_courses.
import { pool } from '../db/pool';

export type Level = 'support' | 'core' | 'challenge';
export type AtlTrend = 'up' | 'down' | 'flat' | 'none';

export interface RosterClass {
  groupCourseId: number;
  groupName: string;
  courseName: string;
  pupilCount: number;
}

export interface CohortPupil {
  id: number;
  displayName: string;
  aiToken: string;
  active: boolean;
  level: Level | null;
  completionPct: number | null; // null when the class has no delivered lessons yet
  atlTrend: AtlTrend;
}

export interface ClassCohort {
  pupils: CohortPupil[];
  abilityMidpoint: Level | null; // the class's central level (median), null when no levels recorded
  deliveredLessons: number;
}

/** Every class (group_course) that has a roster — for the §11 class chips. */
export async function listRosterClasses(): Promise<RosterClass[]> {
  const { rows } = await pool.query<RosterClass>(
    `SELECT gc.id AS "groupCourseId", g.name AS "groupName", c.name AS "courseName",
            (SELECT count(*)::int FROM enrolments e WHERE e.group_id = gc.group_id AND e.active) AS "pupilCount"
     FROM group_courses gc
     JOIN groups g ON g.id = gc.group_id
     JOIN courses c ON c.id = gc.course_id
     WHERE gc.active
     ORDER BY g.name, c.name`,
  );
  return rows.filter((r) => r.pupilCount > 0);
}

const LV: Record<Level, number> = { support: 1, core: 2, challenge: 3 };
const LV_BACK: Record<number, Level> = { 1: 'support', 2: 'core', 3: 'challenge' };

// ATL trend = recent-half average vs older-half average (oldest→newest scores). Pure; unit-tested.
export function atlTrendOf(scores: number[]): AtlTrend {
  if (scores.length < 2) return 'none';
  const mid = Math.floor(scores.length / 2);
  const older = scores.slice(0, mid);
  const recent = scores.slice(mid);
  const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
  const diff = avg(recent) - avg(older);
  if (diff > 0.25) return 'up';
  if (diff < -0.25) return 'down';
  return 'flat';
}

// The class ability midpoint = median of the recorded levels (support<core<challenge). Pure; unit-tested.
export function medianLevel(levels: Level[]): Level | null {
  const nums = levels.map((l) => LV[l]);
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const m = sorted[Math.floor((sorted.length - 1) / 2)]!;
  return LV_BACK[Math.round(m)] ?? 'core';
}

/** The §11 cohort for one class: each pupil's level, completion % and ATL trend + the class midpoint. */
export async function classCohort(groupCourseId: number, today: string): Promise<ClassCohort> {
  // Delivered (past, non-test) occurrences for this class — the denominator for completion %.
  const delivered = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n
     FROM occurrence_courses oc JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     WHERE oc.group_course_id = $1 AND NOT o.is_test AND o.date <= $2`,
    [groupCourseId, today],
  );
  const deliveredLessons = delivered.rows[0]?.n ?? 0;

  const roster = await pool.query<{ id: number; displayName: string; aiToken: string; active: boolean; level: Level | null; done: number }>(
    `SELECT p.id, p.display_name AS "displayName", p.ai_token AS "aiToken", p.active,
            pl.level,
            (SELECT count(*)::int FROM pupil_done d
               JOIN occurrence_courses oc ON oc.id = d.occurrence_course_id
               JOIN lesson_occurrences o ON o.id = oc.occurrence_id
             WHERE d.pupil_id = p.id AND oc.group_course_id = $1 AND NOT o.is_test AND o.date <= $2) AS done
     FROM enrolments e
     JOIN group_courses gc ON gc.id = $1 AND gc.group_id = e.group_id
     JOIN pupils p ON p.id = e.pupil_id
     LEFT JOIN pupil_levels pl ON pl.pupil_id = p.id AND pl.group_course_id = $1
     WHERE e.active AND p.active
     ORDER BY p.display_name`,
    [groupCourseId, today],
  );

  // ATL scores for this class's lessons, oldest→newest, to compute each pupil's trend.
  const atl = await pool.query<{ pupilId: number; score: number }>(
    `SELECT pa.pupil_id AS "pupilId", pa.score
     FROM pupil_atl pa
     JOIN occurrence_courses oc ON oc.id = pa.occurrence_course_id
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     WHERE oc.group_course_id = $1 AND NOT o.is_test /* TEST-LAB-GUARD */
     ORDER BY o.date, pa.updated_at`,
    [groupCourseId],
  );
  const byPupil = new Map<number, number[]>();
  for (const r of atl.rows) {
    const arr = byPupil.get(r.pupilId) ?? [];
    arr.push(r.score);
    byPupil.set(r.pupilId, arr);
  }

  const pupils: CohortPupil[] = roster.rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    aiToken: r.aiToken,
    active: r.active,
    level: r.level,
    completionPct: deliveredLessons > 0 ? Math.round((r.done / deliveredLessons) * 100) : null,
    atlTrend: atlTrendOf(byPupil.get(r.id) ?? []),
  }));

  const abilityMidpoint = medianLevel(pupils.map((p) => p.level).filter((l): l is Level => l != null));
  return { pupils, abilityMidpoint, deliveredLessons };
}
