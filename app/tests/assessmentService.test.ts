import { describe, expect, it } from 'vitest';
import {
  buildAssessmentTree,
  computeSpecPointResults,
  isObjectivePart,
  scoreOfAttempt,
  type AssessmentRow,
  type MarkPointRow,
  type MisconceptionRow,
  type PartRow,
  type QuestionRow,
} from '../src/services/assessment';

// Per-unit assessment — pure domain logic (tree assembly + objective spec-point attribution + scoring).

const assessment: AssessmentRow = {
  id: 1, unitId: 9, schemeId: 3, courseId: 2, title: 'Networks — end of unit', style: 'gcse',
  examBoard: 'OCR J277', status: 'draft', marksTotal: 0, blueprint: {}, sourceType: 'ai_generated', promptVersion: 'generate_assessment@1',
};
// Q1 (spec 100) one OBJECTIVE part (a multiple-choice point); Q2 (spec 200) one OPEN part.
const questions: QuestionRow[] = [
  { id: 20, assessmentId: 1, displayOrder: 1, commandWordCode: 'state', archetypeCode: 'recall', stem: 'Q2 stem', specPointId: 200, isUncovered: true, difficultyBand: 5, difficultyStep: 2, marksTotal: 4, modelAnswer: null },
  { id: 10, assessmentId: 1, displayOrder: 0, commandWordCode: null, archetypeCode: null, stem: 'Q1 stem', specPointId: 100, isUncovered: false, difficultyBand: 3, difficultyStep: 1, marksTotal: 1, modelAnswer: null },
];
const parts: PartRow[] = [
  { id: 200, questionId: 20, partLabel: 'a', displayOrder: 0, prompt: 'Explain…', marks: 4, expectedResponseType: 'extended_response', partConfig: null, modelAnswer: null },
  { id: 100, questionId: 10, partLabel: 'a', displayOrder: 0, prompt: 'Which…?', marks: 1, expectedResponseType: 'multiple_choice', partConfig: { options: ['A', 'B'] }, modelAnswer: null },
];
const markPoints: MarkPointRow[] = [
  { id: 1000, partId: 100, displayOrder: 0, text: 'B', marks: 1, isRequired: true, acceptedAlternatives: [], kind: 'choice' },
  { id: 2000, partId: 200, displayOrder: 1, text: 'mechanism', marks: 2, isRequired: false, acceptedAlternatives: [], kind: 'open' },
  { id: 2001, partId: 200, displayOrder: 0, text: 'term', marks: 2, isRequired: false, acceptedAlternatives: [], kind: 'open' },
];
const misconceptions: MisconceptionRow[] = [{ id: 1, partId: 200, label: 'names not explains', description: '…' }];

describe('buildAssessmentTree', () => {
  const tree = buildAssessmentTree(assessment, questions, parts, markPoints, misconceptions);
  it('orders questions + nests parts/mark-points/misconceptions ordered', () => {
    expect(tree.questions.map((q) => q.id)).toEqual([10, 20]); // by display_order
    const q2 = tree.questions[1]!;
    expect(q2.parts[0]!.markPoints.map((m) => m.id)).toEqual([2001, 2000]); // by display_order
    expect(q2.parts[0]!.misconceptions).toHaveLength(1);
  });
  it('classifies objective vs open parts', () => {
    const [q1, q2] = tree.questions;
    expect(isObjectivePart(q1!.parts[0]!)).toBe(true); // choice point
    expect(isObjectivePart(q2!.parts[0]!)).toBe(false); // open points
  });
});

describe('computeSpecPointResults', () => {
  const tree = buildAssessmentTree(assessment, questions, parts, markPoints, misconceptions);
  it('attributes OBJECTIVE part marks to the question spec point; skips open parts', () => {
    const res = computeSpecPointResults(tree, [
      { partId: 100, marksAwarded: 1, marksTotal: 1 }, // objective → spec 100
      { partId: 200, marksAwarded: 3, marksTotal: 4 }, // open → not attributed
    ]);
    expect(res.get(100)).toEqual({ awarded: 1, total: 1 });
    expect(res.has(200)).toBe(false);
  });
  it('scoreOfAttempt totals every answered part (objective + open)', () => {
    expect(scoreOfAttempt([{ partId: 100, marksAwarded: 1, marksTotal: 1 }, { partId: 200, marksAwarded: 3, marksTotal: 4 }])).toEqual({ awarded: 4, total: 5 });
  });
});
