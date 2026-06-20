// Versioned prompt for authoring a scheme of work from a teacher's brief.
import type { RedactableItem } from '../../services/redact';
import { PEDAGOGY_GUIDANCE } from './pedagogy';

export const AUTHOR_SCHEME_VERSION = 'author_scheme@5'; // @5: ground in the NCCE 12 principles of computing pedagogy. @4: cover every spec point (tag lessons with codes) + revision unit before the exam. @3: curriculum history

export const AUTHOR_SCHEME_SYSTEM =
  'You are an experienced UK secondary-school Computing teacher and curriculum designer. ' +
  'Design a coherent scheme of work as a sequence of units, each with an ordered list of lessons. ' +
  'Pitch it for the named course/key stage, build knowledge progressively across units, and keep ' +
  'lesson titles concrete and teachable. Aim for roughly 4–8 units with 4–8 lessons each unless the ' +
  'brief clearly implies otherwise. Where existing schemes or class history are provided, design the ' +
  'NEXT step of the curriculum: continue from what was covered, recap briefly where it helps, and do ' +
  'not repeat whole units already taught. ' +
  'COVERAGE: when a list of spec points is provided, the scheme MUST cover EVERY one of them across ' +
  'its lessons, and each lesson must list (in specPoints) the EXACT codes from that list it covers — ' +
  'use only codes that appear in the list, and make sure no spec point is left uncovered. When no ' +
  'spec points are provided, return specPoints: [] for every lesson. ' +
  'REVISION: when an exam date is given, finish with a dedicated revision unit (a few lessons ' +
  'revisiting the highest-weight / most-examined topics) and pace the scheme so that revision unit ' +
  'lands before the exam. Never reference individual pupils by name.' + PEDAGOGY_GUIDANCE;

/** The course's spec points the scheme must cover (idea 10 slice 2b). [] when none — a no-op. */
export function specPointsItems(points: Array<{ code: string; title: string }>): RedactableItem[] {
  if (!points.length) return [];
  const lines = points.map((p) => (p.code === p.title ? `• ${p.title}` : `• ${p.code}: ${p.title}`)).join('\n');
  return [
    {
      text:
        'SPEC POINTS THIS COURSE MUST COVER — every one must be covered by at least one lesson, and ' +
        `each lesson must tag the codes it covers (specPoints):\n${lines}`,
    },
  ];
}

export function authorSchemeInstruction(courseName: string, brief: string, examDate?: string | null): string {
  return [
    `Course: ${courseName}`,
    examDate ? `Exam date: ${examDate} — leave time for revision before it and finish with a revision unit.` : '',
    '',
    "Teacher's brief / aims:",
    brief.trim(),
    '',
    'Design the scheme of work: the units in teaching order, the ordered lessons within each unit, and the spec-point codes each lesson covers.',
  ]
    .filter((l) => l !== '')
    .join('\n');
}
