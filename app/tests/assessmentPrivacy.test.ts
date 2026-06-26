import { describe, expect, it } from 'vitest';
import { containsRosterName, redactNames, type RedactableItem, withholdSafeguarding } from '../src/services/redact';
import type { RosterEntry } from '../src/repos/pupils';
import { assembleBlueprint } from '../src/services/assessmentBlueprint';
import { GENERATE_ASSESSMENT_SYSTEM, generateAssessmentInstruction, generateAssessmentItems } from '../src/llm/prompts/generateAssessment';
import { MARK_ASSESSMENT_ANSWERS_SYSTEM, markAssessmentAnswersItems } from '../src/llm/prompts/markAssessmentAnswers';

// Phase 7 — SUBSYSTEM-level privacy guards. These assert the non-negotiables hold across EVERY assessment AI
// call, independent of any one phase: (1/2) a pupil name in any input is caught by the wrapper's egress
// assert and redacts to a token; (3) safeguarding content is withheld entirely; (4) inputs live in context[],
// never `system`; the `system` strings are constants. The wrapper's containsRosterName is the REAL guard —
// these tests pin the call shape so a future change can't route data around it.

const roster: RosterEntry[] = [{ id: 1, displayName: 'Jamie Okafor', aiToken: 'PUPIL_1', active: true }];

describe('assessment prompt system strings are constants (no spec / answer / pupil data baked in)', () => {
  it('the generation + marking system strings carry no dynamic data and never name a pupil', () => {
    for (const sys of [GENERATE_ASSESSMENT_SYSTEM, MARK_ASSESSMENT_ANSWERS_SYSTEM]) {
      expect(sys.length).toBeGreaterThan(100);
      expect(sys).not.toContain('${'); // no unresolved interpolation
      expect(containsRosterName(sys, roster)).toBe(false);
      // belt-and-braces sentinels that would only appear if data leaked into the constant
      expect(sys).not.toContain('Jamie');
      expect(sys).not.toContain('PUPIL_1');
    }
  });
});

describe('generation — all factual inputs route through context[] (so the egress assert + redaction apply)', () => {
  // A blueprint that (artificially) carries a roster name in its unit/lesson data.
  const blueprint = assembleBlueprint({
    unitId: 9, schemeId: 3, courseId: 2, unitTitle: "Jamie Okafor's networks unit", courseName: 'GCSE CS',
    specPoints: [{ id: 100, code: '1.2.4', title: 'Topologies' }], coveredSpecPointIds: [100], examStage: 'gcse',
    examProfileLabel: 'a GCSE class', groupCourseId: 5, lessonTitles: ['Star vs mesh'], lessonObjectives: [],
  });
  const items = generateAssessmentItems(blueprint);
  const itemsText = items.map((i) => i.text).join('\n');

  it('the name lands in context[] (not system) — so the wrapper would redact it to a token', () => {
    expect(itemsText).toContain('Jamie Okafor'); // present in the redactable context
    expect(GENERATE_ASSESSMENT_SYSTEM).not.toContain('Jamie');
    expect(generateAssessmentInstruction(blueprint)).not.toContain('Jamie');
    // the egress assert WOULD fire on the assembled context, and redaction removes the name
    expect(containsRosterName(itemsText, roster)).toBe(true);
    expect(containsRosterName(redactNames(itemsText, roster), roster)).toBe(false);
    expect(redactNames(itemsText, roster)).toContain('PUPIL_1');
  });
});

describe('marking — answers route through context[] as anonymous slots; safeguarding withheld', () => {
  const items = markAssessmentAnswersItems({
    question: 'Explain encryption.', marksTotal: 4,
    markPoints: [{ expected: 'scrambles with a key', marks: 2, alternatives: [] }], misconceptions: [],
    slots: [{ slot: 'A', answer: 'I am Jamie Okafor and encryption scrambles the data.' }],
  });
  const itemsText = items.map((i) => i.text).join('\n');

  it('the answer (with a self-named pupil) is in context[] only, and redacts to a token before egress', () => {
    expect(itemsText).toContain('Jamie Okafor');
    expect(MARK_ASSESSMENT_ANSWERS_SYSTEM).not.toContain('Jamie');
    expect(containsRosterName(itemsText, roster)).toBe(true);
    expect(containsRosterName(redactNames(itemsText, roster), roster)).toBe(false);
    expect(itemsText).toMatch(/\bA\.\s/); // anonymous slot letter, not a name
  });

  it('a safeguarding-flagged item is WITHHELD from the batch entirely (never sent)', () => {
    const flagged: RedactableItem[] = [{ text: 'a disclosure', safeguarding: true }, { text: 'normal context' }];
    const kept = withholdSafeguarding(flagged);
    expect(kept.map((k) => k.text)).toEqual(['normal context']); // the flagged item is dropped before egress
  });
});
