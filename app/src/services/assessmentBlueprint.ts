// Phase 1 — the assessment BLUEPRINT: what to ask the AI to assess for a (unit, class) pair. No AI here;
// DB reads + pure assembly. A pure `assembleBlueprint(...)` core (unit-testable without a DB) is wrapped by
// the DB-reading `blueprintForUnit(...)`. "Covered by this class" = the union of every placed lesson's spec
// points across the class's delivery, intersected with the course's spec points; everything else is
// "uncovered" (a few of which become clearly-flagged stretch questions). No pupil identity is in scope —
// this is cohort curriculum content only.
import { getUnitForReview, schemeIdForUnit } from '../repos/schemes';
import { listSpecPoints, getPlanSpecPointIds } from '../repos/specPoints';
import { classSchedule } from '../repos/delivery';
import { examProfileForCourse, type ExamProfile } from './examProfile';
import { addDays } from '../lib/time';

export interface BlueprintSpecPoint {
  id: number;
  code: string;
  title: string;
  covered: boolean;
}

export interface AssessmentBlueprint {
  unitId: number;
  schemeId: number;
  courseId: number;
  unitTitle: string;
  courseName: string;
  style: 'ks3' | 'gcse'; // from examProfile.stage (foundational → ks3; everything else → gcse)
  examBoard: string | null; // 'OCR J277' when gcse (the only board in v1), else null
  examProfileLabel: string; // examProfile.label — drops into the prompt
  specPoints: BlueprintSpecPoint[]; // course spec points, each flagged covered/uncovered
  coveredCount: number;
  uncoveredCount: number;
  groupCourseId: number; // the class the blueprint was built from (persisted in the blueprint JSON)
  lessonTitles: string[]; // the unit's lessons — prompt context (and the KS3 fallback when no spec points)
  lessonObjectives: string[]; // the unit's lesson objectives — prompt context
}

export interface AssembleBlueprintInput {
  unitId: number;
  schemeId: number;
  courseId: number;
  unitTitle: string;
  courseName: string;
  specPoints: Array<{ id: number; code: string; title: string }>;
  coveredSpecPointIds: Iterable<number>;
  examStage: ExamProfile['stage'];
  examProfileLabel: string;
  groupCourseId: number;
  lessonTitles: string[];
  lessonObjectives: string[];
}

/** The pure core: partition the course's spec points into covered/uncovered and map the exam stage to a
 *  style + board. Intersects covered ids with the course's spec points internally, so passing extraneous
 *  ids (a covered point from a different course, say) is harmless. */
export function assembleBlueprint(input: AssembleBlueprintInput): AssessmentBlueprint {
  const coveredIds = new Set<number>(input.coveredSpecPointIds);
  const specPoints: BlueprintSpecPoint[] = input.specPoints.map((sp) => ({
    id: sp.id,
    code: sp.code,
    title: sp.title,
    covered: coveredIds.has(sp.id),
  }));
  const coveredCount = specPoints.filter((s) => s.covered).length;
  const style: 'ks3' | 'gcse' = input.examStage === 'foundational' ? 'ks3' : 'gcse';
  return {
    unitId: input.unitId,
    schemeId: input.schemeId,
    courseId: input.courseId,
    unitTitle: input.unitTitle,
    courseName: input.courseName,
    style,
    examBoard: style === 'gcse' ? 'OCR J277' : null,
    examProfileLabel: input.examProfileLabel,
    specPoints,
    coveredCount,
    uncoveredCount: specPoints.length - coveredCount,
    groupCourseId: input.groupCourseId,
    lessonTitles: input.lessonTitles,
    lessonObjectives: input.lessonObjectives,
  };
}

export interface BlueprintOpts {
  // 'to_date' (default): covered = what the class has been taught up to `today`. 'whole': include the
  // class's future-placed lessons too (assess against everything planned, not just delivered so far).
  window?: 'to_date' | 'whole';
}

/** Assemble the blueprint for (unit, class). Returns null only when the unit itself can't be resolved.
 *  A unit with zero covered spec points (brand-new class) still returns a blueprint (mostly uncovered);
 *  a course with no spec points at all returns a blueprint with an empty specPoints list (the prompt then
 *  falls back to the unit's lesson titles/objectives and every question is tagged with a null spec point). */
export async function blueprintForUnit(
  unitId: number,
  groupCourseId: number,
  today: Date,
  opts?: BlueprintOpts,
): Promise<AssessmentBlueprint | null> {
  const [unit, schemeId] = await Promise.all([getUnitForReview(unitId), schemeIdForUnit(unitId)]);
  if (!unit || schemeId == null) return null;

  const [specPoints, examProfile] = await Promise.all([
    listSpecPoints(unit.courseId),
    examProfileForCourse(unit.courseId, today, groupCourseId),
  ]);

  // The class's delivery across all its slots over a wide window; "covered" = the spec points of every
  // lesson it has been given (≤ today, unless window 'whole' also counts future placements).
  const window = opts?.window ?? 'to_date';
  const todayIso = today.toISOString().slice(0, 10);
  const fromDate = addDays(todayIso, -3 * 365);
  const toDate = window === 'whole' ? addDays(todayIso, 365) : todayIso;
  const schedule = await classSchedule(groupCourseId, fromDate, toDate);
  const planIds = [
    ...new Set(
      schedule
        .filter((e) => e.lessonPlanId != null && (window === 'whole' || e.date <= todayIso))
        .map((e) => e.lessonPlanId as number),
    ),
  ];
  const coveredIds = new Set<number>();
  for (const pid of planIds) {
    for (const id of await getPlanSpecPointIds(pid)) coveredIds.add(id);
  }

  return assembleBlueprint({
    unitId,
    schemeId,
    courseId: unit.courseId,
    unitTitle: unit.unitTitle,
    courseName: unit.courseName,
    specPoints: specPoints.map((sp) => ({ id: sp.id, code: sp.code, title: sp.title })),
    coveredSpecPointIds: coveredIds,
    examStage: examProfile.stage,
    examProfileLabel: examProfile.label,
    groupCourseId,
    lessonTitles: unit.lessons.map((l) => l.title).filter((t) => t.trim().length > 0),
    lessonObjectives: unit.lessons.map((l) => (l.objectives ?? '').trim()).filter((o) => o.length > 0),
  });
}
