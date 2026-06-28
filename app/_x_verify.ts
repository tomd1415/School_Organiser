import fs from 'fs';
import { renderWorksheet } from './src/lib/worksheetForm';
import { sliceSlidesForLevel, splitTeacherNotes } from './src/lib/slideDeck';

const dir = 'seed-content/lessons/ks2-y5-vector-graphics-teach-computing-adapted';
const manifest = JSON.parse(fs.readFileSync(dir + '/manifest.json', 'utf8'));
let fail = 0;
const note = (ok: boolean, msg: string) => { if (!ok) { fail++; console.log('  FAIL: ' + msg); } };

for (const lesson of manifest.lessons) {
  console.log('\n== ' + lesson.title + ' ==');
  const wsRes = lesson.resources.filter((r: any) => r.kind === 'worksheet');
  const slideRes = lesson.resources.find((r: any) => r.kind === 'slides');

  for (const r of wsRes) {
    const md = fs.readFileSync(dir + '/' + r.file, 'utf8');
    const support = renderWorksheet(md, { mode: 'preview', level: 'support' }).fields;
    const challenge = renderWorksheet(md, { mode: 'preview', level: 'challenge' }).fields;
    const core = renderWorksheet(md, { mode: 'preview', level: 'core' }).fields;
    const sig = (fs: any[]) => fs.map(f => f.kind + ':' + (f.label || f.prompt || '').slice(0, 20)).join('|');
    const isActivity = /activity/.test(r.file);
    if (isActivity) {
      const hasShot = core.some((f: any) => f.kind === 'image');
      note(hasShot, r.file + ' has NO screenshot (image) field');
    }
    note(sig(support) !== sig(challenge), r.file + ' support == challenge (no differentiation)');
    console.log(`  ${r.file}: support=${support.length} core=${core.length} challenge=${challenge.length} fields; shot=${core.some((f:any)=>f.kind==='image')}`);
  }

  const smd = fs.readFileSync(dir + '/' + slideRes.file, 'utf8');
  const slides = sliceSlidesForLevel(smd, 'core');
  const notes = splitTeacherNotes(smd);
  note(slides.length >= 4, slideRes.file + ' has <4 slides (' + slides.length + ')');
  note(notes.notes.trim().length > 10, slideRes.file + ' teacher notes empty');
  console.log(`  ${slideRes.file}: ${slides.length} slides`);
}
console.log('\n' + (fail ? `RESULT: ${fail} FAIL` : 'RESULT: PASS'));
