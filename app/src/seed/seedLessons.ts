// Seed converted lessons from committed bundles (seed-content/lessons/*/manifest.json) onto THIS instance —
// the transfer + git-restore path. Idempotent: a unit of the same title on the target scheme is REPLACED
// (its plans + their resources removed first), so re-seeding converges. Resolves {{res:<file>}} placeholders
// in the markdown to this instance's freshly-created /resources/<id>/view URLs, so embedded images/videos
// work after transfer. Curriculum content only (no pupil data, no AI).
//   cd app && DATABASE_URL=… RESOURCE_STORE_PATH=… npx tsx src/seed/seedLessons.ts [slug] [--new-only]
// --new-only = provision-on-boot / cron mode: create units that aren't here yet, never replace one that is
// (so a teacher's edits on a deployed instance are never clobbered). Default replaces same-title units.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from '../db/pool';
import { materialiseUnit } from '../repos/schemes';
import { createResourceWithVersion, linkResourceToPlan } from '../repos/resources';
import { checksum } from '../lib/resourceStore';

const BUNDLES = join(__dirname, '..', '..', 'seed-content', 'lessons');

interface ManifestResource { title: string; kind: string; mimeType: string | null; sourceAttribution: string | null; file: string }
interface ManifestLesson { title: string; objectives: string; outline: string; resources: ManifestResource[] }
interface Manifest { unitTitle: string; course: { name: string; keyStage: string | null }; lessons: ManifestLesson[] }

const isText = (m: ManifestResource): boolean => /markdown|text\//i.test(m.mimeType ?? '') || /\.(md|markdown|txt)$/i.test(m.file);

async function schemeForCourse(name: string, keyStage: string | null): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT s.id FROM schemes_of_work s JOIN courses c ON c.id = s.course_id
     WHERE c.name = $1 AND ($2::text IS NULL OR c.key_stage = $2) AND s.active ORDER BY s.id LIMIT 1`,
    [name, keyStage],
  );
  return rows[0]?.id ?? null;
}

/** Remove an existing unit of this title on the scheme + the resources its plans reference (clean replace). */
async function removeExistingUnit(schemeId: number, title: string): Promise<void> {
  const u = (await pool.query<{ id: number }>(`SELECT id FROM units WHERE scheme_id = $1 AND title = $2`, [schemeId, title])).rows[0];
  if (!u) return;
  const resIds = (await pool.query<{ resource_id: number }>(
    `SELECT DISTINCT rl.resource_id FROM resource_links rl JOIN lesson_plans lp ON lp.id = rl.lesson_plan_id WHERE lp.unit_id = $1`,
    [u.id],
  )).rows.map((r) => r.resource_id);
  if (resIds.length) await pool.query(`DELETE FROM resources WHERE id = ANY($1::bigint[])`, [resIds]); // cascades versions/links
  await pool.query(`DELETE FROM units WHERE id = $1`, [u.id]); // cascades lesson_plans
}

async function unitExists(schemeId: number, title: string): Promise<boolean> {
  return (await pool.query(`SELECT 1 FROM units WHERE scheme_id = $1 AND title = $2`, [schemeId, title])).rowCount! > 0;
}

async function seedBundle(dir: string, newOnly: boolean): Promise<{ ok: boolean; msg: string }> {
  const manifest: Manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const schemeId = await schemeForCourse(manifest.course.name, manifest.course.keyStage);
  if (!schemeId) return { ok: false, msg: `SKIP "${manifest.unitTitle}" — no active scheme for course "${manifest.course.name}" (${manifest.course.keyStage})` };

  // --new-only (safe for auto-provisioning / cron): never touch a unit that's already here, so a teacher's
  // edits on an instance are never clobbered. Default (deliberate update) REPLACES the same-title unit.
  if (newOnly && (await unitExists(schemeId, manifest.unitTitle))) {
    return { ok: true, msg: `kept existing "${manifest.unitTitle}" (--new-only)` };
  }
  await removeExistingUnit(schemeId, manifest.unitTitle);
  const unitId = await materialiseUnit(schemeId, manifest.unitTitle, manifest.lessons.map((l) => ({ title: l.title, objectives: l.objectives, outline: l.outline })));
  if (!unitId) return { ok: false, msg: `FAIL "${manifest.unitTitle}" — materialiseUnit returned null` };
  const planIds = (await pool.query<{ id: number }>(`SELECT id FROM lesson_plans WHERE unit_id = $1 ORDER BY display_order, id`, [unitId])).rows.map((r) => r.id);

  // Pass 1: create the BINARY resources first → build file → new /resources/<id>/view map.
  const fileToUrl = new Map<string, string>();
  const create = async (m: ManifestResource, planId: number, content: Buffer): Promise<number> => {
    const id = await createResourceWithVersion(
      { title: m.title, kind: m.kind, mimeType: m.mimeType, source: isText(m) ? 'ai_generated' : 'imported', sourceAttribution: m.sourceAttribution || null },
      { filename: m.file, buf: content, checksum: checksum(content), author: 'ai', changeNote: 'seeded from lesson bundle' },
    );
    await linkResourceToPlan(id, planId);
    return id;
  };
  for (let li = 0; li < manifest.lessons.length; li++) {
    for (const m of manifest.lessons[li]!.resources) {
      if (isText(m)) continue;
      const id = await create(m, planIds[li]!, readFileSync(join(dir, m.file)));
      fileToUrl.set(m.file, `/resources/${id}/view`);
    }
  }
  // Pass 2: create the TEXT resources, resolving {{res:<file>}} → the new URLs.
  let resCount = fileToUrl.size;
  for (let li = 0; li < manifest.lessons.length; li++) {
    for (const m of manifest.lessons[li]!.resources) {
      if (!isText(m)) continue;
      const text = readFileSync(join(dir, m.file), 'utf8').replace(/\{\{res:([^}]+)\}\}/g, (whole, f) => fileToUrl.get(f) ?? whole);
      await create(m, planIds[li]!, Buffer.from(text, 'utf8'));
      resCount++;
    }
  }
  return { ok: true, msg: `seeded "${manifest.unitTitle}" → unit ${unitId} (${planIds.length} lessons, ${resCount} resources)` };
}

async function main(): Promise<void> {
  if (!existsSync(BUNDLES)) { console.log('no seed-content/lessons/ — nothing to seed'); return; }
  const args = process.argv.slice(2);
  const newOnly = args.includes('--new-only'); // provision-on-boot / cron: add missing units, never clobber an instance's edits
  const only = args.find((a) => !a.startsWith('--'));
  const dirs = readdirSync(BUNDLES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (!only || d.name === only))
    .filter((d) => existsSync(join(BUNDLES, d.name, 'manifest.json'))); // skip non-bundle dirs (e.g. _notes/)
  for (const d of dirs) {
    const r = await seedBundle(join(BUNDLES, d.name), newOnly);
    console.log((r.ok ? '✓ ' : '✗ ') + r.msg);
  }
}

main().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); pool.end().finally(() => process.exit(1)); });
