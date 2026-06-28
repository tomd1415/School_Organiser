import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';

const base = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS2/Year_5/Unit 2 Video Production';
const zips = process.argv.slice(2);
for (const zname of zips) {
  console.log('\n\n############################## ' + zname + ' ##############################');
  const zip = new AdmZip(base + '/' + zname);
  for (const e of zip.getEntries()) {
    if (e.entryName.startsWith('__MACOSX')) continue;
    if (/Lesson plan|Worksheet|Handout|Homework/i.test(e.entryName) && /\.docx$/i.test(e.entryName)) {
      console.log('\n\n=========== ' + e.entryName + ' ===========');
      try { console.log(docxText(e.getData())); } catch (err) { console.log('ERR', (err as Error).message); }
    }
  }
}
