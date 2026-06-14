// Phase 11 — class-intake prompt. The teacher pastes a free-text description of a NEW class (their
// approach, what they've covered, ability, needs); Opus turns it into the structured per-class fields.
// Free text travels via context[] (names redacted, audited); outputs must be cohort-level.
import type { RedactableItem } from '../../services/redact';

export const CLASS_INTAKE_VERSION = 'class_intake@1';

export const CLASS_INTAKE_SYSTEM =
  'You help a UK secondary SEND Computing teacher set up a NEW class from a free-text description they ' +
  'paste in (the class\'s approach, what they have covered, ability, needs, behaviour). From it produce: ' +
  '(1) a cohort-level TEACHING CONTEXT — concise prose another teacher could plan from (how to pitch, ' +
  'support, pace and run lessons for this class); (2) a short COVERED-SO-FAR summary of the topics ' +
  'already taught (empty string if none are mentioned); (3) the ability midpoint if stated or clearly ' +
  'implied; (4) access needs (minimum font size, very short attention, target reading age, EAL, ' +
  'dyslexia-friendly, limited typing) ONLY where the description indicates them. Describe the class as a ' +
  'WHOLE — never single out or name an individual pupil. If the description does not say something, ' +
  'leave it null / false / empty — do NOT invent. Plain UK English.';

export function classIntakeItems(text: string): RedactableItem[] {
  return [{ text: `CLASS DESCRIPTION (set-up notes from the teacher):\n${text.slice(0, 6000)}` }];
}

export const CLASS_INTAKE_INSTRUCTION = 'Produce the teaching context, covered-so-far summary, ability midpoint and access needs now.';
