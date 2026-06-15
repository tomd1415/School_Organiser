// Phase 9.1 — derive a structured mark scheme from a worksheet + its answers doc. All inputs go
// through the wrapper's context[] (redaction/withholding apply); the worksheet/answers are the
// teacher's own content, but a pupil name could appear in an example, so the boundary still holds.
import type { RedactableItem } from '../../services/redact';

export const MARK_SCHEME_VERSION = 'mark_scheme@2';

export const MARK_SCHEME_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher writing a MARK SCHEME for a worksheet ' +
  'so it can be auto-marked. You are given the worksheet, any teacher answers, and the exact list of ' +
  'answerable FIELDS (each with a stable key and its question). For EACH field, produce one or more ' +
  'mark points using the right kind: "exact" (one short correct answer), "numeric" (a number; put ' +
  'word forms like "four" in alternatives), "choice" (multiple-choice / true-false — the pupil picks ' +
  'one option), "keyword" (award a mark for each key idea — one point per keyword, with synonyms in ' +
  'alternatives), "tick" (a success-checklist item), or "open" (extended/explain answers needing ' +
  'human-style judgement — give marking guidance in expected). A field tagged "[choice: a | b | c]" ' +
  'lists its exact options: use kind "choice" and set "expected" to the ONE correct option copied ' +
  'verbatim from that list (use the teacher answers to decide which). Prefer objective kinds where ' +
  'you safely can (they mark instantly and free); use "open" only when the answer genuinely needs ' +
  'judgement. Keep "expected" concise. Use ONLY the field keys given. Plain UK English; never ' +
  'reference an individual pupil.';

export function markSchemeItems(args: {
  worksheetTitle: string;
  worksheetMarkdown: string;
  answersMarkdown: string | null;
  fields: Array<{ key: string; label: string; kindHint: 'text' | 'check' | 'choice'; options?: string[] }>;
}): RedactableItem[] {
  const fieldList = args.fields
    .map((f) => {
      const tag = f.kindHint === 'check' ? 'checkbox' : f.kindHint === 'choice' ? `choice: ${(f.options ?? []).join(' | ')}` : 'written';
      return `FIELD ${f.key} [${tag}]: ${f.label || '(no label)'}`;
    })
    .join('\n');
  const items: RedactableItem[] = [
    { text: `WORKSHEET: ${args.worksheetTitle}\n\n${args.worksheetMarkdown}` },
    { text: `FIELDS (use these exact keys):\n${fieldList}` },
  ];
  if (args.answersMarkdown && args.answersMarkdown.trim()) {
    items.push({ text: `TEACHER ANSWERS (use these to set expected answers):\n${args.answersMarkdown}` });
  }
  return items;
}

export const MARK_SCHEME_INSTRUCTION =
  'Produce the mark scheme now: a points array covering the answerable fields, each point with fieldKey, kind, expected, alternatives, marks, required.';
