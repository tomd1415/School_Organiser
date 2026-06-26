import { describe, expect, it } from 'vitest';
import { validateGenerated } from '../src/services/assessmentValidate';
import { assembleBlueprint } from '../src/services/assessmentBlueprint';
import type { GeneratedAssessment } from '../src/llm/schemas/generateAssessment';

// Phase 1 — the PURE validator: AI output + blueprint → clamped/normalised DraftQuestion[]. No DB.

const blueprint = assembleBlueprint({
  unitId: 9,
  schemeId: 3,
  courseId: 2,
  unitTitle: 'Networks',
  courseName: 'GCSE CS',
  specPoints: [
    { id: 100, code: '1.2.4', title: 'Topologies' },
    { id: 200, code: '1.3.1', title: 'Security' },
  ],
  coveredSpecPointIds: [100], // 100 covered, 200 uncovered
  examStage: 'gcse',
  examProfileLabel: 'x',
  groupCourseId: 5,
  lessonTitles: [],
  lessonObjectives: [],
});

type Q = GeneratedAssessment['questions'][number];
type P = Q['parts'][number];

const part = (over: Partial<P> = {}): P => ({
  partLabel: 'a',
  prompt: 'do it',
  marks: 2,
  responseType: 'short_text',
  options: [],
  modelAnswer: null,
  markPoints: [{ text: 'point', marks: 2, required: false, acceptedAlternatives: [], kind: 'keyword' }],
  misconceptions: [],
  ...over,
});

const q = (over: Partial<Q> = {}): Q => ({
  specPointCode: null,
  isUncovered: false,
  commandWord: null,
  archetype: null,
  difficultyBand: null,
  difficultyStep: null,
  stem: 'stem',
  modelAnswer: null,
  parts: [part()],
  ...over,
});

describe('validateGenerated', () => {
  it('drops an unknown spec-point code (never invents an id) and warns', () => {
    const r = validateGenerated({ questions: [q({ specPointCode: 'ZZ.9' })] }, blueprint);
    expect(r.questions[0]!.specPointId).toBeNull();
    expect(r.warnings.join(' ')).toMatch(/Unknown spec-point code/i);
  });

  it('overrides isUncovered from the blueprint covered flag (trusts the blueprint)', () => {
    const r = validateGenerated(
      {
        questions: [
          q({ specPointCode: '1.2.4', isUncovered: true }), // covered → must become false
          q({ specPointCode: '1.3.1', isUncovered: false }), // uncovered → must become true
        ],
      },
      blueprint,
    );
    expect(r.questions[0]!.specPointId).toBe(100);
    expect(r.questions[0]!.isUncovered).toBe(false);
    expect(r.questions[1]!.specPointId).toBe(200);
    expect(r.questions[1]!.isUncovered).toBe(true);
  });

  it('clamps part and mark-point marks into [0, 20]', () => {
    const r = validateGenerated(
      { questions: [q({ parts: [part({ marks: 999, markPoints: [{ text: 'x', marks: -5, required: false, acceptedAlternatives: [], kind: 'exact' }] })] })] },
      blueprint,
    );
    expect(r.questions[0]!.parts[0]!.marks).toBe(20);
    expect(r.questions[0]!.parts[0]!.markPoints[0]!.marks).toBe(0);
  });

  it('normalises an unknown mark kind to a known kind', () => {
    const r = validateGenerated(
      { questions: [q({ parts: [part({ responseType: 'extended_response', markPoints: [{ text: 'x', marks: 2, required: false, acceptedAlternatives: [], kind: 'explain' }] })] })] },
      blueprint,
    );
    expect(r.questions[0]!.parts[0]!.markPoints[0]!.kind).toBe('open');
  });

  it('restricts an unknown response type to medium_text', () => {
    const r = validateGenerated({ questions: [q({ parts: [part({ responseType: 'slider' })] })] }, blueprint);
    expect(r.questions[0]!.parts[0]!.expectedResponseType).toBe('medium_text');
  });

  it('folds options into partConfig only for the choice widgets', () => {
    const choice = validateGenerated(
      { questions: [q({ parts: [part({ responseType: 'multiple_choice', options: ['A', 'B'], markPoints: [{ text: 'A', marks: 1, required: true, acceptedAlternatives: [], kind: 'choice' }] })] })] },
      blueprint,
    );
    expect(choice.questions[0]!.parts[0]!.partConfig).toEqual({ options: ['A', 'B'] });
    const text = validateGenerated({ questions: [q({ parts: [part({ responseType: 'short_text', options: ['A', 'B'] })] })] }, blueprint);
    expect(text.questions[0]!.parts[0]!.partConfig).toBeNull();
  });

  it('synthesises a single open mark point when a part has none', () => {
    const r = validateGenerated({ questions: [q({ parts: [part({ marks: 3, markPoints: [] })] })] }, blueprint);
    const mps = r.questions[0]!.parts[0]!.markPoints;
    expect(mps).toHaveLength(1);
    expect(mps[0]!.kind).toBe('open');
    expect(mps[0]!.marks).toBe(3);
    expect(r.warnings.join(' ')).toMatch(/no usable mark points/i);
  });

  it('drops a part with an empty prompt, and a question left with no parts → zero usable', () => {
    const r = validateGenerated({ questions: [q({ parts: [part({ prompt: '   ' })] })] }, blueprint);
    expect(r.questions).toHaveLength(0);
  });

  it('caps a runaway question count at 40', () => {
    const many = Array.from({ length: 50 }, () => q());
    const r = validateGenerated({ questions: many }, blueprint);
    expect(r.questions).toHaveLength(40);
    expect(r.warnings.join(' ')).toMatch(/Capped at 40/i);
  });
});
