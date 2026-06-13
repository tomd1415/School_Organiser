// 8.7: summarise a class's worksheet answers + lesson feedback for the teacher and the
// adapt-next-lesson loop. Answers are sent ANONYMISED — grouped per question, never linked to a
// pupil — and still pass through the wrapper (a pupil may type a classmate's name in an answer,
// so roster redaction and safeguarding-withholding apply as always).
import type { RedactableItem } from '../../services/redact';

export const CLASS_WORK_VERSION = 'class_work@1';

export const CLASS_WORK_SYSTEM =
  'You are helping a UK secondary SEND Computing teacher review one class\'s lesson. You are given, ' +
  'for one worksheet: the pupils\' typed answers grouped BY QUESTION (anonymised — never linked to ' +
  'a named pupil), and the class\'s lesson feedback (emoji ratings and tapped activity chips). ' +
  'Write a SHORT teacher-facing markdown summary with these sections: ' +
  '"## What the class got" (questions most answered well), ' +
  '"## Where they struggled" (questions with wrong/blank/confused answers, and the specific ' +
  'misconception in plain words), ' +
  '"## How the lesson landed" (the rating picture and which activities they enjoyed/disliked), and ' +
  '"## For next lesson" (2–4 concrete, cohort-level adjustments). ' +
  'Cohort-level only — never name or describe an individual pupil, never quote an answer that ' +
  'identifies someone. Plain UK English, concise, classroom-practical.';

export function classWorkItems(args: {
  worksheetTitle: string;
  questions: Array<{ label: string; answers: string[] }>;
  ratings: number[];
  liked: string[];
  disliked: string[];
  comments: string[];
}): RedactableItem[] {
  const items: RedactableItem[] = [];
  items.push({ text: `WORKSHEET: ${args.worksheetTitle}` });
  for (const q of args.questions) {
    if (q.answers.length === 0) continue;
    items.push({
      text: `QUESTION: ${q.label || '(unlabelled)'}\nAnswers from the class (anonymised):\n` + q.answers.map((a, i) => `${String.fromCharCode(65 + (i % 26))}. ${a}`).join('\n'),
    });
  }
  const tally = (xs: string[]): string => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ×${n}`).join(', ') || 'none';
  };
  const ratingsLine =
    args.ratings.length > 0
      ? `ratings (1 sad – 4 happy): ${args.ratings.join(', ')} (avg ${(args.ratings.reduce((a, b) => a + b, 0) / args.ratings.length).toFixed(1)})`
      : 'no ratings given';
  items.push({
    text: `LESSON FEEDBACK\n${ratingsLine}\nenjoyed: ${tally(args.liked)}\ndisliked: ${tally(args.disliked)}${args.comments.length ? `\ncomments:\n- ${args.comments.join('\n- ')}` : ''}`,
  });
  return items;
}

export const CLASS_WORK_INSTRUCTION = 'Write the summary now, following the section headings exactly.';
