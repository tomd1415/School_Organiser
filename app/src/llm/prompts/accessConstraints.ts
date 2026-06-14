// Phase 11 idea 7 — turn a class's guided-access answers into ONE deterministic, cohort-level
// constraint item the class-scoped generators (adapt_lesson / adapt_resources) honour. No AI derives
// these — they're a fixed mapping from the questionnaire. Cohort-level only (never an individual
// pupil); rides context[] so redaction/withholding/audit apply. Returns [] when nothing is set.
import type { RedactableItem } from '../../services/redact';

export interface GuidedAccess {
  viFont?: number; // minimum font size in pt (derived from "pupils with a visual impairment")
  shortAttention?: boolean;
  readingAge?: string;
  eal?: boolean;
  dyslexiaFriendly?: boolean;
  lowTyping?: boolean;
}

/** Deterministic answer → constraint-line mapping. Order is fixed so the prompt is stable. */
export function accessConstraintLines(a: GuidedAccess | null | undefined): string[] {
  if (!a) return [];
  const lines: string[] = [];
  if (typeof a.viFont === 'number' && a.viFont > 0) lines.push(`use a minimum font size of ${Math.round(a.viFont)}pt in any resource or slide`);
  if (a.shortAttention) lines.push('this class has very short attention spans — keep activities short and chunked (~10 minutes each) with a clear change of task, and build in a movement break');
  if (a.readingAge && a.readingAge.trim()) lines.push(`pitch reading at roughly reading age ${a.readingAge.trim()} — short sentences, common words, and define any new term`);
  if (a.eal) lines.push('EAL learners are present — avoid idioms, define key vocabulary, and support text with visuals');
  if (a.dyslexiaFriendly) lines.push('use a dyslexia-friendly layout — sans-serif font, left-aligned, generous line spacing, and avoid dense blocks of text');
  if (a.lowTyping) lines.push('limited keyboard fluency — prefer click / drag / tick / multiple-choice responses over long typing');
  return lines;
}

export function accessConstraintItems(a: GuidedAccess | null | undefined): RedactableItem[] {
  const lines = accessConstraintLines(a);
  if (!lines.length) return [];
  return [
    {
      text: `CLASS ACCESS REQUIREMENTS — apply to every resource and activity for this class (cohort-level):\n- ${lines.join('\n- ')}`,
    },
  ];
}
