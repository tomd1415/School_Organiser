import { describe, it, expect } from 'vitest';
import AdmZip from 'adm-zip';
import { safeRel, docxText, defaultTitle, buildStorePath } from '../src/services/resourceImport';

// The security-critical bit is path sanitisation: a malicious archive must never write outside the
// batch dir, and OS noise must be dropped before it reaches the review screen.
describe('resourceImport — safeRel (zip-slip + noise guard)', () => {
  it('keeps a clean nested path, normalising backslashes', () => {
    expect(safeRel('topic-A\\lesson 1\\work.pdf')).toBe('topic-A/lesson 1/work.pdf');
    expect(safeRel('a/b/c.pdf')).toBe('a/b/c.pdf');
    expect(safeRel('./a/./b.pdf')).toBe('a/b.pdf');
  });
  it('rejects directory traversal and absolute / drive paths', () => {
    expect(safeRel('../evil.txt')).toBeNull();
    expect(safeRel('a/../../etc/passwd')).toBeNull();
    expect(safeRel('/etc/passwd')).toBeNull();
    expect(safeRel('C:\\Windows\\system32')).toBeNull();
  });
  it('skips OS noise, dotfiles and empties', () => {
    expect(safeRel('__MACOSX/foo')).toBeNull();
    expect(safeRel('.DS_Store')).toBeNull();
    expect(safeRel('a/Thumbs.db')).toBeNull();
    expect(safeRel('.hidden/x.pdf')).toBeNull();
    expect(safeRel('')).toBeNull();
  });
});

describe('resourceImport — docxText', () => {
  it('pulls paragraph text out of a .docx and strips tags / entities', () => {
    const z = new AdmZip();
    z.addFile(
      'word/document.xml',
      Buffer.from('<w:body><w:p><w:r><w:t>Hello &amp; welcome</w:t></w:r></w:p><w:p><w:t>Line two</w:t></w:p></w:body>'),
    );
    const text = docxText(z.toBuffer());
    expect(text).toContain('Hello & welcome');
    expect(text).toContain('Line two');
    expect(text).not.toContain('<w:');
  });
  it('returns empty string for a buffer that is not a docx', () => {
    expect(docxText(Buffer.from('not a zip at all'))).toBe('');
  });
});

describe('resourceImport — defaultTitle', () => {
  it('drops the extension and tidies separators', () => {
    expect(defaultTitle('intro_worksheet-01.pdf')).toBe('intro worksheet 01');
    expect(defaultTitle('LESSON.pptx')).toBe('LESSON');
    expect(defaultTitle('noext')).toBe('noext');
  });
});

describe('resourceImport — buildStorePath (normalised year/unit/lesson path for convert-unit)', () => {
  it('prepends year group + unit name and keeps the lesson + filename', () => {
    expect(buildStorePath('Year 8', 'Unit 11: Networks', '8', '8/Lesson 1/slides.pptx')).toBe(
      'Year 8/Unit 11: Networks/Lesson 1/slides.pptx',
    );
  });
  it('turns a bare lesson-number folder into "Lesson N" so the unit is recognisable', () => {
    expect(buildStorePath('Year 7', 'Unit 3', '3', '3/2/worksheet.pdf')).toBe('Year 7/Unit 3/Lesson 2/worksheet.pdf');
  });
  it('falls back to the original path when there is no unit', () => {
    expect(buildStorePath('', '', '', 'readme.txt')).toBe('readme.txt');
  });
});
