import { docxText } from './src/services/resourceImport';
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = '/home/duguid/School_Organiser/TeachComputing/TeachComputing/GCSE/unit_12';
const OUT = '/tmp/claude-1000/-home-duguid-School-Organiser/064596d1-b0ab-48d0-81d0-bd09b12999c2/scratchpad/src';
for (const [f, o] of [
  ['Summative assessment – Computer networks – KS4.docx', '_summative_questions.txt'],
  ['12_Summative assessment answers_Computer networks_KS4_v1.1.docx', '_summative_answers.txt'],
]) {
  writeFileSync(`${OUT}/${o}`, docxText(readFileSync(`${DIR}/${f}`)));
  console.log('wrote', o);
}
