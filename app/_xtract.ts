import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';
import * as fs from 'fs';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS2/Year_5/Unit 4 Flat-file databases';
const out = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad';

const ug = fs.readdirSync(dir).find(f => /Unit Guide/i.test(f))!;
fs.writeFileSync(out + '/unit-guide.txt', docxText(fs.readFileSync(dir + '/' + ug)));

const zips = fs.readdirSync(dir).filter(f => /^L\d/i.test(f) && f.endsWith('.zip')).sort();
for (const z of zips) {
  const zip = new AdmZip(dir + '/' + z);
  let text = `==== ZIP: ${z} ====\n`;
  const entries = zip.getEntries();
  text += entries.map(e => '  ' + e.entryName).join('\n') + '\n\n';
  for (const e of entries) {
    if (/\.docx$/i.test(e.entryName)) {
      text += `---- DOCX: ${e.entryName} ----\n`;
      try { text += docxText(e.getData()) + '\n\n'; } catch (err) { text += 'ERR ' + err + '\n'; }
    }
  }
  const label = z.replace(/[^a-z0-9]/gi, '_');
  fs.writeFileSync(out + '/' + label + '.txt', text);
}
console.log('done', zips);
