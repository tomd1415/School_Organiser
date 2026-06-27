import AdmZip from 'adm-zip';
import { extractOfficeImages } from './src/lib/officeImages';
import { writeFileSync, mkdirSync } from 'node:fs';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS3/year_9/unit_5/';
const out = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/img/';
mkdirSync(out, { recursive: true });
const lessons: [string,string][] = [
  ['L1','L1 - You and your data.zip'],
  ['L2','L2 - Social engineering.zip'],
  ['L3','L3 - Script Kiddies_v1.1.zip'],
  ['L4','L4 – Rise of the bots.zip'],
  ['L5','L5 – There’s no place like 127.0.0.1.zip'],
  ['L6','L6 – Under attack.zip'],
];
for (const [tag, z] of lessons) {
  const zip = new AdmZip(dir + z);
  const pptx = zip.getEntries().find(e => /Slides.*\.pptx$/i.test(e.entryName) && !/__MACOSX/.test(e.entryName));
  if (pptx) {
    const imgs = extractOfficeImages(pptx.getData(), 'slides.pptx');
    imgs.forEach(im => {
      const f = `${tag}-${im.name}`;
      writeFileSync(out + f, im.bytes);
      console.log(`${tag}\t${im.bytes.length}\t${f}`);
    });
  }
  // L6 jpg game cards stored directly in the zip
  for (const e of zip.getEntries().filter(e => /\.(jpg|jpeg|png)$/i.test(e.entryName) && !/__MACOSX/.test(e.entryName) && /Game cards/i.test(e.entryName))) {
    const base = e.entryName.split('/').pop()!;
    const f = `${tag}-card-${base}`;
    writeFileSync(out + f, e.getData());
    console.log(`${tag}\tCARD\t${e.entryName.length}\t${f}`);
  }
}
