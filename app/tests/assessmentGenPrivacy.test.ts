import { describe, expect, it } from 'vitest';
import { assembleBlueprint } from '../src/services/assessmentBlueprint';
import { GENERATE_ASSESSMENT_SYSTEM, generateAssessmentInstruction, generateAssessmentItems } from '../src/llm/prompts/generateAssessment';

// Phase 1 privacy guard (pure): pin the call shape. No pupil identity is in scope at all (the blueprint is
// cohort/spec-point content), but every FACTUAL input must live in context[] — never the constant `system`
// string — so it inherits the wrapper's redaction/withholding/audit. The wrapper's containsRosterName is
// the real egress guard; this belt-and-braces test proves no factual data hides in `system` and no roster
// name appears anywhere in the assembled prompt.

const blueprint = assembleBlueprint({
  unitId: 9,
  schemeId: 3,
  courseId: 2,
  unitTitle: 'Networks under attack',
  courseName: 'GCSE Computer Science',
  specPoints: [
    { id: 100, code: '1.2.4', title: 'Topologies' },
    { id: 200, code: '1.3.1', title: 'Security threats' },
  ],
  coveredSpecPointIds: [100],
  examStage: 'gcse',
  examProfileLabel: 'a GCSE class (OCR J277)',
  groupCourseId: 5,
  lessonTitles: ['Star vs mesh'],
  lessonObjectives: ['Describe a star topology'],
});

describe('generate-assessment prompt — privacy / call shape', () => {
  const items = generateAssessmentItems(blueprint);
  const itemsText = items.map((i) => i.text).join('\n');
  const instruction = generateAssessmentInstruction(blueprint);

  it('the system string is constant — it carries NO spec / unit / course data', () => {
    expect(GENERATE_ASSESSMENT_SYSTEM).not.toContain('1.2.4');
    expect(GENERATE_ASSESSMENT_SYSTEM).not.toContain('Networks under attack');
    expect(GENERATE_ASSESSMENT_SYSTEM).not.toContain('GCSE Computer Science');
    expect(GENERATE_ASSESSMENT_SYSTEM).not.toContain('Star vs mesh');
  });

  it('all factual inputs live in context[] (spec codes + unit + lesson content)', () => {
    expect(itemsText).toContain('1.2.4');
    expect(itemsText).toContain('1.3.1');
    expect(itemsText).toContain('Networks under attack');
    expect(itemsText).toContain('Star vs mesh');
    // every RedactableItem is a plain text item, with no safeguarding bypass flag set
    expect(items.every((i) => i.safeguarding == null || i.safeguarding === false)).toBe(true);
  });

  it('the instruction carries only counts/targets, not spec content', () => {
    expect(instruction).not.toContain('1.2.4');
    expect(instruction).toMatch(/covered spec point/i);
  });

  it('no pupil name appears anywhere in the assembled prompt (none is ever in scope)', () => {
    const all = `${GENERATE_ASSESSMENT_SYSTEM}\n${itemsText}\n${instruction}`;
    for (const name of ['Aisha Khan', 'Tom Duguid', 'PUPIL_1']) expect(all).not.toContain(name);
  });
});
