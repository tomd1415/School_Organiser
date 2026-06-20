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

  // BUG-049: pdfjs upgraded to v4 (ESM legacy build, loaded via a runtime dynamic import) to drop the
  // vulnerable tar chain. Prove text extraction still works end-to-end on a real PDF.
  it('extracts text from a real PDF (pdfjs v4 dynamic-import path)', async () => {
    const pdf = Buffer.from(
      [
        '%PDF-1.4',
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
        '4 0 obj << /Length 47 >>',
        'stream',
        'BT /F1 24 Tf 72 700 Td (Hello PDF world) Tj ET',
        'endstream endobj',
        '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
        'trailer << /Root 1 0 R /Size 6 >>',
        '%%EOF',
      ].join('\n'),
      'latin1',
    );
    expect(await extractDocText(pdf, 'note.pdf')).toContain('Hello PDF world');
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
