// The "what came before" context items for scheme-level AI work (author a scheme, convert a
// unit). Pure formatting over the repo's capped data; empty history injects nothing, so brand-new
// courses behave exactly as before. Travels via context[] like every input (redacted + audited).
import type { CurriculumHistory } from '../../repos/curriculumHistory';
import type { RedactableItem } from '../../services/redact';

export function curriculumHistoryItems(h: CurriculumHistory): RedactableItem[] {
  const items: RedactableItem[] = [];
  if (h.priorSchemes.length) {
    const lines = h.priorSchemes.map(
      (s) => `- ${s.title} (v${s.version}${s.active ? ', active' : ', draft/old'}): ${s.unitTitles.join(' · ') || '(no units)'}`,
    );
    items.push({
      text:
        'EXISTING SCHEMES FOR THIS COURSE — what is already planned or was taught from before. ' +
        'Build on this: sequence beyond it, recap where useful, do not redo whole units:\n' +
        lines.join('\n'),
    });
  }
  const withHistory = h.classCoverage.filter((c) => c.coveredCount > 0);
  if (withHistory.length) {
    const lines = withHistory.map(
      (c) =>
        `- ${c.groupName}${c.yearGroup ? ` (${c.yearGroup})` : ''}: ${c.coveredCount} lessons taught across their years ` +
        `(most recent: ${c.recentCovered.slice(0, 8).join(' · ')})`,
    );
    items.push({
      text:
        'CLASS HISTORY — what the classes taking this course have ALREADY covered (including in ' +
        'previous years, followed across their renames). Start from where they are, not from zero:\n' +
        lines.join('\n'),
    });
  }
  return items;
}
