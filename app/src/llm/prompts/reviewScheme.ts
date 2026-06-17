// Phase 12 E2 — versioned prompt for the scheme-level (sequence) review: a frank second opinion on a
// whole unit's lesson SEQUENCE, judged against the spec/official documents and good SEND progression.
// It critiques the unit as a whole (order, progression, balance, coverage gaps) and never rewrites an
// individual lesson — the per-lesson reviewer does that. Inputs ride context[] like everything else.
import type { RedactableItem } from '../../services/redact';

export const REVIEW_SCHEME_VERSION = 'review_scheme@1';

export const REVIEW_SCHEME_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher giving a colleague a second opinion on a ' +
  'whole UNIT as a SEQUENCE of lessons (not lesson by lesson). Judge the unit against the course ' +
  'specification and any official documents, and against good SEND progression: a sensible order, each ' +
  'lesson building on the last, retrieval/recap where it helps, no big conceptual jumps, balanced ' +
  'coverage of the spec the unit claims, and no obvious gaps or duplication. Be honest but proportionate ' +
  '— most sound units need only a tweak, so reserve "gaps" for a real coverage or progression problem. ' +
  'Return AT MOST FIVE findings, most important first; if the sequence is sound, say so with an empty ' +
  'findings list and verdict "coherent". Each finding names ONE sequence-level issue and a concrete fix ' +
  '(reorder, add/merge a lesson, add a recap). Do NOT rewrite individual lessons. Plain UK English; ' +
  'cohort-level only — never reference an individual pupil.';

export function reviewSchemeItems(
  courseName: string,
  unitTitle: string,
  lessons: Array<{ title: string; objectives: string | null }>,
  specPointLabels: string[],
): RedactableItem[] {
  const seq = lessons
    .map((l, i) => `${i + 1}. ${l.title}${l.objectives ? ` — ${l.objectives.replace(/\s+/g, ' ').slice(0, 160)}` : ''}`)
    .join('\n');
  const items: RedactableItem[] = [
    { text: `UNIT UNDER REVIEW — course: ${courseName}; unit: ${unitTitle}\nLESSON SEQUENCE (in order):\n${seq}` },
  ];
  if (specPointLabels.length) {
    items.push({ text: `SPEC POINTS THIS UNIT IS MEANT TO COVER — check the sequence delivers them, in a sensible order:\n- ${specPointLabels.join('\n- ')}` });
  }
  return items;
}

export const REVIEW_SCHEME_INSTRUCTION =
  'Review this unit as a sequence. Give a verdict (coherent / tweak / gaps), at most five sequence-level ' +
  'findings (worst first) each with a concrete fix, and a short overall rationale.';
