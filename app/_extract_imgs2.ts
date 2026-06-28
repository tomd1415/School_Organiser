import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages';
import * as fs from 'fs';
import * as path from 'path';
const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS2/Year_5/Unit 1 Systems and searching';
const out = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/imgs';
const files: Record<string,string> = {
  '1': 'L1 – Systems.zip','2': 'L2 Computer systems and us_v1.2.zip',
  '3': 'L3-Searching the web_v1.3.zip','4': 'L4 – Selecting search results.zip',
  '5': 'L5 - How search results are ranked.zip','6': 'L6 – How are searches influenced.zip',
};
const n = process.argv[2];
const lessonZip = new AdmZip(dir + '/' + files[n]);
const dest = path.join(out, 'l' + n);
fs.mkdirSync(dest, { recursive: true });
let count = 0;
for (const e of lessonZip.getEntries()) {
  if (!/\.(pptx|docx)$/i.test(e.entryName)) continue;
  if (e.entryName.includes('__MACOSX')) continue;
  const isDoc = /\.docx$/i.test(e.entryName);
  const imgs = extractOfficeImages(e.getData(), isDoc ? 'd.docx' : 's.pptx');
  const tag = path.basename(e.entryName).replace(/[^a-z0-9]/gi,'_').slice(0,24);
  for (const im of imgs) {
    if (im.bytes.length < 9000) continue;
    const fn = `${tag}__${im.name.replace(/[^a-z0-9.]/gi,'_')}`;
    fs.writeFileSync(path.join(dest, fn), im.bytes);
    count++;
  }
}
console.log('lesson', n, 'wrote', count);
