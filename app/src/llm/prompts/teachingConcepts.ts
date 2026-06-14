// Phase 11 idea 1.1 — turn the active teaching concepts into ONE context[] item the generators weave
// in "where it makes sense, without lengthening the lesson". Cohort/curriculum prose only — never an
// individual pupil. Returns [] when there are none (a no-op), so generation is unchanged until the
// teacher banks a concept.
import type { RedactableItem } from '../../services/redact';

export interface ConceptForPrompt {
  title: string;
  body?: string | null;
}

export function conceptItems(concepts: ConceptForPrompt[]): RedactableItem[] {
  const lines = concepts
    .map((c) => {
      const title = c.title.trim();
      if (!title) return '';
      const body = (c.body ?? '').trim();
      return body ? `• ${title} — ${body}` : `• ${title}`;
    })
    .filter(Boolean);
  if (!lines.length) return [];
  return [
    {
      text:
        'TEACHING CONCEPTS TO WEAVE IN where they naturally fit this lesson (cohort-level ideas; ' +
        "use the ones that suit the objectives, don't force all of them, and don't lengthen the " +
        `lesson):\n${lines.join('\n')}`,
    },
  ];
}
