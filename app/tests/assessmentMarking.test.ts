import { describe, expect, it } from 'vitest';
import { isCompleteBatch } from '../src/services/marking';
import { guardMatch, gateMark } from '../src/lib/markSafetyGate';
import { MARK_ASSESSMENT_ANSWERS_SYSTEM, markAssessmentAnswersItems } from '../src/llm/prompts/markAssessmentAnswers';

// Phase 4 — pure marking guards (no DB, no AI): slot-batch completeness, the safety guard/gate, and the
// marking call shape (answer text + scheme in context[], never `system`; anonymous slots → no pupil name).

describe('isCompleteBatch (assessment per-part marking, one slot)', () => {
  it('accepts exactly the slot sent', () => {
    expect(isCompleteBatch(['A'], ['A'])).toBe(true);
  });
  it('rejects missing / duplicate / unknown / empty', () => {
    expect(isCompleteBatch(['A'], [])).toBe(false); // missing
    expect(isCompleteBatch(['A'], ['A', 'A'])).toBe(false); // duplicate
    expect(isCompleteBatch(['A'], ['B'])).toBe(false); // unknown
    expect(isCompleteBatch(['A', 'B'], ['A'])).toBe(false); // short
  });
});

describe('safeguarding guard + safety gate', () => {
  it('a disclosure phrase trips the guard (→ withhold from AI)', () => {
    expect(guardMatch('I want to die')).toBeTruthy();
    expect(guardMatch('A LAN covers one site.')).toBeNull();
  });
  it('the gate clamps over-total marks and flags low confidence / hallucinated evidence', () => {
    expect(gateMark({ answer: 'star topology', marksAwarded: 9, marksTotal: 3, evidence: 'star', confidence: 0.9 }).marksAwarded).toBe(3);
    expect(gateMark({ answer: 'star', marksAwarded: 2, marksTotal: 3, evidence: 'star', confidence: 0.2 }).needsReview).toBe(true); // low confidence
    expect(gateMark({ answer: 'star', marksAwarded: 2, marksTotal: 3, evidence: 'NOT IN ANSWER', confidence: 0.9 }).needsReview).toBe(true); // hallucinated evidence
  });
});

describe('marking prompt — privacy / call shape', () => {
  const items = markAssessmentAnswersItems({
    question: 'Explain how encryption protects data.',
    marksTotal: 4,
    markPoints: [{ expected: 'scrambles with a key', marks: 2, alternatives: ['ciphertext'] }],
    misconceptions: [{ label: 'encryption = password', description: '…' }],
    slots: [{ slot: 'A', answer: 'It scrambles the data so only the recipient can read it.' }],
  });
  const text = items.map((i) => i.text).join('\n');

  it('the answer + mark scheme live in context[] (the items), never the constant system string', () => {
    expect(text).toContain('It scrambles the data');
    expect(text).toContain('scrambles with a key');
    expect(MARK_ASSESSMENT_ANSWERS_SYSTEM).not.toContain('It scrambles the data');
    expect(MARK_ASSESSMENT_ANSWERS_SYSTEM).not.toContain('Explain how encryption');
  });

  it('answers are anonymous slot letters — no pupil identity in the batch', () => {
    expect(text).toMatch(/\bA\.\s/); // slot label "A. "
    for (const name of ['Aisha', 'Tom Duguid', 'PUPIL_1']) expect(text).not.toContain(name);
  });
});
