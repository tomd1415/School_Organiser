import { describe, it, expect } from 'vitest';
import { buildMaterialText, isTextBearing, readUseMaterials } from '../src/services/lessonMaterials';
import { lessonMaterialItems } from '../src/llm/prompts/lessonResources';

describe('lessonMaterials — buildMaterialText (capping is pure + testable)', () => {
  it('joins each file under its title and reports what was included', () => {
    const r = buildMaterialText([
      { title: 'intro.pptx', text: 'CPU fetches, decodes, executes.' },
      { title: 'tasks.docx', text: 'Define RAM and ROM.' },
    ]);
    expect(r.text).toContain('— intro.pptx —');
    expect(r.text).toContain('CPU fetches');
    expect(r.text).toContain('— tasks.docx —');
    expect(r.truncated).toBe(false);
    expect(r.files).toEqual([
      { title: 'intro.pptx', chars: 'CPU fetches, decodes, executes.'.length },
      { title: 'tasks.docx', chars: 'Define RAM and ROM.'.length },
    ]);
  });

  it('drops empty / whitespace-only files entirely', () => {
    const r = buildMaterialText([
      { title: 'blank.pdf', text: '   \n  ' },
      { title: 'real.md', text: 'binary is base 2' },
    ]);
    expect(r.files.map((f) => f.title)).toEqual(['real.md']);
    expect(r.text).not.toContain('blank.pdf');
  });

  it('caps per file and marks truncated', () => {
    const big = 'x'.repeat(50);
    const r = buildMaterialText([{ title: 'big.pdf', text: big }], 10, 100);
    expect(r.files[0]).toEqual({ title: 'big.pdf', chars: 10 });
    expect(r.truncated).toBe(true);
  });

  it('caps the total across files and stops once full', () => {
    const r = buildMaterialText(
      [
        { title: 'a.pdf', text: 'a'.repeat(8) },
        { title: 'b.pdf', text: 'b'.repeat(8) },
        { title: 'c.pdf', text: 'c'.repeat(8) },
      ],
      8, // per-file
      16, // total — only the first two fit
    );
    expect(r.files.map((f) => f.title)).toEqual(['a.pdf', 'b.pdf']);
    expect(r.truncated).toBe(true);
  });

  it('empty input ⇒ empty text, nothing truncated', () => {
    const r = buildMaterialText([]);
    expect(r.text).toBe('');
    expect(r.files).toEqual([]);
    expect(r.truncated).toBe(false);
  });
});

describe('lessonMaterials — isTextBearing', () => {
  it('accepts office / pdf / plain extensions, rejects images and unknowns', () => {
    for (const f of ['a.pdf', 'b.docx', 'c.pptx', 'd.odt', 'e.txt', 'f.md', 'g.csv']) expect(isTextBearing(f)).toBe(true);
    for (const f of ['x.png', 'y.jpg', 'z.zip', 'noext']) expect(isTextBearing(f)).toBe(false);
  });
});

describe('lessonMaterials — readUseMaterials consent (B4)', () => {
  it('no field at all ⇒ ON (existing surfaces / buttons without the control are unchanged)', () => {
    expect(readUseMaterials(undefined)).toBe(true);
    expect(readUseMaterials({})).toBe(true);
    expect(readUseMaterials(null)).toBe(true);
  });

  it('checked box ⇒ ON (paired hidden "0" + checkbox "1" arrive together)', () => {
    expect(readUseMaterials({ use_materials: ['0', '1'] })).toBe(true);
    expect(readUseMaterials({ use_materials: ['1', '0'] })).toBe(true);
    expect(readUseMaterials({ use_materials: '1' })).toBe(true);
  });

  it('unchecked box ⇒ OFF (only the hidden "0" is posted)', () => {
    expect(readUseMaterials({ use_materials: '0' })).toBe(false);
    expect(readUseMaterials({ use_materials: ['0'] })).toBe(false);
  });
});

describe('lessonMaterials — lessonMaterialItems prompt helper (B2)', () => {
  it('empty material ⇒ NO context item (generation unchanged when there are no materials)', () => {
    expect(lessonMaterialItems('')).toEqual([]);
    expect(lessonMaterialItems('   \n ')).toEqual([]);
  });

  it('non-empty ⇒ one item that instructs the model to build on the real content', () => {
    const items = lessonMaterialItems('— deck.pptx —\nThe CPU has an ALU and CU.');
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('LESSON MATERIALS ALREADY PREPARED');
    expect(items[0]!.text).toContain('The CPU has an ALU and CU.');
    expect(items[0]!.safeguarding).toBeUndefined(); // rides context[] like any input; no special flag
  });
});
