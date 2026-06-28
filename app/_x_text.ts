import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';
import fs from 'fs';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS2/Year_5/Unit 5 Introductio to vectors';

// Unit overview
const ov = fs.readdirSync(dir).find(f => /Unit overview.*\.docx$/i.test(f))!;
console.log('===== UNIT OVERVIEW: ' + ov + ' =====');
console.log(docxText(fs.readFileSync(dir + '/' + ov)).slice(0, 8000));

const zips = fs.readdirSync(dir).filter(f => /^L\d.*\.zip$/i.test(f)).sort();
for (const z of zips) {
  console.log('\n\n########## ZIP: ' + z + ' ##########');
  const zip = new AdmZip(dir + '/' + z);
  for (const e of zip.getEntries()) console.log('  entry: ' + e.entryName);
  for (const e of zip.getEntries()) {
    if (/Lesson plan.*\.docx$/i.test(e.entryName)) {
      console.log('\n----- LESSON PLAN: ' + e.entryName + ' -----');
      console.log(docxText(e.getData()));
    }
  }
}
