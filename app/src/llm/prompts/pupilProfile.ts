// Phase 9.8 — write a pupil's "what works for me" digest from their feedback + marks history.
// Cohort-style, two lines, planning-useful. No name reaches the AI (the inputs are activity chips,
// ratings and percentages); it still goes through the wrapper.
import type { RedactableItem } from '../../services/redact';
import type { ProfileInputs } from '../../repos/pupilProfiles';

export const PUPIL_PROFILE_VERSION = 'pupil_profile@1';

export const PUPIL_PROFILE_SYSTEM =
  'You help a UK secondary SEND Computing teacher plan for ONE pupil. From the pupil\'s lesson ' +
  'feedback (activities they enjoyed/disliked, emoji ratings) and recent mark percentages, write a ' +
  'SHORT "what works for me" note — at most TWO sentences — that another teacher could act on: which ' +
  'activity types engage them, what to avoid, and (if the marks clearly support it) a gentle level ' +
  'suggestion (e.g. "ready to try challenge"). Be encouraging and specific; never name or label the ' +
  'pupil, never mention a diagnosis. Plain UK English.';

export function pupilProfileItems(inputs: ProfileInputs): RedactableItem[] {
  const list = (xs: Array<[string, number]>): string => (xs.length ? xs.map(([k, n]) => `${k} (×${n})`).join(', ') : 'none recorded');
  const avg = inputs.ratings.length ? (inputs.ratings.reduce((a, b) => a + b, 0) / inputs.ratings.length).toFixed(1) : 'n/a';
  return [
    {
      text:
        `ENJOYED activities: ${list(inputs.liked)}\n` +
        `DISLIKED activities: ${list(inputs.disliked)}\n` +
        `lesson ratings (1 sad – 4 happy): ${inputs.ratings.join(', ') || 'none'} (avg ${avg})\n` +
        `recent mark percentages (newest first): ${inputs.markPercents.join('%, ') || 'none'}${inputs.markPercents.length ? '%' : ''}`,
    },
  ];
}

export const PUPIL_PROFILE_INSTRUCTION = 'Write the two-sentence "what works for me" note now.';
