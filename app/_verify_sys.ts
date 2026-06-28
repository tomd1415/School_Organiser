import * as fs from 'fs';
import * as path from 'path';
import { renderWorksheet } from './src/lib/worksheetForm';
import { sliceSlidesForLevel, splitTeacherNotes } from './src/lib/slideDeck';

const dir = 'seed-content/lessons/ks2-y5-systems-and-searching-teach-computing-adapted';
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
let fail = 0;
const fileSet = new Set(fs.readdirSync(dir));

for (const lesson of manifest.lessons) {
  console.log('\n=== ' + lesson.title + ' ===');
  const activity = lesson.resources.find((r: any) => r.kind === 'worksheet' && /activity/i.test(r.file));
  const starter = lesson.resources.find((r: any) => r.kind === 'worksheet' && /starter/i.test(r.file));
  const slides = lesson.resources.find((r: any) => r.kind === 'slides');
  // slides title must end .md
  if (!/\.md$/.test(slides.title)) { console.log('  FAIL slides title not .md'); fail++; }

  // worksheet checks: screenshot field + support !== challenge slices
  for (const w of [starter, activity]) {
    const md = fs.readFileSync(path.join(dir, w.file), 'utf8');
    const sup = renderWorksheet(md, { mode: 'preview', level: 'support' });
    const cha = renderWorksheet(md, { mode: 'preview', level: 'challenge' });
    const supJson = JSON.stringify(sup.fields);
    const chaJson = JSON.stringify(cha.fields);
    if (supJson === chaJson) { console.log('  FAIL ' + w.file + ' support==challenge'); fail++; }
    else console.log('  ok slices differ: ' + w.file);
  }
  // activity must have a screenshot (image) field
  const amd = fs.readFileSync(path.join(dir, activity.file), 'utf8');
  const af = renderWorksheet(amd, { mode: 'preview', level: 'core' }).fields;
  if (!af.some((f: any) => f.kind === 'image')) { console.log('  FAIL no screenshot field in ' + activity.file); fail++; }
  else console.log('  ok screenshot field present');

  // slides: >=4 slides + non-empty notes
  const smd = fs.readFileSync(path.join(dir, slides.file), 'utf8');
  const sl = sliceSlidesForLevel(smd, 'core');
  const notes = splitTeacherNotes(smd);
  if (sl.length < 4) { console.log('  FAIL <4 slides (' + sl.length + ')'); fail++; }
  else console.log('  ok slides=' + sl.length);
  const notesText = typeof notes === 'string' ? notes : JSON.stringify(notes);
  if (!notesText || notesText.length < 20) { console.log('  FAIL empty notes'); fail++; }
  else console.log('  ok notes present');

  // all {{res:}} placeholders resolve to a manifest file
  for (const w of [starter, activity, slides]) {
    const md = fs.readFileSync(path.join(dir, w.file), 'utf8');
    const refs = [...md.matchAll(/\{\{res:([^}]+)\}\}/g)].map((m) => m[1]);
    for (const r of refs) {
      const inManifest = lesson.resources.some((x: any) => x.file === r);
      if (!inManifest || !fileSet.has(r)) { console.log('  FAIL missing res ' + r + ' in ' + w.file); fail++; }
    }
  }
}

// every image file in manifest exists
for (const lesson of manifest.lessons)
  for (const r of lesson.resources)
    if (!fileSet.has(r.file)) { console.log('FAIL manifest file missing on disk: ' + r.file); fail++; }

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILURES: ' + fail));
process.exit(fail === 0 ? 0 : 1);
