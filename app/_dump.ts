import AdmZip from 'adm-zip';
import { docxText } from './src/services/resourceImport';
const DIR = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/GCSE/unit_12';
const want: [string,string[]][] = [
  ['L1 – What is a computer network.zip', ['Matching exercise.docx','Solutions – Matching']],
  ['L4 – Network topologies.zip', ['A2 Activity sheet – Topologies.docx','Which topology']],
  ['L5 – Wired and wireless transmission media.zip', ['Advantages and limitations.docx','What do they need']],
  ['L6 – Network performance and routing costs.zip', ['Match the description','Calculate the file transfer','Which route']],
  ['L7 – What is the internet.zip', ['Internet essentials.docx','Solutions – Internet essentials']],
];
for (const [f, names] of want) {
  const z = new AdmZip(DIR + '/' + f);
  for (const n of names) {
    const e = z.getEntries().find(x => x.entryName.includes(n));
    if (!e) { console.log(`\n### MISSING ${n}`); continue; }
    console.log(`\n\n######### ${f} :: ${n} #########`);
    console.log(docxText(e.getData()).slice(0, 2500));
  }
}
