import { describe, expect, it } from 'vitest';
import { classWorkItems } from '../src/llm/prompts/classWork';
import { redactNames, containsRosterName, withholdSafeguarding } from '../src/services/redact';
import type { RosterEntry } from '../src/repos/pupils';

// 8.7: the class-work summary sends pupils' typed answers to the AI. They go through context[],
// so the wrapper's redaction applies — but a pupil can type a CLASSMATE'S name into an answer.
// This locks the boundary: that name is tokenised before egress, exactly like any other text.
const roster: RosterEntry[] = [
  { id: 1, displayName: 'Ada', aiToken: 'PUPIL_1', active: true },
  { id: 2, displayName: 'Ben', aiToken: 'PUPIL_2', active: true },
];

describe('classWork — the egress boundary for pupil answers', () => {
  it('redacts a pupil name typed inside an answer before it could leave', () => {
    const items = classWorkItems({
      worksheetTitle: 'Lists',
      questions: [{ label: 'Who helped you?', answers: ['Ben helped me', 'I worked with Ada'] }],
      ratings: [4, 3],
      liked: ['practical'],
      disliked: ['typing'],
      comments: ['Ada and I had fun'],
    });
    // Mirror the wrapper: withhold flagged (none here) then redact every item's text.
    const redacted = withholdSafeguarding(items).map((i) => redactNames(i.text, roster));
    for (const text of redacted) {
      expect(containsRosterName(text, roster)).toBe(false);
    }
    // The redaction really happened (tokens present, names gone).
    const joined = redacted.join('\n');
    expect(joined).toContain('PUPIL_2'); // Ben
    expect(joined).toContain('PUPIL_1'); // Ada
    expect(joined).not.toMatch(/\bBen\b/);
    expect(joined).not.toMatch(/\bAda\b/);
  });

  it('groups answers per question anonymously (no pupil identifier attached)', () => {
    const items = classWorkItems({
      worksheetTitle: 'Lists',
      questions: [{ label: 'What is a list?', answers: ['a sequence', 'ordered items'] }],
      ratings: [],
      liked: [],
      disliked: [],
      comments: [],
    });
    const qItem = items.find((i) => i.text.includes('What is a list?'))!;
    // Answers are slot-lettered (A., B.), never named.
    expect(qItem.text).toMatch(/A\. a sequence/);
    expect(qItem.text).toMatch(/B\. ordered items/);
  });
});
