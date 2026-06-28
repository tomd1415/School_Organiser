import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS2/Year_5/Unit 1 Systems and searching';
const arg = process.argv[2];

if (arg === 'guide') {
  const zip = new AdmZip(dir + '/1. Unit Guide - Systems and Searching - Y5_v1.7.docx');
  // docx is a file not zip-of-zip; docxText takes bytes
  const fs = require('fs');
  console.log(docxText(fs.readFileSync(dir + '/1. Unit Guide - Systems and Searching - Y5_v1.7.docx')));
  process.exit(0);
}

const files: Record<string,string> = {
  '1': 'L1 – Systems.zip',
  '2': 'L2 Computer systems and us_v1.2.zip',
  '3': 'L3-Searching the web_v1.3.zip',
  '4': 'L4 – Selecting search results.zip',
  '5': 'L5 - How search results are ranked.zip',
  '6': 'L6 – How are searches influenced.zip',
};

const zip = new AdmZip(dir + '/' + files[arg]);
if (process.argv[3] === 'list') {
  for (const e of zip.getEntries()) console.log(e.entryName);
  process.exit(0);
}
const which = process.argv[3] || 'plan';
for (const e of zip.getEntries()) {
  if (!/\.docx$/i.test(e.entryName)) continue;
  const name = e.entryName.toLowerCase();
  if (which === 'plan' && name.includes('lesson plan')) {
    console.log('=== ' + e.entryName + ' ===');
    console.log(docxText(e.getData()));
  } else if (which === 'ws' && name.includes('worksheet')) {
    console.log('=== ' + e.entryName + ' ===');
    console.log(docxText(e.getData()));
  } else if (which === 'all') {
    console.log('=== ' + e.entryName + ' ===');
    console.log(docxText(e.getData()));
  }
}
