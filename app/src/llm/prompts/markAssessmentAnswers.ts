// Phase 4 — mark an open (judgement-needed) part of a SUMMATIVE assessment against its mark scheme +
// misconceptions, anonymised. The answer text + the mark scheme go through the wrapper's context[] (names
// tokenised, safeguarding withheld); the pupil's answer is NEVER placed in `system`. Mirrors
// prompts/markAnswers.ts, sharpened with the part's misconceptions.
import type { RedactableItem } from '../../services/redact';

export const MARK_ASSESSMENT_ANSWERS_VERSION = 'mark_assessment_answers@1';

export const MARK_ASSESSMENT_ANSWERS_SYSTEM =
  'You are an experienced UK secondary Computing teacher marking pupils\' answers to ONE question of a ' +
  'SUMMATIVE end-of-unit assessment, fairly and to the standard of the exam board. You are given the ' +
  'question, its mark points (with the marks available), common misconceptions to watch for, and a set of ' +
  'anonymous answers labelled A, B, C… For EACH answer return: marksAwarded (0..total), a SHORT evidence ' +
  'quote copied VERBATIM from THAT answer (leave empty if 0 marks), your confidence, and one short kind ' +
  'feedback line for the pupil. ' +
  'If a mark point gives LEVELS-OF-RESPONSE guidance (bands like "Level 3 (5–6) … Level 2 (3–4) … Level 1 ' +
  '(1–2)"), mark it the OCR way: judge the answer AS A WHOLE, choose the band whose descriptor best fits, ' +
  'then a mark WITHIN that band, and name the level in the feedback. Otherwise award the mark points ' +
  'individually. Penalise nothing for a misconception unless it makes the answer wrong; use the ' +
  'misconceptions only to judge accuracy. Mark ONLY what the pupil wrote; never invent evidence — every ' +
  'quote MUST be a substring of that answer. Plain UK English; never name or describe any pupil.';

export function markAssessmentAnswersItems(args: {
  question: string;
  marksTotal: number;
  markPoints: Array<{ expected: string; marks: number; alternatives: string[] }>;
  misconceptions: Array<{ label: string; description: string }>;
  slots: Array<{ slot: string; answer: string }>;
}): RedactableItem[] {
  const points = args.markPoints
    .map((p, i) => `  ${i + 1}. (${p.marks} mark${p.marks === 1 ? '' : 's'}) ${p.expected}${p.alternatives.length ? ` [also accept: ${p.alternatives.join(', ')}]` : ''}`)
    .join('\n');
  const items: RedactableItem[] = [{ text: `QUESTION (total ${args.marksTotal} marks): ${args.question}\nMARK POINTS:\n${points}` }];
  if (args.misconceptions.length) {
    items.push({ text: `COMMON MISCONCEPTIONS (watch for these):\n${args.misconceptions.map((m) => `• ${m.label}${m.description ? ` — ${m.description}` : ''}`).join('\n')}` });
  }
  items.push({ text: `ANSWERS TO MARK (anonymous):\n${args.slots.map((s) => `${s.slot}. ${s.answer}`).join('\n')}` });
  return items;
}

export const MARK_ASSESSMENT_ANSWERS_INSTRUCTION =
  'Mark every answer slot now. Return one result per slot with marksAwarded, a verbatim evidence quote, confidence, and a short feedback line.';
