// The pupil-data boundary, as pure functions so it can be proven by tests. Two guarantees
// (SECURITY_AND_PRIVACY §"The pupil-name rule" / §"Safeguarding content is withheld"):
//   1. Safeguarding-flagged content is WITHHELD entirely — never sent, not merely redacted.
//   2. Every roster name is replaced by its stable ai_token before anything leaves.
//
// Matching is variant-aware so trivial punctuation/accent forms can't bypass it (BUG-001/037): each
// name character matches its routine apostrophe / hyphen-dash / accent / case variants, and distinctive
// given/sur-name PARTS are matched on their own so a first- or last-name-only reference is caught too.
// We never lossily fold the whole text — only the match pattern is variant-aware, so the redacted text
// the AI receives is the original (NFC) minus the names.
import type { RosterEntry } from '../repos/pupils';

export interface RedactableItem {
  text: string;
  safeguarding?: boolean;
}

// Unicode-aware word boundary. JS `\b` only treats ASCII [A-Za-z0-9_] as word chars, so a name whose
// first/last character is accented (José, Zoë) has NO `\b` at that edge. These lookarounds count any
// Unicode letter/number/underscore as a word char, so accented edges are bounded while "Samuel" is
// still NOT matched by a "Sam" entry (the following 'u' is a letter).
const WORD = '[\\p{L}\\p{N}_]';

// The apostrophe and hyphen/dash families that routinely differ between a stored name and pasted text.
const APOS = "['‘’ʼ`´′＇]";
const HYPH = '[\\u002d‐‑‒–—―−]';
const APOS_RE = new RegExp(APOS, 'u');
const HYPH_RE = new RegExp(HYPH, 'u');

// Base Latin letter → its accented variants (lowercase; the 'i' flag covers the uppercase forms). So a
// stored "José" matches "Jose"/"JOSÉ" and a stored "Jose" matches "José" — bypass closed both ways.
const ACCENTS: Record<string, string> = {
  a: 'àáâãäåāăą', c: 'çćĉċč', d: 'ďđ', e: 'èéêëēĕėęě', g: 'ĝğġģ', h: 'ĥħ',
  i: 'ìíîïĩīĭįı', j: 'ĵ', k: 'ķ', l: 'ĺļľŀł', n: 'ñńņňŉ', o: 'òóôõöøōŏő',
  r: 'ŕŗř', s: 'śŝşš', t: 'ţťŧ', u: 'ùúûüũūŭůűų', w: 'ŵ', y: 'ýÿŷ', z: 'źżž',
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Base form of one character: strip a combining accent and lowercase ("é"→"e", "Ñ"→"n"). */
function baseOf(ch: string): string {
  return ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** A regex fragment matching this name character and all its routine variants. */
function charPattern(ch: string): string {
  if (APOS_RE.test(ch)) return `${APOS}?`; // O'Brien == O'Brien == OBrien
  if (HYPH_RE.test(ch)) return `(?:${HYPH}|\\s)+`; // Anne-Marie == Anne–Marie == Anne Marie
  const base = baseOf(ch);
  if (base.length === 1 && ACCENTS[base] !== undefined) return `[${base}${ACCENTS[base]}]`;
  return escapeRegExp(ch);
}

/** Pattern for one whitespace-delimited token (its internal letters / apostrophes / hyphens). */
function tokenPattern(token: string): string {
  let out = '';
  for (const ch of token.normalize('NFC')) out += charPattern(ch);
  return out;
}

/** The full display name: each whitespace run matches any whitespace run; tokens match variant-aware. */
function fullPattern(name: string): string {
  return name.trim().split(/\s+/).map(tokenPattern).join('\\s+');
}

/** Lowercased, accent-stripped, apostrophe-stripped form of a token (for length/stoplist decisions). */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(new RegExp(APOS, 'gu'), '');
}

// Each given/sur-name PART of a multi-token name is matched on its own too, so a first- or surname-only
// reference is caught ("Anna struggled" from "Anna Lee"). POLICY (BUG-037, teacher decision 2026-06-21):
// FAIL CLOSED — a part that is also an everyday English word ("Summer", "Mark", "Brown", "May") is STILL
// matched, because the absolute rule is "no pupil name ever reaches an AI service". The cost is scoped
// over-redaction: that ordinary word is tokenised in AI context ONLY on a roster that actually contains
// such a pupil (a class with a "Summer" will see "summer term" → a token). We keep just two limits — a
// length floor of 2 (never match a 1-char initial like the "J" in "Anna J Lee", which would redact every
// "J"/"I"), and single-token names are left to the full-name pass (the part IS the whole name). To trade
// some privacy back for fewer false positives, reintroduce a roster-tuned stop-list of folded words here.

/** The distinct name parts worth matching on their own (multi-token names only). Fail-closed: common
 *  words that are real roster names ARE included — see the policy note above. */
function significantParts(name: string): string[] {
  const parts = name.trim().split(new RegExp(`(?:\\s|${HYPH})+`, 'u')).filter(Boolean);
  if (parts.length < 2) return []; // single-token name → already matched in full by fullPattern
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const f = fold(p);
    if (f.length < 2 || seen.has(f)) continue; // skip 1-char initials; keep everyday-word names (fail closed)
    seen.add(f);
    out.push(p);
  }
  return out;
}

function bounded(pattern: string, flags: string): RegExp {
  return new RegExp(`(?<!${WORD})(?:${pattern})(?!${WORD})`, flags);
}

/** Drop every safeguarding-flagged item entirely. A flagged item must never reach a provider. */
export function withholdSafeguarding<T extends { safeguarding?: boolean }>(items: T[]): T[] {
  return items.filter((i) => !i.safeguarding);
}

/** Replace each roster name with its ai_token. Two passes: every FULL display name first (longest
 *  first, so exact names claim their text before any partial pass can mis-assign a shared first name to
 *  the wrong pupil), then distinctive given/sur-name parts. Variant-aware (case / accents / apostrophe /
 *  hyphen / whitespace), so a typographic form can't slip past redaction OR the egress assert. */
export function redactNames(text: string, roster: RosterEntry[]): string {
  let out = text.normalize('NFC');
  const ordered = orderedRoster(roster);
  for (const p of ordered) {
    const name = p.displayName.normalize('NFC').trim();
    if (name) out = out.replace(bounded(fullPattern(name), 'giu'), p.aiToken);
  }
  const partJobs = ordered
    .flatMap((p) => significantParts(p.displayName.normalize('NFC').trim()).map((part) => ({ part, token: p.aiToken })))
    .sort((a, b) => b.part.length - a.part.length); // longest part first, so a short part can't pre-empt
  for (const job of partJobs) out = out.replace(bounded(tokenPattern(job.part), 'giu'), job.token);
  return out;
}

/** Re-expand tokens back to names — FOR DISPLAY ONLY, after a call returns. Longest token first so a
 *  shorter token can't corrupt a longer one (PUPIL_1 is a prefix of PUPIL_10). */
export function expandTokens(text: string, roster: RosterEntry[]): string {
  let out = text;
  for (const p of [...roster].sort((a, b) => b.aiToken.length - a.aiToken.length)) {
    out = out.split(p.aiToken).join(p.displayName);
  }
  return out;
}

/** The egress assertion: does any roster name (full, or a distinctive part) still appear? The wrapper
 *  refuses to send if so. Variant-aware on both sides, matching redactNames — fail closed. */
export function containsRosterName(text: string, roster: RosterEntry[]): boolean {
  const t = text.normalize('NFC');
  return roster.some((p) => {
    const name = p.displayName.normalize('NFC').trim();
    if (!name) return false;
    if (bounded(fullPattern(name), 'iu').test(t)) return true;
    return significantParts(name).some((part) => bounded(tokenPattern(part), 'iu').test(t));
  });
}

function orderedRoster(roster: RosterEntry[]): RosterEntry[] {
  return [...roster].sort((a, b) => b.displayName.trim().length - a.displayName.trim().length);
}
