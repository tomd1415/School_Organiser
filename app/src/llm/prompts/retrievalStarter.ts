// Phase 10.15 — retrieval-practice starter. Given the questions a class recently got wrong (cohort
// counts only — no pupil identity), write 3 quick recall questions to re-test the SAME ideas at the
// start of the next lesson. Inputs travel via context[] (redaction + withholding + audit) as always.
import type { RedactableItem } from '../../services/redact';
import type { MissQuestion } from '../../services/marking';
import { PEDAGOGY_GUIDANCE } from './pedagogy';

export const RETRIEVAL_STARTER_VERSION = 'retrieval_starter@2'; // @2: ground in the NCCE 12 principles of computing pedagogy

export const RETRIEVAL_STARTER_SYSTEM =
  'You write a short retrieval-practice starter for a UK secondary SEND Computing class. You are ' +
  'given the questions this class recently got wrong (with how many got each fully right / partly / ' +
  'not at all). Write EXACTLY 3 short, plain questions that re-test the SAME underlying ideas in a ' +
  'slightly different way — one idea per question, recall-friendly, concrete language, suitable to ' +
  'put on the board at the start of a lesson. For each, give a brief model answer so the teacher can ' +
  'mark instantly. Keep it kind and low-stakes; this is spaced retrieval, not a test.' + PEDAGOGY_GUIDANCE;

export function missesItem(misses: MissQuestion[]): RedactableItem {
  const lines = misses.map(
    (m) => `• "${m.question}" — of ${m.total}: ${m.full} fully right, ${m.partial} partly, ${m.zero} not at all`,
  );
  return { text: `Questions this class got wrong recently:\n${lines.join('\n')}` };
}

export const RETRIEVAL_STARTER_INSTRUCTION =
  'Write the 3-question retrieval starter now, re-testing the weakest of these ideas.';
