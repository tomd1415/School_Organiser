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

describe('multiple-select ("tick all that apply")', () => {
  const md = `## Questions
| Question | Tick all the inputs |
|---|---|
| Which are micro:bit inputs? | [ ] buttons [ ] light sensor [ ] the screen |
| Pick one | ( ) yes ( ) no |
`;
  it('a "[ ] a [ ] b" cell becomes a multichoice field; "( ) a ( ) b" stays a single choice', () => {
    const fields = renderWorksheet(md, { mode: 'review' }).fields;
    expect(fields.map((f) => f.kind)).toEqual(['multichoice', 'choice']);
    expect(fields[0]!.options).toEqual(['buttons', 'light sensor', 'the screen']);
  });
  it('a table whose ONLY answer cells are multi-select is still an interactive answer table', () => {
    const multiOnly = `## Q
| Question | Tick all the inputs |
|---|---|
| Which are inputs? | [ ] buttons [ ] microphone [ ] the screen |
`;
    const fields = renderWorksheet(multiOnly, { mode: 'review' }).fields;
    expect(fields.map((f) => f.kind)).toEqual(['multichoice']);
  });
  it('does NOT mistake a "[[ ]]" fill-in-blank for multi-select', () => {
    const blanks = renderWorksheet('Fill: a [[ ]] repeats and needs a [[ ]] value.\n', { mode: 'review' }).fields;
    expect(blanks.every((f) => f.kind !== 'multichoice')).toBe(true);
  });
  it('form mode renders checkboxes + a hidden value the aggregator fills, and autosaves', () => {
    const html = renderWorksheet(md, { mode: 'form', action: '/me/answer?oc=5' }).html;
    expect(html).toContain('ws-multi-box');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('input[name=value]'); // the inline aggregator targets the hidden value
    expect(html).toContain('/me/answer?oc=5');
  });
  it('review mode shows the pupil\'s ticked set', () => {
    const html = renderWorksheet(md, { mode: 'review', values: new Map([['t1.r1.c2', 'buttons, light sensor']]) }).html;
    expect(html).toContain('☑'); // ticked
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

describe('Order / sequence (non-code)', () => {
  const steps = [
    'The message is split into packets',
    'Each packet gets the destination address',
    'The packets travel across the network',
    'The packets are reassembled in order',
  ];
  const md = `Put the packet's journey in order.\n\n\`\`\`order\n${steps.join('\n')}\n\`\`\`\n`;
  it('an ```order block becomes an order field carrying the correct sequence', () => {
    const fields = renderWorksheet(md, { mode: 'review' }).fields;
    expect(fields).toHaveLength(1);
    expect(fields[0]!.kind).toBe('order');
    expect(fields[0]!.key).toBe('order.1');
    expect(fields[0]!.solution).toEqual(steps);
  });
  it('form mode shows a PROSE reorder widget, jumbled (never the solution order, never <code>)', () => {
    const html = renderWorksheet(md, { mode: 'form', action: '/me/answer?oc=1' }).html;
    expect(html).toMatch(/ws-ordering-prose/);
    expect(html).toMatch(/ws-order-text/);
    expect(html).not.toMatch(/<code>/); // prose tiles, not monospaced code
    const shown = [...html.matchAll(/data-line="([^"]+)"/g)].map((m) => m[1]);
    expect(shown).toHaveLength(4);
    expect(shown).not.toEqual(steps); // shuffleStable guarantees a non-identity jumble
  });
  it("review mode shows the pupil's saved order as prose", () => {
    const values = new Map([['order.1', 'b\na']]);
    const html = renderWorksheet(md, { mode: 'review', values }).html;
    expect(html).toMatch(/ws-parsons-review/);
    expect(html).toContain('ws-order-text');
    expect(html).not.toContain('<code>'); // not code
  });
  it('parsons and order keep INDEPENDENT key counters (no renumber)', () => {
    const both = `## Order the code\n\n\`\`\`parsons\nx = 1\ny = 2\n\`\`\`\n\n| Q | A |\n|---|---|\n| name a step | Type your answer here |\n\n## Order the steps\n\n\`\`\`order\nfirst\nsecond\n\`\`\`\n`;
    const fields = renderWorksheet(both, { mode: 'review' }).fields;
    expect(fields.map((f) => [f.kind, f.key])).toEqual([
      ['parsons', 'parsons.1'],
      ['text', 't1.r1.c2'],
      ['order', 'order.1'],
    ]);
  });
  it('an order block respects level slices (and keys stay stable across slices)', () => {
    const lvl = `## 🟢 Support\n\n\`\`\`order\nstep one\nstep two\n\`\`\`\n\n## 🔴 Challenge\n\n\`\`\`order\nhard one\nhard two\nhard three\n\`\`\`\n`;
    const full = renderWorksheet(lvl, { mode: 'review' }).fields;
    expect(full.map((f) => f.key)).toEqual(['order.1', 'order.2']);
    const sup = renderWorksheet(lvl, { mode: 'preview', level: 'support' }).fields;
    expect(sup.map((f) => f.key)).toEqual(['order.1']); // only Support's, key unchanged
    const chl = renderWorksheet(lvl, { mode: 'preview', level: 'challenge' }).fields;
    expect(chl.map((f) => f.key)).toEqual(['order.2']); // Challenge's key is still .2, not renumbered to .1
  });
});

describe('Card sort (group items into categories)', () => {
  const md = `Sort each device into the right group.\n\n\`\`\`sort\nInput: button, microphone\nOutput: LED display, speaker\n\`\`\`\n`;
  it('a ```sort block becomes one `sort` field per item (options = categories, solution = correct group)', () => {
    const fields = renderWorksheet(md, { mode: 'review' }).fields;
    expect(fields.map((f) => [f.key, f.kind, f.label, f.solution?.[0]])).toEqual([
      ['sort.1.i1', 'sort', 'button', 'Input'],
      ['sort.1.i2', 'sort', 'microphone', 'Input'],
      ['sort.1.i3', 'sort', 'LED display', 'Output'],
      ['sort.1.i4', 'sort', 'speaker', 'Output'],
    ]);
    expect(fields[0]!.options).toEqual(['Input', 'Output']);
  });
  it('form mode shows the tray + a drop-zone per category, with per-item save URLs', () => {
    const html = renderWorksheet(md, { mode: 'form', action: '/me/answer?oc=1' }).html;
    expect(html).toMatch(/ws-sort-tray/);
    expect(html).toMatch(/data-cat="Input"/);
    expect(html).toMatch(/data-cat="Output"/);
    expect(html).toContain('key=sort.1.i1');
    // the correct grouping is NOT revealed: items live in the shuffled tray, category lists are empty
    expect(html).not.toMatch(/data-cat="Input"[^>]*>[\s\S]*?button/); // button isn't pre-placed in Input
  });
  it('review groups each item under the category the pupil chose', () => {
    const values = new Map([['sort.1.i1', 'Input'], ['sort.1.i3', 'Output']]);
    const html = renderWorksheet(md, { mode: 'review', values }).html;
    expect(html).toMatch(/ws-sort-review/);
    expect(html).toContain('button');
    expect(html).toContain('LED display');
  });
  it('sort respects level slices and keeps stable per-item keys', () => {
    const lvl = `## 🟢 Support\n\n\`\`\`sort\nFruit: apple\nVeg: carrot\n\`\`\`\n\n## 🔴 Challenge\n\n\`\`\`sort\nHardware: CPU\nSoftware: browser\n\`\`\`\n`;
    const full = renderWorksheet(lvl, { mode: 'review' }).fields.map((f) => f.key);
    expect(full).toEqual(['sort.1.i1', 'sort.1.i2', 'sort.2.i1', 'sort.2.i2']);
    const chl = renderWorksheet(lvl, { mode: 'preview', level: 'challenge' }).fields.map((f) => f.key);
    expect(chl).toEqual(['sort.2.i1', 'sort.2.i2']); // Challenge's keys unchanged, not renumbered to .1
  });
});

describe('Slider / rating scale', () => {
  const md = `| Question | Your rating |\n|---|---|\n| How confident are you with loops? | [scale 1-5: not sure … very confident] |\n`;
  it('a [scale a-b] cell becomes a scale field on the normal table-cell key', () => {
    const fields = renderWorksheet(md, { mode: 'review' }).fields;
    expect(fields).toHaveLength(1);
    expect(fields[0]!.kind).toBe('scale');
    expect(fields[0]!.key).toBe('t1.r1.c2');
    expect(fields[0]!.scale).toEqual({ min: 1, max: 5, minLabel: 'not sure', maxLabel: 'very confident' });
  });
  it('form mode renders a range input with the min/max + end labels and autosaves', () => {
    const html = renderWorksheet(md, { mode: 'form', action: '/me/answer?oc=1' }).html;
    expect(html).toMatch(/type="range"/);
    expect(html).toMatch(/min="1"/);
    expect(html).toMatch(/max="5"/);
    expect(html).toContain('key=t1.r1.c2');
    expect(html).toContain('not sure');
    expect(html).toContain('very confident');
  });
  it('review shows the saved number', () => {
    const html = renderWorksheet(md, { mode: 'review', values: new Map([['t1.r1.c2', '4']]) }).html;
    expect(html).toMatch(/ws-scale-review/);
    expect(html).toContain('4');
  });
  it('a bare [scale 1-3] (no end labels) parses in a body row', () => {
    const m2 = `| Question | Answer |\n|---|---|\n| Rate the lesson | [scale 1-3] |\n`;
    const f = renderWorksheet(m2, { mode: 'review' }).fields;
    expect(f).toHaveLength(1);
    expect(f[0]!.kind).toBe('scale');
    expect(f[0]!.scale).toEqual({ min: 1, max: 3, minLabel: undefined, maxLabel: undefined });
  });
  it('a malformed [scale 5-5] (max<=min) is not treated as a scale', () => {
    const bad = `| Question | Answer |\n|---|---|\n| Rate it | [scale 5-5] |\n`;
    const f = renderWorksheet(bad, { mode: 'review' }).fields;
    expect(f.every((x) => x.kind !== 'scale')).toBe(true);
  });
});

describe('Label a diagram', () => {
  const md = `Label the board.\n\n\`\`\`label\nimage: /resources/42/view\nA (20%, 60%): button A\nB (80%, 60%): button B\nUSB (50%, 8%): USB connector\n\`\`\`\n`;
  it('a ```label block becomes one `label` field per zone (options = the bank, solution = correct)', () => {
    const fields = renderWorksheet(md, { mode: 'review' }).fields;
    expect(fields.map((f) => [f.key, f.kind, f.label, f.solution?.[0]])).toEqual([
      ['label.1.z1', 'label', 'A', 'button A'],
      ['label.1.z2', 'label', 'B', 'button B'],
      ['label.1.z3', 'label', 'USB', 'USB connector'],
    ]);
    expect(fields[0]!.options).toEqual(['button A', 'button B', 'USB connector']); // sorted bank (localeCompare)
  });
  it('form mode positions a matching-slot per zone over the image, with per-zone save URLs', () => {
    const html = renderWorksheet(md, { mode: 'form', action: '/me/answer?oc=1' }).html;
    expect(html).toMatch(/ws-label-stage/);
    expect(html).toContain('src="/resources/42/view"');
    expect(html).toMatch(/ws-match-slot[^>]*style="left:20%;top:60%"/);
    expect(html).toContain('key=label.1.z1');
    expect(html).toMatch(/ws-match-tile/); // the shuffled label bank reuses matching tiles
  });
  it('review shows each placed label at its spot; nothing reveals the answer in form mode', () => {
    const html = renderWorksheet(md, { mode: 'review', values: new Map([['label.1.z1', 'button A']]) }).html;
    expect(html).toMatch(/ws-label-review/);
    expect(html).toContain('button A');
    // form mode must NOT pre-place the correct label inside a slot
    const formHtml = renderWorksheet(md, { mode: 'form', action: '/me/answer' }).html;
    const stage = formHtml.slice(formHtml.indexOf('ws-label-stage'), formHtml.indexOf('ws-match-tray'));
    expect(stage).not.toContain('ws-match-placed');
  });
  it('a label block with <2 zones or no image is ignored (renders inert markdown, no fields)', () => {
    const noImg = `\`\`\`label\nA (10%, 10%): one\nB (20%, 20%): two\n\`\`\`\n`;
    expect(renderWorksheet(noImg, { mode: 'review' }).fields).toHaveLength(0);
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
