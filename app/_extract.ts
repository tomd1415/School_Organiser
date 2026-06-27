import AdmZip from 'adm-zip';
import { docxText } from '/home/duguid/School_Organiser/app/src/services/resourceImport';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS3/year_9/unit_5/';
const zips = [
  'L1 - You and your data.zip',
  'L2 - Social engineering.zip',
  'L3 - Script Kiddies_v1.1.zip',
  'L4 – Rise of the bots.zip',
  'L5 – There’s no place like 127.0.0.1.zip',
  'L6 – Under attack.zip',
];

for (const z of zips) {
  console.log('\n\n##################################################');
  console.log('### ZIP:', z);
  console.log('##################################################');
  const zip = new AdmZip(dir + z);
  for (const e of zip.getEntries()) console.log('  ENTRY:', e.entryName);
  const plan = zip.getEntries().find(x => /Lesson plan|lesson_plan/i.test(x.entryName) && /\.docx$/i.test(x.entryName));
  if (plan) {
    console.log('\n===== LESSON PLAN:', plan.entryName, '=====');
    console.log(docxText(plan.getData()));
  } else {
    console.log('!! no lesson plan docx found');
  }
  for (const e of zip.getEntries().filter(x => /worksheet|activity/i.test(x.entryName) && /\.docx$/i.test(x.entryName))) {
    console.log('\n===== DOC:', e.entryName, '=====');
    console.log(docxText(e.getData()));
  }
}
