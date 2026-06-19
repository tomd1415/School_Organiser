// Wave 6.1 — the cover-pack prompt. Cohort-level only (never a pupil); the lesson detail rides the
// wrapper's context[] so it inherits redaction/withholding/audit. Output is one self-contained
// Markdown document the existing resource store holds (schema reused: generateResourceSchema).
import type { RedactableItem } from '../../services/redact';

export const COVER_PACK_VERSION = 'cover_pack@1';

export const COVER_PACK_SYSTEM = `You write COVER WORK for a class whose usual teacher is unexpectedly absent.
The work MUST:
- be doable by pupils working independently, supervised by a NON-SPECIALIST cover teacher;
- consolidate or practise the lesson's objectives (no brand-new hard content that needs teaching);
- be a single self-contained Markdown document with, in order: a short note to the cover supervisor
  (what to do, rough timings, what "done" looks like); the pupil task(s) with clear instructions; and a
  separate "## Answers" section for the supervisor;
- stay low-prep and printable (no specialist equipment or logins unless truly essential).
Cohort-level only — never name, describe, or single out an individual pupil.`;

export const COVER_PACK_INSTRUCTION = 'Generate the cover pack now.';

export function coverPackItem(s: {
  className: string;
  yearGroup: string | null;
  planTitle: string | null;
  objectives: string | null;
  outline: string | null;
}): RedactableItem[] {
  const lines = [
    `Class: ${s.className}${s.yearGroup ? ` (${s.yearGroup})` : ''}`,
    s.planTitle ? `Lesson: ${s.planTitle}` : '',
    s.objectives ? `Objectives:\n${s.objectives}` : '',
    s.outline ? `Planned outline:\n${s.outline}` : '',
  ].filter(Boolean);
  // Only worth sending if there's something to base the cover work on (objectives or outline).
  if (!s.objectives && !s.outline) return [];
  return [{ text: `Cover work needed for this lesson —\n${lines.join('\n')}` }];
}
