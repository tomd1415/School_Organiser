import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';
import { readFileSync } from 'node:fs';

const dir = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/KS3/year_9/unit_1';

console.log('===== UNIT GUIDE =====');
console.log(docxText(readFileSync(dir + '/Unit guide_1_Python programming with sequences of data_Y9_v1.2.docx')));

console.log('\n\n===== SUMMATIVE ASSESSMENT =====');
console.log(docxText(readFileSync(dir + '/Summative assessment – Python programming with sequences of data – Y9.docx')));

console.log('\n\n===== SUMMATIVE ASSESSMENT ANSWERS =====');
console.log(docxText(readFileSync(dir + '/Summative assessment answers – Python programming with sequences of data – Y9.docx')));

const zips = ['L1 - Warm up_v1.1.zip','L2 - Playlist_v1.1.zip','L3 - In a while, crocodile_v1.1.zip','L4 - The famous for_v1.1.zip','L5 - Make a thing_v1.1.zip','L6 - Wrap up_v1.1.zip'];
for (const z of zips) {
  console.log('\n\n##### ZIP: ' + z + ' #####');
  const zip = new AdmZip(dir + '/' + z);
  for (const e of zip.getEntries()) console.log('  ', e.entryName);
}
