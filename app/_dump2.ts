import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS3/year_9/unit_1';
const target = process.argv[2]; // zip filename
const zip = new AdmZip(dir + '/' + target);
for (const e of zip.getEntries()) {
  if (/Lesson plan/i.test(e.entryName) && /\.docx$/i.test(e.entryName)) {
    console.log('\n========== LESSON PLAN: ' + e.entryName + ' ==========');
    console.log(docxText(e.getData()));
  }
}
for (const e of zip.getEntries()) {
  if (/Worksheet|Homework|Handout|Solutions/i.test(e.entryName) && /\.docx$/i.test(e.entryName)) {
    console.log('\n========== DOC: ' + e.entryName + ' ==========');
    console.log(docxText(e.getData()));
  }
}
