import { describe, expect, it } from 'vitest';
import { inferActivityType, parseTccPath } from '../src/services/referenceImport';

// Phase 17 — the pure structure parser + activity inference. Fixtures mirror the real TeachComputing tree.
describe('parseTccPath', () => {
  it('parses a KS3 lesson zip into key stage / year / unit / lesson', () => {
    const c = parseTccPath('KS3/year_7/unit_1/Lesson 2 basketball throw strength_v1.zip');
    expect(c.keyStage).toBe('KS3');
    expect(c.yearGroup).toBe(7);
    expect(c.unitFolder).toBe('unit_1');
    expect(c.unitKey).toBe('KS3:Y7:unit_1');
    expect(c.lessonNo).toBe(2);
    expect(c.kind).toBe('lesson');
  });

  it('classifies a unit guide / learning graph as a guide (no lesson number)', () => {
    expect(parseTccPath('KS3/year_7/unit_1/Unit guide_1_KS2 to 3 Transition project_Y7_v1.3.docx').kind).toBe('guide');
    expect(parseTccPath('KS3/year_7/unit_6/Learning graph – Programming essentials – Y7.pdf').kind).toBe('guide');
    expect(parseTccPath('KS3/year_7/unit_6/Learning graph – Programming essentials – Y7.pdf').lessonNo).toBeNull();
  });

  it('normalises GCSE and KS4_non_GCSE key stages', () => {
    expect(parseTccPath('GCSE/unit_3/Lesson 1 intro.pptx').keyStage).toBe('GCSE');
    expect(parseTccPath('KS4_non_GCSE/year_10/unit_2/Lesson 1.zip').keyStage).toBe('KS4_non_GCSE');
  });

  it('returns a null unitKey when the path lacks key stage or unit', () => {
    expect(parseTccPath('National curriculum comp.pdf').unitKey).toBeNull();
    expect(parseTccPath('KS3/KS3 TCC Curriculum Map_v1.1.xlsx').unitKey).toBeNull();
  });

  it('handles a non-lesson, non-guide file as "other"', () => {
    expect(parseTccPath('KS3/year_7/unit_1/answers.txt').kind).toBe('other');
  });
});

describe('inferActivityType', () => {
  it('maps lesson names to activity types by keyword', () => {
    expect(inferActivityType('Debug the broken countdown program')).toBe('debugging');
    expect(inferActivityType('Parsons problem — re-order the lines')).toBe('parsons');
    expect(inferActivityType('Unplugged card sort of network terms')).toBe('unplugged');
    expect(inferActivityType('Make a micro:bit animation project')).toBe('project');
    expect(inferActivityType('Trace this code and predict the output')).toBe('code_trace');
  });
  it('returns null when nothing matches', () => {
    expect(inferActivityType('A lesson about computers')).toBeNull();
  });
});
