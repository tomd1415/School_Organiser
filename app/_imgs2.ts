import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages';
import { writeFileSync, mkdirSync } from 'node:fs';
const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS3/year_9/unit_1';
const out = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/imgs';
mkdirSync(out, { recursive: true });
const zip = new AdmZip(dir + '/L1 - Warm up_v1.1.zip');
const cheat = zip.getEntries().find(e => /cheat/i.test(e.entryName) && /\.pptx$/i.test(e.entryName));
if (cheat) {
  const imgs = extractOfficeImages(cheat.getData(), 'cheat.pptx');
  console.log('cheat images:', imgs.length);
  imgs.forEach(im => { const fn = `${out}/cheat-${im.name}`; writeFileSync(fn, im.bytes); console.log('   ', fn, im.bytes.length); });
}
