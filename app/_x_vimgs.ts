import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages';
import fs from 'fs';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS2/Year_5/Unit 5 Introductio to vectors';
const out = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/imgs';
fs.mkdirSync(out, { recursive: true });

const zips = fs.readdirSync(dir).filter(f => /^L\d.*\.zip$/i.test(f)).sort();
for (const z of zips) {
  const lnum = z.match(/^L(\d)/)![1];
  const zip = new AdmZip(dir + '/' + z);
  for (const e of zip.getEntries()) {
    if (/\.(mp4|webm|mov)$/i.test(e.entryName)) {
      console.log(`L${lnum} VIDEO ${e.entryName} ${(e.header.size/1e6).toFixed(1)}MB`);
    }
  }
  const pptxE = zip.getEntries().find(e => /Slides.*\.pptx$/i.test(e.entryName));
  if (!pptxE) { console.log(`L${lnum}: no slides pptx`); continue; }
  const imgs = extractOfficeImages(pptxE.getData(), 'slides.pptx');
  console.log(`\nL${lnum}: ${imgs.length} images`);
  imgs.forEach((im, i) => {
    const ext = im.ext.toLowerCase();
    const name = `L${lnum}_${String(i).padStart(2,'0')}.${ext}`;
    fs.writeFileSync(out + '/' + name, im.bytes);
    console.log(`  ${name} ${(im.bytes.length/1024).toFixed(0)}KB ${im.name}`);
  });
}
console.log('\nDONE -> ' + out);
