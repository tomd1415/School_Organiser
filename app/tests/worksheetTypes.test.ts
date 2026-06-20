import { describe, it, expect } from 'vitest';
import { renderWorksheet } from '../src/lib/worksheetForm';

// New question types (code-writing box, Parson's Problems) + per-worksheet key prefix (multiple
// worksheets per lesson). The grammar is pupil-critical, so these lock the new behaviour in.

describe('code-writing answer box', () => {
  const md = `## Questions
| Question | Your answer |
|---|---|
| What does this code output? | Type your answer here |
| Modify the loop to count to 10. | Type your code here |
`;
  it('an answer cell naming code becomes a code field; a normal answer stays text', () => {
    const fields = renderWorksheet(md, { mode: 'review' }).fields;
    expect(fields.map((f) => f.kind)).toEqual(['text', 'code']);
    expect(fields[1]!.label).toBe('Modify the loop to count to 10.'); // label = the question prompt
  });
  it('a question prompt that merely MENTIONS code does not become an input', () => {
    const fields = renderWorksheet(`## Q\n| Explain what this code does. | Type your answer here |\n|---|---|\n`, { mode: 'review' }).fields;
    expect(fields).toHaveLength(1);
    expect(fields[0]!.kind).toBe('text');
  });
  it('form mode renders a monospaced code textarea', () => {
    expect(renderWorksheet(md, { mode: 'form', action: '/me/answer?oc=1' }).html).toMatch(/ws-code-input/);
  });
});

describe("Parson's Problems", () => {
  const md = `Put the lines in order to count to 3.

\`\`\`parsons
for i in range(1, 4):
    print(i)
\`\`\`
`;
  it('a ```parsons block becomes a parsons field carrying the correct order (the solution)', () => {
    const fields = renderWorksheet(md, { mode: 'review' }).fields;
    expect(fields).toHaveLength(1);
    expect(fields[0]!.kind).toBe('parsons');
    expect(fields[0]!.solution).toEqual(['for i in range(1, 4):', '    print(i)']);
    expect(fields[0]!.label).toContain('order'); // the prose before it
  });
  it('form mode shows the reorder widget but never reveals the solution ORDER', () => {
    const html = renderWorksheet(md, { mode: 'form', action: '/me/answer?oc=1' }).html;
    expect(html).toMatch(/ws-parsons-wrap/);
    // the lines are present but jumbled (the hash-shuffle puts print() before the for-loop here)
    expect(html.indexOf('print(i)')).toBeLessThan(html.indexOf('for i in range'));
  });
  it('review mode shows the pupil\'s saved order', () => {
    const values = new Map([['parsons.1', 'a\nb\nc']]);
    const html = renderWorksheet(md, { mode: 'review', values }).html;
    expect(html).toMatch(/ws-parsons-review/);
    expect(html).toContain('<code>a</code>');
  });
});

describe('per-worksheet key prefix (multiple worksheets)', () => {
  const md = `## Q
| Question | Your answer |
|---|---|
| What is a variable? | Type your answer here |

- [ ] I answered

The CPU does [[ ]].
`;
  it('the default (no prefix) is unchanged — backward compatible', () => {
    const keys = renderWorksheet(md, { mode: 'review' }).fields.map((f) => f.key);
    expect(keys).toEqual(['t1.r1.c2', 'task.1', 'blank.1']);
  });
  it('a prefix is prepended to every field key (and nothing else changes)', () => {
    const a = renderWorksheet(md, { mode: 'review' }).fields;
    const b = renderWorksheet(md, { mode: 'review', keyPrefix: 'w2.' }).fields;
    expect(b.map((f) => f.key)).toEqual(['w2.t1.r1.c2', 'w2.task.1', 'w2.blank.1']);
    expect(b.map((f) => f.kind)).toEqual(a.map((f) => f.kind)); // kinds/labels identical
  });
  it('prefixed keys flow into the save URLs in form mode', () => {
    const html = renderWorksheet(md, { mode: 'form', action: '/me/answer?oc=1', keyPrefix: 'w1.' }).html;
    expect(html).toContain('key=w1.t1.r1.c2');
  });
});
