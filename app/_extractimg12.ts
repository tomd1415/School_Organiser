import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages';
import { writeFileSync, mkdirSync } from 'node:fs';
const DIR = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/GCSE/unit_12';
const OUT = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/img';
mkdirSync(OUT, { recursive: true });
const zips = [
  ['L8 – Hosting services.zip', 'l8'],
  ['L9 – Protocols.zip', 'l9'],
  ['L10 – The TCP IP model.zip', 'l10'],
  ['L11 – The OSI model.zip', 'l11'],
  ['L12 – Protecting a network.zip', 'l12'],
];
for (const [z, tag] of zips) {
  mkdirSync(`${OUT}/${tag}`, { recursive: true });
  const lz = new AdmZip(`${DIR}/${z}`);
  const pptxE = lz.getEntries().find(e => /Slides.*\.pptx$/i.test(e.entryName));
  if (!pptxE) { console.log(tag, 'no pptx'); continue; }
  const imgs = extractOfficeImages(pptxE.getData(), 'slides.pptx');
  console.log(tag, 'images:', imgs.map(i => `${i.name}:${i.bytes.length}`).join(' '));
  for (const im of imgs) {
    writeFileSync(`${OUT}/${tag}/${im.name}`, im.bytes);
  }
}
console.log('done');
