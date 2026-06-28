import * as fs from 'fs';
import { renderWorksheet } from './src/lib/worksheetForm';
import { sliceSlidesForLevel, splitTeacherNotes } from './src/lib/slideDeck';

const dir = '/home/duguid/School_Organiser/app/seed-content/lessons/ks2-y5-flat-file-databases-teach-computing-adapted';
const manifest = JSON.parse(fs.readFileSync(dir + '/manifest.json', 'utf8'));
let fail = 0;
const err = (m: string) => { console.log('FAIL: ' + m); fail++; };

// resource files exist + placeholder integrity
const declaredFiles = new Set<string>();
for (const l of manifest.lessons) for (const r of l.resources) {
  declaredFiles.add(r.file);
  if (!fs.existsSync(dir + '/' + r.file)) err(`missing file ${r.file}`);
  if (r.kind === 'slides' && !/\.md$/.test(r.title)) err(`slides title must end .md: ${r.title}`);
}
// every {{res:..}} resolves
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.md')) continue;
  const md = fs.readFileSync(dir + '/' + f, 'utf8');
  for (const m of md.matchAll(/\{\{res:([^}]+)\}\}/g)) {
    if (!declaredFiles.has(m[1])) err(`${f}: {{res:${m[1]}}} not in manifest`);
  }
}

for (const l of manifest.lessons) {
  const act = l.resources.find((r: any) => /activity/.test(r.title));
  const md = fs.readFileSync(dir + '/' + act.file, 'utf8');
  const r = renderWorksheet(md, { mode: 'preview', level: 'core' });
  const hasShot = r.fields.some((f: any) => f.kind === 'image');
  if (!hasShot) err(`${l.title}: activity has no screenshot (image) field`);
  const sup = renderWorksheet(md, { mode: 'preview', level: 'support' }).html;
  const cha = renderWorksheet(md, { mode: 'preview', level: 'challenge' }).html;
  if (sup === cha) err(`${l.title}: support slice == challenge slice`);

  const slides = l.resources.find((r: any) => r.kind === 'slides');
  const smd = fs.readFileSync(dir + '/' + slides.file, 'utf8');
  const n = sliceSlidesForLevel(smd, 'core').length;
  if (n < 4) err(`${l.title}: only ${n} slides`);
  const notes = splitTeacherNotes(smd).notes;
  if (!notes || !notes.trim()) err(`${l.title}: empty teacher notes`);
  console.log(`OK  ${l.title}: slides=${n}, screenshot=${hasShot}, fields=${r.fields.length}, labels/sorts/orders=${r.fields.filter((f:any)=>['label','sort','order'].includes(f.kind)).length}`);
}
console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
