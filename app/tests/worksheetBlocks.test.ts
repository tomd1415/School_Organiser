import { describe, expect, it } from 'vitest';
import { parseBlocks, serialiseBlocks, blocksSchema, type Block } from '../src/lib/worksheetBlocks';
import { renderWorksheet } from '../src/lib/worksheetForm';

// THE CONTRACT (marking safety): a Markdown → blocks → Markdown round-trip must not change the
// worksheet's field keys/kinds. renderWorksheet().fields is the oracle.
const fieldSig = (md: string): string =>
  renderWorksheet(md, { mode: 'review' }).fields
    .map((f) => `${f.key}:${f.kind}`)
    .join('|');

const roundTrip = (md: string): string => serialiseBlocks(parseBlocks(md));

describe('worksheetBlocks — round-trip preserves field keys (marking safety)', () => {
  const SHEET = `# Photosynthesis worksheet

| Name | Type your name here |
|------|---------------------|
| Date | Type the date here |

## Instructions
Type your answers in the boxes.

## 🟢 Support

| Question | Type your answer here |
|----------|----------------------|
| What gas do plants take in? | |
| Show your diagram | 📷 Paste a screenshot here |

## 🟡 Core

| Question | Type your answer here |
|----------|----------------------|
| Name the green chemical. | |

> Remember to save your work.

## ✅ Success checklist
- [ ] I typed my name
- [ ] I answered every question
`;

  it('the field signature is identical before and after a round-trip', () => {
    const before = fieldSig(SHEET);
    const after = fieldSig(roundTrip(SHEET));
    expect(after).toBe(before);
    expect(before).not.toBe(''); // sanity: there ARE fields
  });

  it('a screenshot answer cell stays an image field through the round-trip', () => {
    const sig = fieldSig(roundTrip(SHEET));
    expect(sig).toContain(':image'); // the "📷 Paste a screenshot here" cell
    expect(sig).toContain(':check'); // the checklist
    expect((sig.match(/:text/g) ?? []).length).toBeGreaterThanOrEqual(3); // name, date, 2 questions
  });

  it('the name/date layout-A table is kept verbatim (not mangled into a Q&A table)', () => {
    const blocks = parseBlocks(SHEET);
    expect(blocks.some((b) => b.type === 'rawtable')).toBe(true); // name/date survives as rawtable
    // and its two header-as-data answer keys survive
    expect(fieldSig(roundTrip(SHEET))).toContain('t1.r0.c2:text');
  });

  it('a code fence is preserved verbatim (raw block)', () => {
    const md = `# Code\n\n\`\`\`python\nprint("# not a heading")\n| not a table |\n\`\`\`\n\n| Q | Type your answer here |\n|---|---|\n| Why? | |\n`;
    expect(fieldSig(roundTrip(md))).toBe(fieldSig(md));
    expect(parseBlocks(md).some((b) => b.type === 'raw')).toBe(true);
  });

  it('multiple-choice and true/false cells stay choice fields with the same keys', () => {
    const md = `## 🟢 Support

| Question | Type your answer here |
|---|---|
| Which part does calculations? | ( ) RAM ( ) CPU ( ) SSD |
| True or false: the CPU has cores. | ( ) True ( ) False |
`;
    expect(fieldSig(roundTrip(md))).toBe(fieldSig(md));
    expect((fieldSig(md).match(/:choice/g) ?? []).length).toBe(2);
  });
});

describe('worksheetBlocks — parse classifies blocks', () => {
  it('recognises headings, qtable, screenshot rows, checklist, note, image, placeholder', () => {
    const md = `# Title

Do this first.

| Question | Type your answer here |
|---|---|
| First? | |
| Show it | 📷 Paste a screenshot here |

> a key idea

![diagram](/resources/9/view)

> 🖼️ [show: a flowchart]

- [ ] done it
`;
    const b = parseBlocks(md);
    const types = b.map((x) => x.type);
    expect(types).toContain('heading');
    expect(types).toContain('text');
    expect(types).toContain('qtable');
    expect(types).toContain('note');
    expect(types).toContain('image');
    expect(types).toContain('placeholder');
    expect(types).toContain('checklist');
    const qt = b.find((x) => x.type === 'qtable') as Extract<Block, { type: 'qtable' }>;
    expect(qt.rows).toHaveLength(2);
    expect(qt.rows[1]!.kind).toBe('screenshot');
    const ph = b.find((x) => x.type === 'placeholder') as Extract<Block, { type: 'placeholder' }>;
    expect(ph.desc).toBe('a flowchart');
  });

  it('blocksSchema validates a parsed document (so the editor can post it back safely)', () => {
    const b = parseBlocks(`# T\n\n| Q | Type your answer here |\n|---|---|\n| Why? | |\n`);
    expect(blocksSchema.safeParse(b).success).toBe(true);
  });

  it('parses a multiple-choice answer cell into a choice row with options', () => {
    const b = parseBlocks(`| Question | Type your answer here |\n|---|---|\n| Which is volatile? | ( ) RAM ( ) ROM |\n`);
    const qt = b.find((x) => x.type === 'qtable') as Extract<Block, { type: 'qtable' }>;
    expect(qt).toBeTruthy();
    expect(qt.rows[0]!.kind).toBe('choice');
    expect(qt.rows[0]!.options).toEqual(['RAM', 'ROM']);
  });

  it('serialises a choice row back to "( ) option" cells', () => {
    const md = serialiseBlocks([{ type: 'qtable', rows: [{ q: 'Pick the CPU', kind: 'choice', options: ['RAM', 'CPU', 'SSD'] }] }]);
    expect(md).toContain('| Pick the CPU | ( ) RAM ( ) CPU ( ) SSD |');
    expect(fieldSig(md)).toContain(':choice');
  });

  it('captures a choice table even when the header is not the canonical "type here"', () => {
    const b = parseBlocks(`| Question | Answer |\n|---|---|\n| Pick one | ( ) a ( ) b |\n`);
    expect(b.some((x) => x.type === 'qtable')).toBe(true);
  });

  it('an edited block list serialises to the canonical answer-table shape', () => {
    const md = serialiseBlocks([
      { type: 'heading', depth: 2, text: '🟢 Support' },
      { type: 'text', text: 'Open Thonny.' },
      { type: 'qtable', rows: [{ q: 'What is a list?', kind: 'text' }, { q: 'Screenshot your code', kind: 'screenshot' }] },
      { type: 'checklist', items: ['I ran it'] },
    ]);
    expect(md).toContain('## 🟢 Support');
    expect(md).toContain('| What is a list? |  |');
    expect(md).toContain('📷 Paste a screenshot here');
    expect(md).toContain('- [ ] I ran it');
    // and it renders to a text + an image field
    const sig = fieldSig(md);
    expect(sig).toContain(':text');
    expect(sig).toContain(':image');
    expect(sig).toContain(':check');
  });
});
