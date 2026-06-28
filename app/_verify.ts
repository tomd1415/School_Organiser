// DB-level verifier for a seeded unit. Usage: npx tsx _verify.ts <unitId>
import { pool } from './src/db/pool';
import { listResourcesForPlan, getCurrentVersion } from './src/repos/resources';
import { readStored } from './src/lib/resourceStore';
import { renderWorksheet } from './src/lib/worksheetForm';
import { sliceSlidesForLevel, splitTeacherNotes } from './src/lib/slideDeck';

const unitId = Number(process.argv[2]);
let problems = 0;
const warn = (m: string) => { console.log('  ⚠️ ' + m); problems++; };

async function content(resourceId: number): Promise<string> {
  const v = await getCurrentVersion(resourceId);
  if (!v) return '';
  return (await readStored(v.storagePath)).toString('utf8');
}

(async () => {
  const plans = (await pool.query<{ id: number; title: string }>(
    `SELECT id, title FROM lesson_plans WHERE unit_id = $1 ORDER BY display_order, id`, [unitId],
  )).rows;
  console.log(`Unit ${unitId}: ${plans.length} lessons`);
  for (const p of plans) {
    const res = await listResourcesForPlan(p.id);
    for (const w of res.filter((r) => r.kind === 'worksheet')) {
      const md = await content(w.resourceId);
      if (/\{\{res:/.test(md)) warn(`${w.title}: unresolved {{res:}}`);
      for (const m of md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
        if (!/^\/resources\/\d+\/view$|^https?:/.test(m[1]!)) warn(`${w.title}: image src not resolved: ${m[1]}`);
      }
      const r = renderWorksheet(md, { mode: 'preview', level: 'core' });
      if (/activity/i.test(w.title) && !r.fields.some((f) => f.kind === 'image')) warn(`${w.title}: no screenshot/upload field`);
    }
    for (const s of res.filter((r) => r.kind === 'slides')) {
      if (!/\.(md|markdown)$/i.test(s.title)) warn(`${s.title}: title not .md → invisible`);
      const md = await content(s.resourceId);
      if (/\{\{res:/.test(md)) warn(`${s.title}: unresolved {{res:}}`);
      if (!splitTeacherNotes(md).notes.trim()) warn(`${s.title}: no teacher notes`);
      if (sliceSlidesForLevel(md, 'core').length < 2) warn(`${s.title}: <2 slides`);
    }
  }
  console.log(problems === 0 ? '✅ all checks passed' : `❌ ${problems} problem(s)`);
  await pool.end();
  process.exit(problems === 0 ? 0 : 1);
})();
