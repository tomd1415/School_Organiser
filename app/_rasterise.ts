// Phase-0 sweep tool: rasterise source Office slides/pages to PNG (captures VECTOR-shape diagrams that
// extractOfficeImages can't). Route: Office --Gotenberg--> PDF --pdf-to-img--> PNG.
// Usage: GOTENBERG_URL=http://localhost:3001 npx tsx _rasterise.ts <file.pptx|file.docx|lesson.zip> <pages|all> <outDir> [scale]
//   pages: "all" or a comma list like "8,9,12" (1-based, matches the slide/page number)
import AdmZip from 'adm-zip';
import { convertToPdf } from './src/lib/officePreview';
import { pdf } from 'pdf-to-img';
import * as fs from 'fs';
import * as path from 'path';

const inPath = process.argv[2]!;
const pagesArg = (process.argv[3] ?? 'all').trim();
const outDir = process.argv[4]!;
const scale = Number(process.argv[5] ?? '2');
fs.mkdirSync(outDir, { recursive: true });

// If given a lesson .zip, pull the Slides .pptx out of it (fall back to any pptx, else docx).
function officeBuffer(p: string): { buf: Buffer; name: string } {
  if (/\.zip$/i.test(p)) {
    const zip = new AdmZip(p);
    const entries = zip.getEntries();
    const pick =
      entries.find((e) => /Slides.*\.pptx$/i.test(e.entryName)) ??
      entries.find((e) => /\.pptx$/i.test(e.entryName)) ??
      entries.find((e) => /\.docx$/i.test(e.entryName));
    if (!pick) throw new Error('no .pptx/.docx inside the zip');
    return { buf: pick.getData(), name: path.basename(pick.entryName) };
  }
  return { buf: fs.readFileSync(p), name: path.basename(p) };
}

(async () => {
  const { buf, name } = officeBuffer(inPath);
  console.log(`source: ${name} (${Math.round(buf.length / 1024)}k)`);
  const pdfBuf = await convertToPdf(buf, name);
  if (!pdfBuf) { console.error('❌ convertToPdf returned null — is GOTENBERG_URL set + the sidecar up?'); process.exit(1); }
  console.log(`pdf: ${Math.round(pdfBuf.length / 1024)}k`);

  const doc = await pdf(pdfBuf, { scale });
  console.log(`pages: ${doc.length}`);
  const want = pagesArg.toLowerCase() === 'all'
    ? Array.from({ length: doc.length }, (_, i) => i + 1)
    : pagesArg.split(',').map((s) => Number(s.trim())).filter((n) => n >= 1 && n <= doc.length);

  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  for (const n of want) {
    const page = await doc.getPage(n); // 1-based, returns a PNG Buffer
    const out = path.join(outDir, `${base}-p${String(n).padStart(2, '0')}.png`);
    fs.writeFileSync(out, page);
    console.log(`  ✓ p${n} → ${path.basename(out)} (${Math.round(page.length / 1024)}k)`);
  }
  console.log(`done → ${outDir}`);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
