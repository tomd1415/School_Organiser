import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages';
import { docxText } from './src/services/resourceImport';
import * as fs from 'fs';

const base = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS2/Year_5/Unit 2 Video Production';
const out = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/imgs';

const jobs: [string,string,string][] = [
  ['L2 - Filming techniques.zip', 'A1 Handout – Filming techniques.pptx', 'h2film'],
  ['Using a storyboard.zip', 'A1 Handout – Storyboard.pptx', 'h3sb'],
  ['L4 - Planning a video.zip', 'A2 Handout – Storyboard.pptx', 'h4sb'],
];
for (const [zname, inner, tag] of jobs) {
  const zip = new AdmZip(base + '/' + zname);
  const entry = zip.getEntries().find(e => e.entryName.endsWith(inner) && !e.entryName.startsWith('__MACOSX'));
  if (!entry) { console.log(tag, 'NOT FOUND', inner); continue; }
  const imgs = extractOfficeImages(entry.getData(), 'h.pptx');
  console.log('\n' + tag + ' (' + inner + '): ' + imgs.length + ' images');
  for (const im of imgs) {
    const fn = `${tag}-${im.name.replace(/[^a-z0-9.]/gi,'_')}`;
    fs.writeFileSync(out + '/' + fn, im.bytes);
    console.log('   ', fn, Math.round(im.bytes.length/1024)+'KB', im.mime);
  }
}
