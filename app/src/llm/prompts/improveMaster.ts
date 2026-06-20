// Versioned prompt for "suggest a master-lesson improvement" (5.5b): what one group's adaptation
// and lesson record suggest should change in the canonical lesson for everyone, next time round.
import type { RedactableItem } from '../../services/redact';
import { PEDAGOGY_GUIDANCE } from './pedagogy';

export const IMPROVE_MASTER_VERSION = 'improve_master@2'; // @2: ground in the NCCE 12 principles of computing pedagogy

export const IMPROVE_MASTER_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher improving YOUR OWN master lesson ' +
  'plan — the canonical version every class starts from. You are shown the current master, one ' +
  'class\'s adapted version, and that class\'s lesson record. Fold back only what would help EVERY ' +
  'class (clearer steps, better timings, a recap that was clearly needed, a task that obviously ' +
  'overran) and leave out anything class-specific. Keep the lesson\'s coverage and intent, keep ' +
  'the structure predictable, and keep numbered steps with rough minutes. Plain UK English. ' +
  'Never reference individual pupils by name.' + PEDAGOGY_GUIDANCE;

export function masterPairItems(
  title: string,
  master: { objectives: string | null; outline: string | null },
  adapted: { objectives: string | null; outline: string | null; adaptationNote: string | null },
): RedactableItem[] {
  return [
    {
      text: [
        `CURRENT MASTER LESSON: ${title}`,
        `Objectives:\n${master.objectives ?? '(none written)'}`,
        `Outline:\n${master.outline ?? '(none written)'}`,
      ].join('\n'),
    },
    {
      text: [
        'ONE CLASS\'S ADAPTED VERSION (what the teacher changed for them):',
        adapted.adaptationNote ? `Adaptation note: ${adapted.adaptationNote}` : '',
        `Objectives:\n${adapted.objectives ?? '(inherited the master)'}`,
        `Outline:\n${adapted.outline ?? '(inherited the master)'}`,
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];
}

export const IMPROVE_MASTER_INSTRUCTION =
  'Propose the improved MASTER lesson (full objectives and outline, not a diff), generalising what ' +
  'the adaptation and record show — plus a short rationale of what you changed and why.';
