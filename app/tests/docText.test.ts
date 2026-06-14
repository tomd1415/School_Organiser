import { describe, it, expect } from 'vitest';
import { extractDocText } from '../src/lib/docText';
import { courseDocItems } from '../src/llm/prompts/courseDocs';

describe('extractDocText (idea 9)', () => {
  it('reads plain-text files directly', async () => {
    expect(await extractDocText(Buffer.from('hello world'), 'notes.txt')).toBe('hello world');
    expect(await extractDocText(Buffer.from('# heading'), 'a.md')).toBe('# heading');
  });

  it('returns "" for an unsupported type (so the teacher pastes the text instead)', async () => {
    expect(await extractDocText(Buffer.from('x'), 'a.zip')).toBe('');
    expect(await extractDocText(Buffer.from('x'), 'noext')).toBe('');
  });
});

describe('courseDocItems (idea 9)', () => {
  it('caps each doc, labels by role, and drops empty docs', () => {
    const items = courseDocItems(
      [
        { role: 'spec', title: 'J277', content: 'A'.repeat(10000) },
        { role: 'reference', title: 'blank', content: '   ' },
      ],
      6000,
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('OFFICIAL SPECIFICATION — J277');
    expect(items[0]!.text).toContain('A'.repeat(6000)); // content kept up to the cap
    expect(items[0]!.text).not.toContain('A'.repeat(6001)); // ...and no further
  });

  it('returns [] when there are no docs', () => {
    expect(courseDocItems([])).toEqual([]);
  });
});
