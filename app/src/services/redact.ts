// The pupil-data boundary, as pure functions so it can be proven by tests. Two guarantees
// (SECURITY_AND_PRIVACY §"The pupil-name rule" / §"Safeguarding content is withheld"):
//   1. Safeguarding-flagged content is WITHHELD entirely — never sent, not merely redacted.
//   2. Every roster name is replaced by its stable ai_token before anything leaves.
import type { RosterEntry } from '../repos/pupils';

export interface RedactableItem {
  text: string;
  safeguarding?: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Drop every safeguarding-flagged item entirely. A flagged item must never reach a provider. */
export function withholdSafeguarding<T extends { safeguarding?: boolean }>(items: T[]): T[] {
  return items.filter((i) => !i.safeguarding);
}

/** Replace each roster display_name with its ai_token. Longest name first ("Samantha" before
 *  "Sam"); case-insensitive and word-bounded so "Samuel" is untouched by a "Sam" entry. */
export function redactNames(text: string, roster: RosterEntry[]): string {
  let out = text;
  for (const p of orderedRoster(roster)) {
    const name = p.displayName.trim();
    if (!name) continue;
    out = out.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi'), p.aiToken);
  }
  return out;
}

/** Re-expand tokens back to names — FOR DISPLAY ONLY, after a call returns. */
export function expandTokens(text: string, roster: RosterEntry[]): string {
  let out = text;
  for (const p of roster) out = out.split(p.aiToken).join(p.displayName);
  return out;
}

/** The egress assertion: does any roster name still appear? The wrapper refuses to send if so. */
export function containsRosterName(text: string, roster: RosterEntry[]): boolean {
  return roster.some((p) => {
    const name = p.displayName.trim();
    return name.length > 0 && new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(text);
  });
}

function orderedRoster(roster: RosterEntry[]): RosterEntry[] {
  return [...roster].sort((a, b) => b.displayName.trim().length - a.displayName.trim().length);
}
