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

  it('still word-bounds accented names (internal accents, ASCII edges untouched)', () => {
    const r = [{ id: 1, displayName: 'Ana', aiToken: 'PUPIL_1', active: true }];
    expect(redactNames('Ana and Anabel', r)).toBe('PUPIL_1 and Anabel'); // "Anabel" not matched
  });
});
