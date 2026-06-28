import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages';
import * as fs from 'fs';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS2/Year_5/Unit 4 Flat-file databases';
const out = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/imgs';
fs.mkdirSync(out, { recursive: true });

const zips = fs.readdirSync(dir).filter(f => /^L\d/i.test(f) && f.endsWith('.zip')).sort();
for (const z of zips) {
  const Lnum = z.match(/^L(\d)/i)![1];
  const zip = new AdmZip(dir + '/' + z);
  const pptxEntry = zip.getEntries().find(e => /Slides.*\.pptx$/i.test(e.entryName));
  if (!pptxEntry) { console.log('no pptx', z); continue; }
  const imgs = extractOfficeImages(pptxEntry.getData(), 'slides.pptx');
  console.log(`L${Lnum}: ${imgs.length} images`);
  imgs.forEach((im, i) => {
    const name = `L${Lnum}_${String(i).padStart(2,'0')}_${im.name.replace(/[^a-z0-9.]/gi,'_')}`;
    fs.writeFileSync(out + '/' + name, im.bytes);
    console.log(`  ${name} ${im.mime} ${im.bytes.length}`);
  });
}
