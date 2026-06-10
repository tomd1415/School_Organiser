import type { RedactableItem } from '../../services/redact';

// Render a course's teaching-context as a LEADING context[] item (0 or 1). It goes in context[]
// — never the system string — so it passes through the wrapper's withhold → redact → egress-assert
// → audit path like any other context, and is captured (redacted) in the ai_calls row.
export function teachingContextItems(text: string | null | undefined): RedactableItem[] {
  const t = (text ?? '').trim();
  return t ? [{ text: `TEACHING CONTEXT — apply this to everything you produce for this course:\n${t}` }] : [];
}
