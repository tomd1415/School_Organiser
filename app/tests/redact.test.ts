import { describe, expect, it } from 'vitest';
import { containsRosterName, expandTokens, redactNames, withholdSafeguarding } from '../src/services/redact';
import type { RosterEntry } from '../src/repos/pupils';

const roster: RosterEntry[] = [
  { id: 1, displayName: 'Sam', aiToken: 'PUPIL_1', active: true },
  { id: 2, displayName: 'Samantha Jones', aiToken: 'PUPIL_2', active: true },
  { id: 3, displayName: 'Bob', aiToken: 'PUPIL_3', active: true },
];

describe('redact — the pupil-name boundary', () => {
  it('withholds safeguarding-flagged items entirely (not redacted — removed)', () => {
    const kept = withholdSafeguarding([
      { text: 'projector broke', safeguarding: false },
      { text: 'a disclosure', safeguarding: true },
      { text: 'normal note' },
    ]);
    expect(kept).toHaveLength(2);
    expect(kept.some((i) => i.text.includes('disclosure'))).toBe(false);
  });

  it('replaces every roster name with its token, longest name first', () => {
    const out = redactNames('Samantha Jones helped Sam and Bob today', roster);
    expect(out).toBe('PUPIL_2 helped PUPIL_1 and PUPIL_3 today');
    expect(containsRosterName(out, roster)).toBe(false);
  });

  it('is word-bounded — never corrupts a substring', () => {
    // "Samuel" contains "Sam"; "Bobby" contains "Bob" — neither is on the roster.
    expect(redactNames('Samuel and Bobby are not pupils', roster)).toBe('Samuel and Bobby are not pupils');
  });

  it('is case-insensitive', () => {
    expect(redactNames('SAM sat with bob', roster)).toBe('PUPIL_1 sat with PUPIL_3');
  });

  it('containsRosterName is the egress assertion (any surviving name → true)', () => {
    expect(containsRosterName('a note mentioning Bob', roster)).toBe(true);
    expect(containsRosterName('a clean note about PUPIL_3', roster)).toBe(false);
  });

  it('expandTokens restores names — for display only', () => {
    expect(expandTokens('PUPIL_2 and PUPIL_1', roster)).toBe('Samantha Jones and Sam');
  });

  it('round-trips redact → expand losslessly', () => {
    const original = 'Bob sat with Samantha Jones';
    expect(expandTokens(redactNames(original, roster), roster)).toBe(original);
  });

  it('an empty roster redacts nothing and never flags', () => {
    expect(redactNames('anything goes here', [])).toBe('anything goes here');
    expect(containsRosterName('anything goes here', [])).toBe(false);
  });

  // Regression: JS `\b` is ASCII-only, so accented edges (José, Zoë) used to slip past BOTH
  // redaction and the egress assert — breaking the one rule. Unicode-aware boundaries fix it.
  it('redacts names whose first/last character is accented', () => {
    const accented = [
      { id: 10, displayName: 'José', aiToken: 'PUPIL_10', active: true },
      { id: 11, displayName: 'Zoë', aiToken: 'PUPIL_11', active: true },
      { id: 12, displayName: 'André', aiToken: 'PUPIL_12', active: true },
    ];
    const out = redactNames('I sat with José and Zoë, then André helped', accented);
    expect(out).toBe('I sat with PUPIL_10 and PUPIL_11, then PUPIL_12 helped');
    expect(containsRosterName('next to José today', accented)).toBe(true); // the assert also catches it
    expect(containsRosterName('next to PUPIL_10 today', accented)).toBe(false);
  });

  // Regression: a DECOMPOSED (NFD) accent in the incoming text (routine from macOS / PDF / MIS-export
  // paste) must still match an NFC-stored name — otherwise the real name reaches the AI AND the egress
  // assert misses it. Both sides are NFC-normalised at the boundary.
  it('redacts/catches a name even when the text uses decomposed (NFD) accents', () => {
    const roster = [{ id: 9, displayName: 'José Múñoz'.normalize('NFC'), aiToken: 'PUPIL_9', active: true }];
    const nfdText = 'note about José Múñoz today'.normalize('NFD');
    expect(redactNames(nfdText, roster)).toContain('PUPIL_9');
    expect(redactNames(nfdText, roster)).not.toMatch(/Mu/); // the name is gone
    expect(containsRosterName(nfdText, roster)).toBe(true); // egress assert catches the NFD form too
  });

  it('still word-bounds accented names (internal accents, ASCII edges untouched)', () => {
    const r = [{ id: 1, displayName: 'Ana', aiToken: 'PUPIL_1', active: true }];
    expect(redactNames('Ana and Anabel', r)).toBe('PUPIL_1 and Anabel'); // "Anabel" not matched
  });

  // Regression: a multi-word name written with a non-breaking space / tab / double space (routine from
  // Word/Outlook/PDF paste, MIS-export CSV, or pupil-typed answers) must STILL be tokenised + caught.
  // A literal single space in the stored name used to miss these — leaking the full name to the AI.
  it('redacts/catches a multi-word name across non-breaking spaces, tabs and double spaces', () => {
    for (const sep of [' ', '\t', '  ', '   ']) {
      const text = `worked with Samantha${sep}Jones today`;
      expect(redactNames(text, roster)).toBe('worked with PUPIL_2 today');
      expect(containsRosterName(text, roster)).toBe(true); // the egress assert catches it too
    }
  });

  // Regression: tokens are expanded longest-first so a shorter token can't corrupt a longer one
  // (PUPIL_1 is a prefix of PUPIL_10). With 10+ pupils this used to render "PUPIL_10" as <name-1> + "0".
  it('expandTokens does not let PUPIL_1 corrupt PUPIL_10 / PUPIL_11 (10+ roster)', () => {
    const big = [
      { id: 1, displayName: 'Alex', aiToken: 'PUPIL_1', active: true },
      { id: 10, displayName: 'Bo', aiToken: 'PUPIL_10', active: true },
      { id: 11, displayName: 'Cy', aiToken: 'PUPIL_11', active: true },
    ];
    expect(expandTokens('PUPIL_1, PUPIL_10 and PUPIL_11', big)).toBe('Alex, Bo and Cy');
  });

  // BUG-001: a typographic apostrophe / hyphen-dash variant must not bypass redaction OR the assert.
  it('redacts a name across straight/curly apostrophes and hyphen/dash variants, both directions', () => {
    const r = [
      { id: 1, displayName: "O'Brien", aiToken: 'PUPIL_1', active: true }, // stored straight apostrophe
      { id: 2, displayName: 'Anne-Marie', aiToken: 'PUPIL_2', active: true }, // stored hyphen
    ];
    // text uses the curly apostrophe (U+2019) and an en-dash (U+2013)
    expect(redactNames('spoke to O’Brien and Anne–Marie', r)).toBe('spoke to PUPIL_1 and PUPIL_2');
    expect(containsRosterName('note about O’Brien today', r)).toBe(true);
    // reverse: stored curly, text straight — still caught
    const r2 = [{ id: 1, displayName: 'O’Brien', aiToken: 'PUPIL_1', active: true }];
    expect(redactNames("O'Brien was here", r2)).toBe('PUPIL_1 was here');
    expect(containsRosterName("O'Brien", r2)).toBe(true);
  });

  // BUG-037: a first-name- or surname-only reference, and accentless spellings, must still be caught.
  it('catches a given-name-only or surname-only reference', () => {
    const r = [{ id: 1, displayName: 'Anna Lee', aiToken: 'PUPIL_1', active: true }];
    expect(redactNames('Anna struggled with fractions', r)).toBe('PUPIL_1 struggled with fractions');
    expect(redactNames('Lee did well today', r)).toBe('PUPIL_1 did well today');
    expect(containsRosterName('Anna struggled', r)).toBe(true);
    expect(containsRosterName('Lee struggled', r)).toBe(true);
  });

  it('matches an accent-folded name part (José/García ⇄ Jose/Garcia)', () => {
    const r = [{ id: 1, displayName: 'José García', aiToken: 'PUPIL_1', active: true }];
    expect(redactNames('Jose was paired with Garcia', r)).toBe('PUPIL_1 was paired with PUPIL_1');
    expect(containsRosterName('spoke to Jose', r)).toBe(true);
  });

  // BUG-037 explicit policy: an ambiguous common-word name part is NOT matched alone (only the full
  // name), so ordinary prose isn't over-redacted — but the full name and the egress assert still hold.
  it('does not partial-match an ambiguous common-word name part, but still catches the full name', () => {
    const r = [{ id: 1, displayName: 'Summer Brown', aiToken: 'PUPIL_1', active: true }];
    expect(redactNames('over the summer the leaves turn brown', r)).toBe('over the summer the leaves turn brown');
    expect(containsRosterName('summer term planning', r)).toBe(false);
    expect(redactNames('Summer Brown was present', r)).toBe('PUPIL_1 was present');
    expect(containsRosterName('Summer Brown', r)).toBe(true);
  });

  // BUG-037 collision: a shared first name must map to the right pupil, not be claimed by a longer name.
  it('does not let one pupil’s name part claim another pupil with the same first name', () => {
    const r = [
      { id: 1, displayName: 'Anna Lee', aiToken: 'PUPIL_1', active: true },
      { id: 2, displayName: 'Anna', aiToken: 'PUPIL_2', active: true },
    ];
    expect(redactNames('Anna Lee sat with Anna', r)).toBe('PUPIL_1 sat with PUPIL_2');
  });
});

// Forward-compat for Phase 9 (auto-marking) + the multi-teacher future: the redactor is purely
// roster-driven, so the "no pupil name reaches an AI service" guarantee must hold UNCHANGED when
// the roster grows from one teacher's class to a whole school. A pupil from another teacher's
// class is just another roster entry — it must still be tokenised and caught on egress.
describe('redact — holds at school-wide roster scale (multi-teacher forward-compat)', () => {
  // ~200 pupils across notional classes, with deliberate first-name clashes + accented edges.
  const school: RosterEntry[] = Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    displayName: `Pupil${i + 1}`,
    aiToken: `PUPIL_${i + 1}`,
    active: true,
  }));
  school.push(
    { id: 201, displayName: 'Sam', aiToken: 'PUPIL_201', active: true }, // 8-Computing
    { id: 202, displayName: 'Sam Patel', aiToken: 'PUPIL_202', active: true }, // 9-Science (another teacher)
    { id: 203, displayName: 'José', aiToken: 'PUPIL_203', active: true }, // 10-Art (accented edge)
  );

  it('tokenises a name from another class typed in an answer, and the egress assert catches it', () => {
    const answer = 'In the group task I worked with Sam Patel and José from another class.';
    expect(containsRosterName(answer, school)).toBe(true); // pre-redaction: a name is present
    const out = redactNames(answer, school);
    expect(containsRosterName(out, school)).toBe(false); // post-redaction: nothing survives
    expect(out).toContain('PUPIL_202'); // Sam Patel
    expect(out).toContain('PUPIL_203'); // José
  });

  it('longest-match ordering still holds at scale ("Sam Patel" before "Sam")', () => {
    expect(redactNames('Sam Patel helped Sam', school)).toBe('PUPIL_202 helped PUPIL_201');
  });

  it('a clean (already-tokenised) string at school scale never trips the egress assert', () => {
    expect(containsRosterName('PUPIL_202 worked with PUPIL_203 and PUPIL_5', school)).toBe(false);
  });
});
