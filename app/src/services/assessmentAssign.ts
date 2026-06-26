// Phase 2 — assign a READY assessment to eligible classes with an availability window + results mode.
// Eligible classes = the course's timetabled classes (deduped by group_course); the paper is assignable to
// ANY of them, not just the class it was generated from. Window validation is a pure helper (unit-tested).
// No AI, no pupil identity — assignment is class-level config only. Thin wrappers over the Phase-0 repo.
import { getAssessment } from '../repos/assessments';
import { assignToClass, listAssignmentsForAssessment, unassign, type AssignmentRow } from '../repos/assessmentAttempts';
import { listSlotsForCourse } from '../repos/delivery';

export interface EligibleClass {
  groupCourseId: number;
  groupName: string | null;
  periodLabel?: string | null;
  assigned: boolean;
  window?: { from: string | null; until: string | null };
  resultsMode?: 'instant' | 'on_release';
  releasedAt?: string | null;
}

export interface WindowResult {
  ok: boolean;
  from: string | null;
  until: string | null;
  error?: string;
}

/** Validate an open/close window. Both optional (null = available immediately / no close). `until` must be
 *  strictly after `from`. Pure → unit-tested. Accepts datetime-local or ISO strings; normalises to ISO. */
export function validateWindow(from?: string | null, until?: string | null): WindowResult {
  const parse = (s?: string | null): { ok: boolean; iso: string | null } => {
    if (s == null || s.trim() === '') return { ok: true, iso: null };
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return { ok: false, iso: null };
    return { ok: true, iso: d.toISOString() };
  };
  const f = parse(from);
  if (!f.ok) return { ok: false, from: null, until: null, error: 'The open date/time isn’t valid.' };
  const u = parse(until);
  if (!u.ok) return { ok: false, from: null, until: null, error: 'The close date/time isn’t valid.' };
  if (f.iso && u.iso && new Date(u.iso).getTime() <= new Date(f.iso).getTime()) {
    return { ok: false, from: f.iso, until: u.iso, error: 'The close time must be after the open time.' };
  }
  return { ok: true, from: f.iso, until: u.iso };
}

/** The course's classes (deduped by group_course), each flagged assigned + carrying its window/mode. Any
 *  class assigned but no longer timetabled is still listed (so the teacher can see/unassign it). */
export async function eligibleClassesFor(assessmentId: number): Promise<EligibleClass[]> {
  const a = await getAssessment(assessmentId);
  if (!a) return [];
  const [slots, assignments] = await Promise.all([listSlotsForCourse(a.courseId), listAssignmentsForAssessment(assessmentId)]);
  const byGc = new Map<number, AssignmentRow>(assignments.map((x) => [x.groupCourseId, x]));
  const seen = new Set<number>();
  const out: EligibleClass[] = [];
  for (const s of slots) {
    if (seen.has(s.groupCourseId)) continue;
    seen.add(s.groupCourseId);
    const asg = byGc.get(s.groupCourseId);
    out.push({
      groupCourseId: s.groupCourseId,
      groupName: s.groupName,
      periodLabel: s.periodLabel,
      assigned: !!asg,
      window: asg ? { from: asg.availableFrom, until: asg.availableUntil } : undefined,
      resultsMode: asg?.resultsMode,
      releasedAt: asg?.releasedAt ?? null,
    });
  }
  for (const asg of assignments) {
    if (seen.has(asg.groupCourseId)) continue;
    seen.add(asg.groupCourseId);
    out.push({
      groupCourseId: asg.groupCourseId,
      groupName: null,
      assigned: true,
      window: { from: asg.availableFrom, until: asg.availableUntil },
      resultsMode: asg.resultsMode,
      releasedAt: asg.releasedAt,
    });
  }
  return out;
}

export interface AssignResult {
  ok: boolean;
  message: string;
}

/** Assign (or re-assign/edit the window of) a class. Refuses a non-ready paper and a class that doesn't
 *  take this course. Idempotent (repo upsert on the (assessment, class) unique key). */
export async function assign(
  assessmentId: number,
  groupCourseId: number,
  opts: { availableFrom?: string | null; availableUntil?: string | null; resultsMode?: 'instant' | 'on_release' },
): Promise<AssignResult> {
  const a = await getAssessment(assessmentId);
  if (!a) return { ok: false, message: 'No such assessment.' };
  if (a.status !== 'ready') return { ok: false, message: 'Only a ready assessment can be assigned — Mark it ready first.' };
  // The class must actually take this course (an already-assigned class survives even if the timetable
  // later changed — checked against the union so an edit of such a class isn't blocked).
  const slots = await listSlotsForCourse(a.courseId);
  const assigned = await listAssignmentsForAssessment(assessmentId);
  const isEligible = slots.some((s) => s.groupCourseId === groupCourseId) || assigned.some((x) => x.groupCourseId === groupCourseId);
  if (!isEligible) return { ok: false, message: 'That class doesn’t take this course.' };
  const w = validateWindow(opts.availableFrom, opts.availableUntil);
  if (!w.ok) return { ok: false, message: w.error ?? 'The availability window isn’t valid.' };
  await assignToClass(assessmentId, groupCourseId, { availableFrom: w.from, availableUntil: w.until, resultsMode: opts.resultsMode ?? 'on_release' });
  return { ok: true, message: 'Assigned.' };
}

export async function unassignClass(assessmentId: number, groupCourseId: number): Promise<AssignResult> {
  await unassign(assessmentId, groupCourseId);
  return { ok: true, message: 'Unassigned.' };
}
