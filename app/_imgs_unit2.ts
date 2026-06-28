import AdmZip from 'adm-zip';
import { writeFileSync, mkdirSync } from 'node:fs';

const DIR = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/GCSE/unit_2';
const OUT = process.argv[3];
const target = process.argv[2];
mkdirSync(OUT, { recursive: true });

const lessonZip = new AdmZip(`${DIR}/${target}`);
const pptxEntry = lessonZip.getEntries().find(e => /Slides.*\.pptx$/i.test(e.entryName) || /\.pptx$/i.test(e.entryName));
if (!pptxEntry) { console.log('NO PPTX'); process.exit(0); }
const pptx = new AdmZip(pptxEntry.getData());
const media = pptx.getEntries().filter(e => /ppt\/media\//i.test(e.entryName) && /\.(png|jpe?g|gif|emf|wmf)$/i.test(e.entryName));
for (const m of media) {
  const name = m.entryName.split('/').pop()!;
  const data = m.getData();
  writeFileSync(`${OUT}/${name}`, data);
  console.log(`${name}\t${data.length}`);
}
