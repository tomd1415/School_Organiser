import { describe, expect, it } from 'vitest';
import { takeTree } from '../src/services/assessmentTake';
import { renderTakePage } from '../src/lib/assessmentTakeView';
import type { AssessmentTree } from '../src/services/assessment';

// Phase 3 — the headline privacy property: takeTree is the single chokepoint that strips the answer key.
// Sentinel strings in every must-not-leak field let us assert (deep) that none survive the projection OR
// the rendered pupil HTML.

const SECRET_MODEL = 'SECRET_MODEL_ANSWER_xyz';
const SECRET_MP = 'SECRET_MARK_POINT_xyz';
const SECRET_ALT = 'SECRET_ALT_xyz';
const SECRET_MISC = 'SECRET_MISCONCEPTION_xyz';

const tree: AssessmentTree = {
  id: 1, unitId: 1, schemeId: 1, courseId: 1, title: 'Networks paper', style: 'gcse', examBoard: 'OCR J277',
  status: 'ready', marksTotal: 3, blueprint: {}, sourceType: 'ai_generated', promptVersion: null,
  questions: [
    {
      id: 10, assessmentId: 1, displayOrder: 0, commandWordCode: 'state', archetypeCode: null, stem: 'A school LAN.',
      specPointId: 100, isUncovered: false, difficultyBand: null, difficultyStep: null, marksTotal: 3, modelAnswer: SECRET_MODEL,
      parts: [
        {
          id: 100, questionId: 10, partLabel: 'a', displayOrder: 0, prompt: 'Pick the topology', marks: 1,
          expectedResponseType: 'multiple_choice', partConfig: { options: ['Star', 'Bus'] }, modelAnswer: SECRET_MODEL,
          markPoints: [{ id: 1000, partId: 100, displayOrder: 0, text: SECRET_MP, marks: 1, isRequired: true, acceptedAlternatives: [SECRET_ALT], kind: 'choice' }],
          misconceptions: [{ id: 1, partId: 100, label: SECRET_MISC, description: 'desc' }],
        },
        {
          id: 101, questionId: 10, partLabel: 'b', displayOrder: 1, prompt: 'Explain one advantage', marks: 2,
          expectedResponseType: 'extended_response', partConfig: null, modelAnswer: SECRET_MODEL,
          markPoints: [{ id: 1001, partId: 101, displayOrder: 0, text: SECRET_MP, marks: 2, isRequired: false, acceptedAlternatives: [], kind: 'open' }],
          misconceptions: [],
        },
      ],
    },
  ],
};

describe('takeTree — PII-safe projection', () => {
  const paper = takeTree(tree);
  const json = JSON.stringify(paper);

  it('keeps stems, prompts, choice options, and the marks tariff', () => {
    expect(paper.questions[0]!.stem).toBe('A school LAN.');
    expect(paper.questions[0]!.parts[0]!.options).toEqual(['Star', 'Bus']);
    expect(paper.questions[0]!.parts[0]!.marks).toBe(1);
    expect(paper.questions[0]!.parts[1]!.responseType).toBe('extended_response');
  });

  it('strips EVERY answer-key field (mark points, model answers, misconceptions, kinds, alternatives)', () => {
    for (const secret of [SECRET_MODEL, SECRET_MP, SECRET_ALT, SECRET_MISC]) expect(json).not.toContain(secret);
    expect(json).not.toMatch(/markPoints|modelAnswer|misconceptions|"kind"|acceptedAlternatives/);
  });

  it('drops options for non-choice widgets', () => {
    expect(paper.questions[0]!.parts[1]!.options).toEqual([]);
  });

  it('the rendered pupil take page contains no answer key', () => {
    const html = renderTakePage(paper, new Map());
    for (const secret of [SECRET_MODEL, SECRET_MP, SECRET_ALT, SECRET_MISC]) expect(html).not.toContain(secret);
    // it DOES render the stem + a choice option (so the pupil can answer)
    expect(html).toContain('A school LAN.');
    expect(html).toContain('Star');
  });
});
