// Phase 11 Wave 5 (idea 8, lean cut) — versioned prompt for the advisory lesson reviewer: a second
// opinion on a NOT-YET-TAUGHT master lesson, judged against the spec and any official documents. It
// proposes an improved master (full objectives + outline, not a diff) the teacher can Apply, plus a
// short verdict and at most three findings. Cohort-level only — it never references an individual pupil.
import type { RedactableItem } from '../../services/redact';

export const LESSON_REVIEW_VERSION = 'review_lesson@1';

export const LESSON_REVIEW_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher giving a colleague a frank second ' +
  'opinion on a lesson plan they have NOT yet taught. Judge it against the course specification and ' +
  'any official documents provided (examiners’ reports, past papers), and against good SEND ' +
  'practice: clear objectives, a sensible sequence with realistic timings, accessible language, ' +
  'retrieval/recap where it helps, and that it actually delivers the spec points it claims. Be ' +
  'honest but proportionate — most sound lessons need only small tweaks, so reserve "rework" for a ' +
  'real gap. Return AT MOST THREE findings, the most important first; if it is solid, say so with an ' +
  'empty findings list and verdict "keep". When you do suggest changes, give the improved MASTER ' +
  'lesson in full (objectives and outline, not a diff), keeping its coverage and intent, a ' +
  'predictable structure, and numbered steps with rough minutes. Plain UK English. ' +
  'Cohort-level only — never reference an individual pupil.';

// The lesson under review + the spec points it is meant to deliver, as context[] items (so they ride
// the wrapper's withhold → redact → egress-assert → audit path like every other input).
export function reviewLessonItems(
  courseName: string,
  unitTitle: string,
  plan: { title: string; objectives: string | null; outline: string | null },
  specPointLabels: string[],
): RedactableItem[] {
  const items: RedactableItem[] = [
    {
      text: [
        `LESSON UNDER REVIEW — course: ${courseName}; unit: ${unitTitle}`,
        `Title: ${plan.title}`,
        `Objectives:\n${plan.objectives ?? '(none written)'}`,
        `Outline:\n${plan.outline ?? '(none written)'}`,
      ].join('\n'),
    },
  ];
  if (specPointLabels.length) {
    items.push({
      text: `SPEC POINTS THIS LESSON IS MAPPED TO COVER — check the lesson genuinely delivers each:\n- ${specPointLabels.join('\n- ')}`,
    });
  }
  return items;
}

export const LESSON_REVIEW_INSTRUCTION =
  'Review this lesson. Give a verdict (keep / tweak / rework), at most three findings (worst first), ' +
  'a short rationale, and the improved master objectives and outline in full.';
