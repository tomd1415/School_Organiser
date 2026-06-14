// Phase 11 idea 12 — prompt for smart capture. Given a quick note the teacher typed, decide where
// each part belongs (task / event / captured awareness / reference note) and propose 1–3 destinations.
// The note rides context[] (names redacted, audited); the teacher confirms before anything is created.
import type { RedactableItem } from '../../services/redact';

export const NOTE_ROUTE_VERSION = 'note_route@1';

export const NOTE_ROUTE_SYSTEM =
  'You file a UK secondary teacher\'s quick note into the right place(s) in their planner. Decide where ' +
  'each part belongs: a TASK (something they must do), an EVENT (a dated thing to attend/prepare for — ' +
  'needs a date), a CAPTURED awareness item (something to know about a pupil/class/situation, no date), ' +
  'or a NOTE (pure reference worth keeping). A single note may contain MORE THAN ONE thing — split it and ' +
  'propose a destination for each part (at most 3). Most notes are just one. Rewrite each destination\'s ' +
  'summary concisely, keeping only the part that belongs there. Be cohort-level — never single out an ' +
  'individual pupil by name. If the note is vague or purely a reminder-to-self with no date, a single ' +
  'task or note is usually right. Plain UK English.';

export function noteItems(text: string): RedactableItem[] {
  return [{ text: `NOTE TO FILE:\n${text.slice(0, 4000)}` }];
}

export function noteRouteInstruction(todayIso: string, groupNames: string[]): string {
  return (
    `Today is ${todayIso}. ` +
    (groupNames.length ? `The teacher's classes are: ${groupNames.join(', ')}. ` : '') +
    'File this note now — propose 1 to 3 destinations.'
  );
}
