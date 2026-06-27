// Export a converted lesson UNIT into a committable, instance-independent bundle under
// seed-content/lessons/<slug>/ (manifest.json + the resource files). Curriculum content only (no pupil
// data) → safe to commit. Embedded `/resources/<id>/view` URLs are rewritten to {{res:<file>}} placeholders
// so the bundle doesn't carry this instance's resource ids; src/seed/seedLessons.ts re-resolves them.
//   cd app && DATABASE_URL=… RESOURCE_STORE_PATH=… npx tsx scripts/export-lesson-unit.ts <unitId>
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from '../src/db/pool';
import { getCurrentVersion } from '../src/repos/resources';
import { readStored } from '../src/lib/resourceStore';

const BUNDLES = join(__dirname, '..', 'seed-content', 'lessons');

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function safeFile(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
const isText = (mime: string | null, file: string): boolean => /markdown|text\//i.test(mime ?? '') || /\.(md|markdown|txt)$/i.test(file);

async function main(): Promise<void> {
  const unitId = Number(process.argv[2]);
  if (!unitId) { console.error('usage: export-lesson-unit.ts <unitId>'); process.exit(1); }

  const u = (await pool.query<{ title: string; scheme_id: number; course: string; key_stage: string }>(
    `SELECT u.title, u.scheme_id, c.name AS course, c.key_stage
     FROM units u JOIN schemes_of_work s ON s.id = u.scheme_id JOIN courses c ON c.id = s.course_id WHERE u.id = $1`,
    [unitId],
  )).rows[0];
  if (!u) { console.error(`no unit ${unitId}`); process.exit(1); }

  const plans = (await pool.query<{ id: number; title: string; objectives: string | null; outline: string | null }>(
    `SELECT id, title, objectives, outline FROM lesson_plans WHERE unit_id = $1 ORDER BY display_order, id`, [unitId],
  )).rows;

  // gather every linked resource (current version) per plan, read its bytes from the store
  type Res = { id: number; title: string; kind: string; mime: string | null; attribution: string | null; bytes: Buffer; bundleFile: string };
  const byPlan = new Map<number, Res[]>();
  const idToFile = new Map<number, string>();
  for (let li = 0; li < plans.length; li++) {
    const rows = (await pool.query<{ id: number; title: string; kind: string; mime_type: string | null; source_attribution: string | null }>(
      `SELECT r.id, r.title, r.kind, r.mime_type, r.source_attribution
       FROM resource_links rl JOIN resources r ON r.id = rl.resource_id
       WHERE rl.lesson_plan_id = $1 ORDER BY r.id`, [plans[li]!.id],
    )).rows;
    const list: Res[] = [];
    for (const r of rows) {
      const v = await getCurrentVersion(r.id);
      if (!v) continue;
      const bytes = await readStored(v.storagePath);
      const ext = (r.title.match(/\.([a-z0-9]+)$/i)?.[1] ?? (isText(r.mime_type, r.title) ? 'md' : 'bin')).toLowerCase();
      const bundleFile = `l${li + 1}-${safeFile(r.title.replace(/\.[a-z0-9]+$/i, ''))}.${ext}`;
      list.push({ id: r.id, title: r.title, kind: r.kind, mime: r.mime_type, attribution: r.source_attribution, bytes, bundleFile });
      idToFile.set(r.id, bundleFile);
    }
    byPlan.set(plans[li]!.id, list);
  }

  // write the bundle (fresh)
  const slug = slugify(u.title);
  const dir = join(BUNDLES, slug);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const manifest = {
    unitTitle: u.title,
    course: { name: u.course, keyStage: u.key_stage },
    lessons: plans.map((p) => {
      const list = byPlan.get(p.id)!;
      return {
        title: p.title,
        objectives: p.objectives ?? '',
        outline: p.outline ?? '',
        resources: list.map((r) => ({ title: r.title, kind: r.kind, mimeType: r.mime, sourceAttribution: r.attribution, file: r.bundleFile })),
      };
    }),
  };

  let textCount = 0, binCount = 0;
  for (const list of byPlan.values()) {
    for (const r of list) {
      if (isText(r.mime, r.title)) {
        // rewrite /resources/<id>/view → {{res:<bundleFile>}} (instance-independent)
        const text = r.bytes.toString('utf8').replace(/\/resources\/(\d+)\/view/g, (m, id) => {
          const f = idToFile.get(Number(id));
          return f ? `{{res:${f}}}` : m;
        });
        writeFileSync(join(dir, r.bundleFile), text, 'utf8');
        textCount++;
      } else {
        writeFileSync(join(dir, r.bundleFile), r.bytes);
        binCount++;
      }
    }
  }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`✓ exported unit ${unitId} → seed-content/lessons/${slug}/ (${plans.length} lessons, ${textCount} text + ${binCount} binary resources)`);
}

main().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); pool.end().finally(() => process.exit(1)); });
