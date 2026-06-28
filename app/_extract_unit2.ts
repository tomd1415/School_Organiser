import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';

const DIR = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/GCSE/unit_2';
const target = process.argv[2]; // zip filename

const zip = new AdmZip(`${DIR}/${target}`);
console.log('=== ENTRIES ===');
for (const e of zip.getEntries()) console.log(e.entryName);
const plan = zip.getEntries().find(x => /Lesson plan/i.test(x.entryName));
if (plan) {
  console.log('\n=== LESSON PLAN TEXT ===');
  console.log(docxText(plan.getData()));
}
for (const w of zip.getEntries().filter(x => /worksheet/i.test(x.entryName) && /\.docx$/i.test(x.entryName))) {
  console.log(`\n=== WORKSHEET: ${w.entryName} ===`);
  console.log(docxText(w.getData()));
}
