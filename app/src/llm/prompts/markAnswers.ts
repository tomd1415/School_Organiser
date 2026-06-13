// Phase 9.3 — mark a class's open answers to ONE question, anonymised. The answers go through the
// wrapper's context[] (names tokenised, safeguarding withheld). No pupil identity is in the batch:
// answers are slot letters; the server holds the slot→pupil map.
import type { RedactableItem } from '../../services/redact';

export const MARK_ANSWERS_VERSION = 'mark_answers@1';

export const MARK_ANSWERS_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher marking pupils\' written answers to ONE ' +
  'question, fairly and kindly. You are given the question, its mark points (with the marks available), ' +
  'and a set of anonymous answers labelled A, B, C… For EACH answer return: marksAwarded (0..total), a ' +
  'SHORT evidence quote copied VERBATIM from THAT answer (leave empty if 0 marks), your confidence, and ' +
  'one short kind feedback line for the pupil. Mark only what the pupil wrote; never invent evidence — ' +
  'every quote MUST be a substring of that answer. Be generous to SEND pupils where the idea is present ' +
  'even if the wording is rough. Plain UK English; never name or describe any pupil.';

export function markAnswersItems(args: {
  question: string;
  marksTotal: number;
  markPoints: Array<{ expected: string; marks: number; alternatives: string[] }>;
  slots: Array<{ slot: string; answer: string }>;
}): RedactableItem[] {
  const points = args.markPoints
    .map((p, i) => `  ${i + 1}. (${p.marks} mark${p.marks === 1 ? '' : 's'}) ${p.expected}${p.alternatives.length ? ` [also accept: ${p.alternatives.join(', ')}]` : ''}`)
    .join('\n');
  const answers = args.slots.map((s) => `${s.slot}. ${s.answer}`).join('\n');
  return [
    { text: `QUESTION (total ${args.marksTotal} marks): ${args.question}\nMARK POINTS:\n${points}` },
    { text: `ANSWERS TO MARK (anonymous):\n${answers}` },
  ];
}

export const MARK_ANSWERS_INSTRUCTION =
  'Mark every answer slot now. Return one result per slot with marksAwarded, a verbatim evidence quote, confidence, and a short feedback line.';
