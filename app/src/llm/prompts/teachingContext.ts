import type { RedactableItem } from '../../services/redact';

// Render a course's teaching-context as a LEADING context[] item (0 or 1). It goes in context[]
// — never the system string — so it passes through the wrapper's withhold → redact → egress-assert
// → audit path like any other context, and is captured (redacted) in the ai_calls row.
export function teachingContextItems(text: string | null | undefined): RedactableItem[] {
  const t = (text ?? '').trim();
  return t ? [{ text: `TEACHING CONTEXT — apply this to everything you produce for this course:\n${t}` }] : [];
}

// 5.9: per-class context ADDS to the course default (never replaces it) — the course text carries
// the cohort essentials; the group text carries what is different about THIS class. Cohort-level
// prose only; never name or describe an individual pupil.
export function groupContextItems(courseText: string | null | undefined, groupText: string | null | undefined): RedactableItem[] {
  const items = teachingContextItems(courseText);
  const g = (groupText ?? '').trim();
  if (g) items.push({ text: `FOR THIS CLASS SPECIFICALLY — this overrides the general context where they differ:\n${g}` });
  return items;
}
