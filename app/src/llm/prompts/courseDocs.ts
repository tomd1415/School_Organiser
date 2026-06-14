// Phase 11 idea 9 — feed uploaded official course documents (spec / examiners' report / past paper)
// into authoring as context[] items. Each doc is capped (a full spec is huge) so the prompt stays
// affordable; reference/curriculum text only.
import type { RedactableItem } from '../../services/redact';

const ROLE_LABEL: Record<string, string> = {
  spec: 'SPECIFICATION',
  examiners_report: "EXAMINERS' REPORT",
  past_paper: 'PAST PAPER',
  reference: 'REFERENCE DOCUMENT',
};

export function courseDocItems(docs: Array<{ role: string; title: string; content: string }>, capPerDoc = 6000): RedactableItem[] {
  return docs
    .filter((d) => d.content && d.content.trim())
    .map((d) => ({
      text: `OFFICIAL ${ROLE_LABEL[d.role] ?? 'DOCUMENT'} — ${d.title} (authoritative reference; align the scheme/lesson to it):\n${d.content.slice(0, capPerDoc)}`,
    }));
}
