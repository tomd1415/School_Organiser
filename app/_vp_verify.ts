import * as fs from 'fs';
import { renderWorksheet } from './src/lib/worksheetForm';
import { sliceSlidesForLevel, splitTeacherNotes } from './src/lib/slideDeck';

const dir = 'seed-content/lessons/ks2-y5-video-production-teach-computing-adapted';
const manifest = JSON.parse(fs.readFileSync(dir + '/manifest.json', 'utf8'));

let fail = 0;
const fileSet = new Set(fs.readdirSync(dir));
const referenced = new Set<string>();

for (const lesson of manifest.lessons) {
  console.log('\n=== ' + lesson.title + ' ===');
  const res = lesson.resources as any[];
  // all files exist
  for (const r of res) {
    if (!fileSet.has(r.file)) { console.log('  MISSING FILE', r.file); fail++; }
  }
  // slides title ends .md
  const slides = res.find(r => r.kind === 'slides');
  if (!slides || !/\.md$/.test(slides.title)) { console.log('  SLIDES TITLE not .md'); fail++; }

  // worksheets
  for (const w of res.filter(r => r.kind === 'worksheet')) {
    const md = fs.readFileSync(dir + '/' + w.file, 'utf8');
    for (const m of md.matchAll(/\{\{res:([^}]+)\}\}/g)) referenced.add(m[1]);
    const support = renderWorksheet(md, { mode: 'preview', level: 'support' }).fields;
    const challenge = renderWorksheet(md, { mode: 'preview', level: 'challenge' }).fields;
    const sKinds = support.map(f => f.kind).join('|');
    const cKinds = challenge.map(f => f.kind).join('|');
    if (/activity/.test(w.file)) {
      const hasShot = challenge.some(f => f.kind === 'image');
      if (!hasShot) { console.log('  NO screenshot(image) field in', w.file); fail++; }
    }
    if (sKinds === cKinds) { console.log('  support==challenge slices in', w.file, '[', sKinds, ']'); fail++; }
    console.log('  ' + w.file + ' fields: support=' + support.length + ' challenge=' + challenge.length);
  }

  // slides
  const smd = fs.readFileSync(dir + '/' + slides.file, 'utf8');
  for (const m of smd.matchAll(/\{\{res:([^}]+)\}\}/g)) referenced.add(m[1]);
  const sl = sliceSlidesForLevel(smd, 'core');
  const notes = splitTeacherNotes(smd);
  const noteText = Array.isArray(notes.notes) ? notes.notes.join('') : String(notes.notes ?? '');
  if (sl.length < 4) { console.log('  <4 slides:', sl.length); fail++; }
  if (!noteText.trim()) { console.log('  empty teacher notes'); fail++; }
  console.log('  slides=' + sl.length + ' teacherNotesLen=' + noteText.length);
}

// every {{res}} matches a manifest file & exists
const manifestFiles = new Set<string>();
for (const l of manifest.lessons) for (const r of l.resources) manifestFiles.add(r.file);
for (const ref of referenced) {
  if (!manifestFiles.has(ref)) { console.log('REF not in manifest:', ref); fail++; }
  if (!fileSet.has(ref)) { console.log('REF file missing on disk:', ref); fail++; }
}
// every image file in manifest exists
for (const f of manifestFiles) if (!fileSet.has(f)) { console.log('manifest file missing:', f); fail++; }

console.log('\n' + (fail === 0 ? 'SELF-VERIFY PASS' : 'SELF-VERIFY FAIL (' + fail + ')'));
process.exit(fail === 0 ? 0 : 1);
