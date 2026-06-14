// Phase 11 idea 9 — extract plain text from an uploaded course document so the AI can reference it.
// PDFs via pdfjs (v3 CJS legacy build, fake worker in Node); .txt/.md/.csv read directly; Office files
// routed through the existing Gotenberg sidecar (→ PDF) then pdfjs. Returns '' if it can't extract —
// the teacher then pastes/edits the text (extraction is ALWAYS previewed before the AI uses it).
import { convertToPdf } from './officePreview';

// pdfjs-dist v3's ESM main clashes with this CommonJS build; the legacy build is plain CJS and
// require()s cleanly. No published types for the subpath, so it's loaded untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires
const pdfjs: any = require('pdfjs-dist/legacy/build/pdf.js');

const OFFICE = new Set(['doc', 'docx', 'ppt', 'pptx', 'odt', 'odp', 'rtf']);
const PLAIN = new Set(['txt', 'md', 'markdown', 'csv', 'text']);

export async function extractPdfText(buf: Buffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push((content.items as Array<{ str?: string }>).map((it) => it.str ?? '').join(' '));
    page.cleanup();
  }
  await doc.destroy();
  return parts.join('\n\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** Best-effort plain-text from an uploaded file. Empty string means "couldn't extract — paste it". */
export async function extractDocText(buf: Buffer, filename: string): Promise<string> {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  if (PLAIN.has(ext)) return buf.toString('utf8').trim();
  if (ext === 'pdf') return extractPdfText(buf).catch(() => '');
  if (OFFICE.has(ext)) {
    const pdf = await convertToPdf(buf, filename);
    return pdf ? extractPdfText(pdf).catch(() => '') : '';
  }
  return '';
}
