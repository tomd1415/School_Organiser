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

// Unicode-aware word boundary. JS `\b` only treats ASCII [A-Za-z0-9_] as word chars, so a name
// whose first or last character is accented (José, Zoë, André) has NO `\b` at that edge — the
// name would slip past both redaction AND the egress assert. These lookarounds count any Unicode
// letter/number/underscore as a word char, so accented edges are bounded correctly while
// "Samuel" is still NOT matched by a "Sam" entry (the following 'u' is a letter).
const WORD = '[\\p{L}\\p{N}_]';
function nameRegExp(name: string, flags: string): RegExp {
  // Each whitespace run in the name matches ANY whitespace run in the text (\s also covers the
  // non-breaking space U+00A0, tabs, and double spaces — all routine in pasted email / MIS-export /
  // pupil-typed text). A literal single space would miss those, letting a multi-word name slip past
  // BOTH redaction and the egress assert. Tokens are escaped; the separators become \s+.
  const pattern = name.split(/\s+/).map(escapeRegExp).join('\\s+');
  return new RegExp(`(?<!${WORD})${pattern}(?!${WORD})`, flags);
}

/** Drop every safeguarding-flagged item entirely. A flagged item must never reach a provider. */
export function withholdSafeguarding<T extends { safeguarding?: boolean }>(items: T[]): T[] {
  return items.filter((i) => !i.safeguarding);
}

/** Replace each roster display_name with its ai_token. Longest name first ("Samantha" before
 *  "Sam"); case-insensitive and word-bounded so "Samuel" is untouched by a "Sam" entry.
 *  Both text and names are NFC-normalised first: decomposed input (NFD — routine from macOS /
 *  PDF / MIS-export paste, e.g. "José" as J o s e + combining ´) would otherwise NOT match an
 *  NFC-stored name and slip past BOTH redaction and the egress assert. */
export function redactNames(text: string, roster: RosterEntry[]): string {
  let out = text.normalize('NFC');
  for (const p of orderedRoster(roster)) {
    const name = p.displayName.normalize('NFC').trim();
    if (!name) continue;
    out = out.replace(nameRegExp(name, 'giu'), p.aiToken);
  }
  return out;
}

/** Re-expand tokens back to names — FOR DISPLAY ONLY, after a call returns. Longest token first so a
 *  shorter token can't corrupt a longer one (PUPIL_1 is a prefix of PUPIL_10 — without this, a roster
 *  of 10+ pupils renders "PUPIL_10" as <name-of-1> + "0"). */
export function expandTokens(text: string, roster: RosterEntry[]): string {
  let out = text;
  for (const p of [...roster].sort((a, b) => b.aiToken.length - a.aiToken.length)) {
    out = out.split(p.aiToken).join(p.displayName);
  }
  return out;
}

/** The egress assertion: does any roster name still appear? The wrapper refuses to send if so.
 *  NFC-normalised on both sides to match redactNames (so an NFD name can't sneak past here either). */
export function containsRosterName(text: string, roster: RosterEntry[]): boolean {
  const t = text.normalize('NFC');
  return roster.some((p) => {
    const name = p.displayName.normalize('NFC').trim();
    return name.length > 0 && nameRegExp(name, 'iu').test(t);
  });
}

function orderedRoster(roster: RosterEntry[]): RosterEntry[] {
  return [...roster].sort((a, b) => b.displayName.trim().length - a.displayName.trim().length);
}
