import { describe, expect, it } from 'vitest';
import { markSchemeItems } from '../src/llm/prompts/markScheme';

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
