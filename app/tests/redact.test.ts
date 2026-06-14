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
