import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages';
import { writeFileSync, mkdirSync } from 'node:fs';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS3/year_9/unit_1';
const out = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/imgs';
mkdirSync(out, { recursive: true });
const zips = ['L1 - Warm up_v1.1.zip','L2 - Playlist_v1.1.zip','L3 - In a while, crocodile_v1.1.zip','L4 - The famous for_v1.1.zip','L5 - Make a thing_v1.1.zip','L6 - Wrap up_v1.1.zip'];
for (let i = 0; i < zips.length; i++) {
  const ln = i + 1;
  const zip = new AdmZip(dir + '/' + zips[i]);
  const pptxEntry = zip.getEntries().find(e => /Slides.*\.pptx$/i.test(e.entryName));
  if (!pptxEntry) { console.log('L'+ln+' no slides pptx'); continue; }
  const imgs = extractOfficeImages(pptxEntry.getData(), 'slides.pptx');
  console.log('L'+ln+' images:', imgs.length);
  imgs.forEach(im => {
    const fn = `${out}/l${ln}-${im.name}`;
    writeFileSync(fn, im.bytes);
    console.log('   ', fn, im.bytes.length, im.ext);
  });
}
