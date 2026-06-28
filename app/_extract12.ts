import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';
import { writeFileSync, mkdirSync } from 'node:fs';

const DIR = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/GCSE/unit_12';
const OUT = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/src';
mkdirSync(OUT, { recursive: true });

const targets = [
  'L8 – Hosting services.zip',
  'L9 – Protocols.zip',
  'L10 – The TCP IP model.zip',
  'L11 – The OSI model.zip',
  'L12 – Protecting a network.zip',
  'L13 – Summative assessment.zip',
];

// Unit guide
try {
  const ug = new AdmZip(`${DIR}/Unit guide_12_Computer networks_KS4_v1.2.docx`);
  // it's a docx itself
} catch {}
import { readFileSync } from 'node:fs';
const ugBuf = readFileSync(`${DIR}/Unit guide_12_Computer networks_KS4_v1.2.docx`);
writeFileSync(`${OUT}/_unitguide.txt`, docxText(ugBuf));

for (const t of targets) {
  const zip = new AdmZip(`${DIR}/${t}`);
  const lines: string[] = [`### LESSON ZIP: ${t}`, ''];
  for (const e of zip.getEntries()) lines.push('ENTRY: ' + e.entryName);
  lines.push('\n========================================\n');
  for (const e of zip.getEntries()) {
    if (/\.docx$/i.test(e.entryName)) {
      lines.push(`\n\n##### FILE: ${e.entryName}\n`);
      try { lines.push(docxText(e.getData())); } catch (err) { lines.push('ERR ' + err); }
    }
  }
  const safe = t.replace(/[^a-z0-9]+/gi, '_');
  writeFileSync(`${OUT}/${safe}.txt`, lines.join('\n'));
  console.log('wrote', safe);
}
console.log('done');
