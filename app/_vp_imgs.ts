import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages';
import * as fs from 'fs';

const base = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS2/Year_5/Unit 2 Video Production';
const out = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/imgs';
fs.mkdirSync(out, { recursive: true });

const map: Record<string,string> = {
  l1: 'L1-What is video_v1.1.zip',
  l2: 'L2 - Filming techniques.zip',
  l3: 'Using a storyboard.zip',
  l4: 'L4 - Planning a video.zip',
  l5: 'L5 Importing and editing video_v1.3.zip',
  l6: 'L6 Video evaluation_v1.3.zip',
};
for (const [tag, zname] of Object.entries(map)) {
  const zip = new AdmZip(base + '/' + zname);
  const pptxEntry = zip.getEntries().find(e => /Slides.*\.pptx$/i.test(e.entryName) && !e.entryName.startsWith('__MACOSX'));
  if (!pptxEntry) { console.log(tag, 'NO PPTX'); continue; }
  const imgs = extractOfficeImages(pptxEntry.getData(), 'slides.pptx');
  console.log('\n' + tag + ' (' + zname + '): ' + imgs.length + ' images');
  for (const im of imgs) {
    const sizeKB = Math.round(im.bytes.length/1024);
    const fn = `${tag}-${im.name.replace(/[^a-z0-9.]/gi,'_')}`;
    fs.writeFileSync(out + '/' + fn, im.bytes);
    console.log('   ', fn, sizeKB + 'KB', im.mime);
  }
}
