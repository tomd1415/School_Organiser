// Phase 12 B5 — how close a class is to its GCSE (OCR J277) exams, which sets how much OCR-style
// exam practice a generated worksheet should carry. No new schema: derived from courses.key_stage /
// qualification / exam_date (0002 / 0031) and the group's year_group (0002). The classifier is pure
// (testable); the DB read wraps it. KS3 / foundational classes get weighting 'none' so their sheets
// are unchanged — exam questions appear MORE the nearer a cohort is to its exams, never forced on the
// youngest pupils.
import { getCourseExamMeta } from '../repos/schemes';
import { getGroupYearGroup } from '../repos/adaptations';

export interface ExamProfile {
  stage: 'foundational' | 'building' | 'gcse' | 'exam-soon';
  weighting: 'none' | 'medium' | 'high';
  monthsToExam: number | null;
  label: string; // a short phrase for the AI prompt
}

export interface ExamInputs {
  keyStage?: string | null;
  qualification?: string | null;
  examDate?: string | null; // 'YYYY-MM-DD'
  yearGroup?: string | null;
  today: Date;
}

const FINAL_YEAR = /\bY(?:EAR\s*)?1[1-3]\b|POST.?16/i; // Y11–Y13 / Post-16 — the exam year(s)
const EARLY_EXAM_YEAR = /\bY(?:EAR\s*)?10\b/i; // Y10 — GCSE content begun, exams ~2 years out
const EXAM_QUAL = /gcse|igcse|btec|nationals|a.?level|vocational/i;

function monthsBetween(from: Date, toIso: string): number | null {
  const to = new Date(`${toIso}T00:00:00Z`);
  if (Number.isNaN(to.getTime())) return null;
  const ms = to.getTime() - from.getTime();
  return ms > 0 ? Math.round(ms / (1000 * 60 * 60 * 24 * 30.4)) : 0;
}

/** Classify a class's exam proximity from whatever signals exist. Pure → fully unit-testable. */
export function classifyExam(i: ExamInputs): ExamProfile {
  const ks = (i.keyStage ?? '').toUpperCase();
  const yr = i.yearGroup ?? '';
  const finalYear = FINAL_YEAR.test(yr);
  const isExamCourse =
    EXAM_QUAL.test(i.qualification ?? '') || ks === 'KS4' || ks === 'KS5' || finalYear || EARLY_EXAM_YEAR.test(yr) || i.examDate != null;
  const monthsToExam = i.examDate ? monthsBetween(i.today, i.examDate) : null;

  if (!isExamCourse) {
    return { stage: 'foundational', weighting: 'none', monthsToExam: null, label: 'a Key Stage 3 / foundational class' };
  }
  if (monthsToExam != null && monthsToExam <= 8) {
    return { stage: 'exam-soon', weighting: 'high', monthsToExam, label: `a GCSE class whose OCR exams are about ${monthsToExam} month(s) away` };
  }
  if (finalYear || (monthsToExam != null && monthsToExam <= 14)) {
    return { stage: 'gcse', weighting: 'high', monthsToExam, label: 'a GCSE class (OCR J277) working towards its exams' };
  }
  return { stage: 'building', weighting: 'medium', monthsToExam, label: 'a Key Stage 4 class building towards GCSE' };
}

/** The exam profile for a course (optionally sharpened by a class's year group). Best-effort. */
export async function examProfileForCourse(courseId: number, today: Date, groupCourseId?: number): Promise<ExamProfile> {
  const meta = await getCourseExamMeta(courseId);
  const yearGroup = groupCourseId != null ? await getGroupYearGroup(groupCourseId).catch(() => null) : null;
  return classifyExam({ keyStage: meta?.keyStage, qualification: meta?.qualification, examDate: meta?.examDate, yearGroup, today });
}
