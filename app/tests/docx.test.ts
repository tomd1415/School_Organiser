import { describe, expect, it } from 'vitest';
import { markdownToDocx } from '../src/lib/docx';

describe('markdownToDocx (pupil-completable Word export)', () => {
  const md = '# Sheet\n\n| Q | Type your answer here |\n|---|---|\n| What is RAM? | |\n\n- [ ] checked\n\n**bold** and *italic*';
  const buf = markdownToDocx(md);

  it('produces a valid ZIP container with the three required parts', () => {
    expect(buf.subarray(0, 4).toString('latin1')).toBe('PK\x03\x04');
    const s = buf.toString('latin1');
    expect(s).toContain('[Content_Types].xml');
    expect(s).toContain('_rels/.rels');
    expect(s).toContain('word/document.xml');
    expect(s.endsWith('PK\x05\x06') || s.includes('PK\x05\x06')).toBe(true); // EOCD present
  });

  it('carries the content: heading, table, task box, formatting', () => {
    const s = buf.toString('utf8');
    expect(s).toContain('Sheet');
    expect(s).toContain('<w:tbl>');
    expect(s).toContain('What is RAM?');
    expect(s).toContain('☐');
    expect(s).toContain('<w:b/>');
    expect(s).toContain('<w:i/>');
  });

  it('escapes XML-significant characters', () => {
    const s = markdownToDocx('5 < 6 & 7 > 2').toString('utf8');
    expect(s).toContain('5 &lt; 6 &amp; 7 &gt; 2');
  });
});
