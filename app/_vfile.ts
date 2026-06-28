// File-level bundle verifier (NO database). Usage: npx tsx _vfile.ts seed-content/lessons/<slug>
import * as fs from 'fs';
import * as path from 'path';
import { renderWorksheet } from './src/lib/worksheetForm';
import { sliceSlidesForLevel, splitTeacherNotes } from './src/lib/slideDeck';

const dir = process.argv[2]!;
let problems = 0;
const warn = (m: string) => { console.log('  ⚠️ ' + m); problems++; };
const LEVELS = ['support', 'core', 'challenge'] as const;

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
if (!manifest.unitTitle) warn('manifest has no unitTitle');
if (!manifest.course?.name) warn('manifest has no course.name');
console.log(`${manifest.unitTitle} — ${manifest.lessons?.length} lessons`);
const allFiles = new Set(fs.readdirSync(dir));

for (const [i, l] of (manifest.lessons ?? []).entries()) {
  console.log(`\n— L${i + 1}: ${l.title}`);
  const objCount = String(l.objectives ?? '').split('\n').filter(Boolean).length;
  if (objCount < 3 || objCount > 5) warn(`${objCount} objectives (want 3–5)`);
  if (!/I can/i.test(l.objectives ?? '')) warn('objectives are not "I can…" statements');
  if (String(l.outline ?? '').length < 300) warn('outline looks too short');
  for (const r of l.resources ?? []) {
    if (!allFiles.has(r.file)) { warn(`missing file: ${r.file}`); continue; }
    if (r.mimeType !== 'text/markdown') continue;
    const md = fs.readFileSync(path.join(dir, r.file), 'utf8');
    for (const m of md.matchAll(/\{\{res:([^}]+)\}\}/g)) {
      if (!allFiles.has(m[1]!)) warn(`${r.file}: placeholder {{res:${m[1]}}} → no such file`);
    }
    if (r.kind === 'slides') {
      if (!/\.(md|markdown)$/i.test(r.title)) warn(`${r.title}: slides title must end .md (else invisible)`);
      const { notes } = splitTeacherNotes(md);
      if (!notes.trim()) warn(`${r.title}: no teacher notes (🧑‍🏫)`);
      const n = sliceSlidesForLevel(md, 'core').length;
      if (n < 3) warn(`${r.title}: only ${n} slides`);
      console.log(`   ✓ ${r.title} — ${n} slides, notes: ${notes.trim() ? 'yes' : 'NO'}`);
    } else if (r.kind === 'worksheet') {
      const render = renderWorksheet(md, { mode: 'preview', level: 'core' });
      const kinds = new Set(render.fields.map((f) => f.kind));
      if (/activity/i.test(r.title) && !kinds.has('image')) warn(`${r.title}: no screenshot/upload (📷) field`);
      for (const line of md.split('\n')) {
        if (/tick (all|every)|select all|all that apply|tick the/i.test(line) && /\(\s*\)/.test(line) && !/\[\s*\]/.test(line)) {
          warn(`${r.file}: possible multi-correct on single-radio → "${line.trim().slice(0, 60)}"`);
        }
      }
      const counts = LEVELS.map((lv) => renderWorksheet(md, { mode: 'preview', level: lv }).fields.length);
      console.log(`   ✓ ${r.title} — fields ${render.fields.length} [${[...kinds].join(', ')}] S/C/C ${counts.join('/')}`);
    }
  }
  // Assessment/quiz lessons legitimately have a quiz + slides instead of starter/activity worksheets.
  const isAssessment = /assessment|summative|quiz|revision/i.test(l.title);
  if (!isAssessment && !(l.resources ?? []).some((r: any) => /starter/i.test(r.title))) warn('no starter worksheet');
  if (!isAssessment && !(l.resources ?? []).some((r: any) => /activity/i.test(r.title))) warn('no activity worksheet');
  if (!(l.resources ?? []).some((r: any) => r.kind === 'slides')) warn('no slides');
}
console.log(`\n${problems === 0 ? '✅ file-level checks passed' : `❌ ${problems} problem(s)`}`);
process.exit(problems === 0 ? 0 : 1);
