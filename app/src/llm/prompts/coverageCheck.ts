// Phase 11 idea 10 slice 2 — prompt for the coverage gap-filler. Given the spec points NOT yet covered
// and the lessons already in the scheme (each a ref + objectives), suggest, per point, the existing
// lesson that best covers it (or NEW). Cohort/curriculum prose only; rides context[] (redacted/audited).
import type { RedactableItem } from '../../services/redact';

export const COVERAGE_CHECK_VERSION = 'coverage_check@1';

export const COVERAGE_CHECK_SYSTEM =
  'You help a UK secondary teacher close gaps in a scheme of work. You are given spec points that are ' +
  'NOT yet covered, and the lessons that already exist in the scheme (each with a short ref and its ' +
  'objectives). For EACH uncovered point, name the existing lesson (by its ref) that most naturally ' +
  'covers it — prefer a reasonable existing fit. Only answer "NEW" when no existing lesson is a sensible ' +
  'home and a new lesson is genuinely needed. Keep each reason to one short line. Never name an ' +
  'individual pupil.';

export function coverageItems(args: {
  uncovered: Array<{ code: string; title: string }>;
  lessons: Array<{ ref: string; title: string; objectives: string | null }>;
}): RedactableItem[] {
  const points = args.uncovered.map((p) => `${p.code}: ${p.title}`).join('\n');
  const lessons = args.lessons.map((l) => `${l.ref} — ${l.title}${l.objectives ? `: ${l.objectives.slice(0, 300)}` : ''}`).join('\n');
  return [
    { text: `UNCOVERED SPEC POINTS:\n${points}` },
    { text: `EXISTING LESSONS IN THE SCHEME:\n${lessons || '(none yet — everything will need a new lesson)'}` },
  ];
}

export const COVERAGE_CHECK_INSTRUCTION = 'For each uncovered point, give the best existing lesson ref, or NEW.';
