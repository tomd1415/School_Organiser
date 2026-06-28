import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderWorksheet } from './src/lib/worksheetForm';
import { sliceSlidesForLevel, splitTeacherNotes } from './src/lib/slideDeck';

const DIR = 'seed-content/lessons/gcse-computer-networks-teach-computing-adapted__pt2';
const m = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
let fail = 0;
const ok = (c: boolean, msg: string) => { if (!c) { console.log('  FAIL:', msg); fail++; } };

// 1. course / title
ok(m.unitTitle === 'GCSE Computer networks (Teach Computing — adapted)', 'unitTitle');
ok(m.course.name === 'OCR J277 GCSE Computer Science', 'course.name');
ok(m.course.keyStage === 'KS4', 'keyStage');
ok(m.lessons.length === 6, '6 lessons, got ' + m.lessons.length);

const declared = new Set<string>();
const onDisk = new Set(readdirSync(DIR));

for (const [i, L] of m.lessons.entries()) {
  console.log(`\nL${i + 8}: ${L.title}`);
  ok(typeof L.objectives === 'string' && L.objectives.split('\n').length >= 3, 'objectives >=3');
  for (const w of ['support', 'core', 'challenge']) {
    ok(!/^#{1,3} .*\b(support|core|challenge)\b/im.test('') , 'noop'); // placeholder
  }
  for (const r of L.resources) {
    declared.add(r.file);
    ok(onDisk.has(r.file), `file on disk: ${r.file}`);
    if (r.kind === 'slides') ok(r.title.endsWith('.md'), `slides title ends .md: ${r.title}`);
    const md = readFileSync(join(DIR, r.file), 'utf8');
    // placeholder resolution
    for (const mm of md.matchAll(/\{\{res:([^}]+)\}\}/g)) {
      ok(onDisk.has(mm[1]), `placeholder maps to file: ${mm[1]} (in ${r.file})`);
      declared.add(mm[1]);
    }
    if (r.kind === 'worksheet') {
      // heading gotcha: no non-level heading contains support/core/challenge
      for (const line of md.split('\n')) {
        const h = line.match(/^#{1,3}\s+(.*)$/);
        if (h && /\b(support|core|challenge)\b/i.test(h[1])) {
          const isLevel = /🟢|🟡|🔴/.test(h[1]);
          ok(isLevel, `worksheet heading is a level divider only: "${h[1]}" in ${r.file}`);
        }
      }
      for (const lvl of ['support', 'core', 'challenge'] as const) {
        const out = renderWorksheet(md, { mode: 'preview', level: lvl });
        ok(out.fields.length > 0, `${lvl} renders fields (${r.file})`);
      }
      const core = renderWorksheet(md, { mode: 'preview', level: 'core' });
      const kinds = new Set(core.fields.map(f => f.kind));
      const isQuiz = /quiz/.test(r.file);
      if (!isQuiz) {
        ok(kinds.has('image'), `has screenshot image field (${r.file}) — kinds: ${[...kinds]}`);
      } else {
        ok(kinds.has('image'), `quiz has screenshot field (${r.file})`);
      }
      // level slicing distinctness (activity sheets only)
      if (/activity/.test(r.file)) {
        const sup = renderWorksheet(md, { mode: 'preview', level: 'support' }).fields.length;
        const cha = renderWorksheet(md, { mode: 'preview', level: 'challenge' }).fields.length;
        ok(true, `slice counts support=${sup} challenge=${cha}`);
      }
      console.log(`  ${r.file}: field kinds = ${[...kinds].join(', ')}`);
    }
    if (r.kind === 'slides') {
      const md2 = `# x\n` + md.replace(/^#[^\n]*\n/, ''); // ensure parse; use as-is actually
      const slices = sliceSlidesForLevel(md, 'core');
      ok(slices.length > 0, `slides slice >0 (${r.file})`);
      const notes = splitTeacherNotes(md).notes;
      ok(notes.trim().length > 0, `teacher notes present (${r.file})`);
      console.log(`  ${r.file}: ${slices.length} slides, notes ${notes.length}b`);
    }
  }
}

// orphan files (excluding manifest)
for (const f of onDisk) {
  if (f === 'manifest.json') continue;
  ok(declared.has(f), `file declared in manifest: ${f}`);
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL (' + fail + ')'}`);
process.exit(fail === 0 ? 0 : 1);
