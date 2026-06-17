import { describe, expect, it } from 'vitest';
import { markSchemeItems, MARK_SCHEME_SYSTEM, MARK_SCHEME_VERSION } from '../src/llm/prompts/markScheme';
import { MARK_ANSWERS_SYSTEM, MARK_ANSWERS_VERSION } from '../src/llm/prompts/markAnswers';
import { markField, type MarkPoint } from '../src/lib/deterministicMarker';

// The scheme deriver is AI-backed (covered elsewhere), but the prompt it builds is a pure function:
// a choice field must advertise its exact options so the model sets `expected` to one of them.
describe('markSchemeItems — field hints for the scheme deriver', () => {
  it('tags a choice field with its options, and text/check fields as written/checkbox', () => {
    const items = markSchemeItems({
      worksheetTitle: 'Quiz',
      worksheetMarkdown: '...',
      answersMarkdown: 'Q1: CPU',
      fields: [
        { key: 't1.r1.c2', label: 'Which part does calculations?', kindHint: 'choice', options: ['RAM', 'CPU', 'SSD'] },
        { key: 't1.r2.c2', label: 'Explain why.', kindHint: 'text' },
        { key: 'task.1', label: 'I checked my work', kindHint: 'check' },
      ],
    });
    const fieldsItem = items.find((i) => i.text.startsWith('FIELDS'))!;
    expect(fieldsItem.text).toContain('FIELD t1.r1.c2 [choice: RAM | CPU | SSD]: Which part does calculations?');
    expect(fieldsItem.text).toContain('FIELD t1.r2.c2 [written]: Explain why.');
    expect(fieldsItem.text).toContain('FIELD task.1 [checkbox]: I checked my work');
  });

  it('tags a fill-in-the-blank field so the AI marks it exact/keyword', () => {
    const items = markSchemeItems({
      worksheetTitle: 'Cloze',
      worksheetMarkdown: 'w',
      answersMarkdown: '1. calculations',
      fields: [{ key: 'blank.1', label: 'The CPU does [BLANK]', kindHint: 'blank' }],
    });
    expect(items.find((i) => i.text.startsWith('FIELDS'))!.text).toContain('FIELD blank.1 [fill-in-the-blank]: The CPU does [BLANK]');
  });

  it('includes the teacher answers as a separate context item when present', () => {
    const items = markSchemeItems({ worksheetTitle: 'Q', worksheetMarkdown: 'w', answersMarkdown: 'A: 42', fields: [] });
    expect(items.some((i) => i.text.includes('TEACHER ANSWERS') && i.text.includes('42'))).toBe(true);
  });
});

// B5.2 — OCR exam marking: the deriver advertises numeric calculations + levels-of-response banding,
// the open marker applies the banding, and the deterministic marker handles the conversion shapes.
describe('OCR exam marking guidance (B5.2)', () => {
  it('deriver prompt is @4 and instructs numeric calculations + hex-as-exact + levels-of-response', () => {
    expect(MARK_SCHEME_VERSION).toBe('mark_scheme@4');
    expect(MARK_SCHEME_SYSTEM).toMatch(/numeric/);
    expect(MARK_SCHEME_SYSTEM).toMatch(/HEXADECIMAL/);
    expect(MARK_SCHEME_SYSTEM).toMatch(/LEVELS-OF-RESPONSE/);
    expect(MARK_SCHEME_SYSTEM).toMatch(/Level 3 \(5–6\)/);
  });

  it('open marker prompt is @2 and applies levels-of-response banding', () => {
    expect(MARK_ANSWERS_VERSION).toBe('mark_answers@2');
    expect(MARK_ANSWERS_SYSTEM).toMatch(/LEVELS-OF-RESPONSE/);
    expect(MARK_ANSWERS_SYSTEM).toMatch(/within that band/i);
  });

  it('numeric marks a denary conversion (format-tolerant)', () => {
    const pts: MarkPoint[] = [{ id: 1, kind: 'numeric', expected: '26', alternatives: ['26 bytes'], marks: 1, required: true }];
    expect(markField(pts, '26').marksAwarded).toBe(1);
    expect(markField(pts, ' 26 ').marksAwarded).toBe(1);
    expect(markField(pts, '27').marksAwarded).toBe(0);
  });

  it('exact (not numeric) marks a hex conversion with case/prefix variants', () => {
    // 0x1A parses to 0 as a number, so hex MUST be exact — the deriver is told to do exactly this.
    const pts: MarkPoint[] = [{ id: 1, kind: 'exact', expected: '1A', alternatives: ['0x1A', '1a'], marks: 1, required: true }];
    expect(markField(pts, '1A').marksAwarded).toBe(1);
    expect(markField(pts, '0x1A').marksAwarded).toBe(1);
    expect(markField(pts, '1a').marksAwarded).toBe(1);
    expect(markField(pts, '1B').marksAwarded).toBe(0);
  });
});
