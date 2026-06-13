// Phase 10.17 — suggest a home for a captured note ("something I was told"). The body travels via
// context[] like every input (pupil names redacted before egress; the audit stores the redacted
// form). Safeguarding-tripping notes are screened out BEFORE this is ever called (the 10.5 model).
import type { RedactableItem } from '../../services/redact';

export const CAPTURED_CATEGORISE_VERSION = 'captured_categorise@1';

export const CAPTURED_CATEGORISE_SYSTEM =
  'You help a UK secondary SEND Computing teacher file a quick captured note — "something I was ' +
  'told but can\'t action yet". Suggest the single best category, whether it should resurface on a ' +
  'particular date, and which class (if any) it is clearly about. Be conservative: prefer null to a ' +
  'guess. Categories: pupil (about a specific pupil), logistics (room / equipment / timetable), ' +
  'admin (a deadline or paperwork), curriculum (teaching content), cpd (training / development), ' +
  'safeguarding (welfare — though these are normally screened out before they reach you), other.';

export function capturedItems(body: string): RedactableItem[] {
  return [{ text: body }];
}

export function capturedInstruction(todayIso: string, groupNames: string[]): string {
  return (
    `Today is ${todayIso}. ` +
    (groupNames.length ? `The teacher's classes are: ${groupNames.join(', ')}. ` : '') +
    'Categorise and file this captured note.'
  );
}
