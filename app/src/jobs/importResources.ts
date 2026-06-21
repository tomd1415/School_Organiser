// Bulk-import scattered resource copies into the hosted store. Walks a source
// directory, extracts .zip lesson packages, hashes every file and skips duplicates
// (by checksum), recording where each came from.
//
//   cd app && npm run import-resources                 # default: ~/Downloads/TeachComputing
//   cd app && npm run import-resources -- /some/path   # any folder
//
// Idempotent: re-run as the download grows; already-imported files are skipped.
import AdmZip from 'adm-zip';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pool } from '../db/pool';
import { createResourceWithVersion, findResourceByChecksum } from '../repos/resources';
import { checksum } from '../lib/resourceStore';
import { kindFromFilename, mimeFromFilename, safeFilename } from '../services/resource';

const SKIP = new Set(['Thumbs.db', '__MACOSX', '.mounttest']);

const stats = { imported: 0, skipped: 0, zips: 0 };

async function importFile(path: string, sourceRel: string): Promise<void> {
  const buf = await readFile(path);
  if (buf.length === 0) return;
  const sum = checksum(buf);
  if (await findResourceByChecksum(sum)) {
    stats.skipped++;
    return;
  }
  const filename = safeFilename(basename(path));
  // BUG-028: resource row + version + file in one transaction (an atomic create), so a crash mid-import
  // can't leave an orphan resource row or an orphan file.
  await createResourceWithVersion(
    { title: filename, kind: kindFromFilename(filename), mimeType: mimeFromFilename(filename), source: 'imported' },
    { filename, buf, checksum: sum, author: 'teacher', changeNote: `imported from ${sourceRel}` },
  );
  stats.imported++;
}

async function importDir(dir: string, sourcePrefix: string, depth: number): Promise<void> {
  if (depth > 8) return;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
    const lname = e.name.toLowerCase();
    if (lname.endsWith('.part') || lname.endsWith('.crdownload')) continue; // in-progress download
    const full = join(dir, e.name);
    const rel = sourcePrefix + e.name;
    if (e.isDirectory()) {
      await importDir(full, rel + '/', depth + 1);
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.zip')) {
      stats.zips++;
      const tmp = await mkdtemp(join(tmpdir(), 'so-import-'));
      try {
        new AdmZip(full).extractAllTo(tmp, true);
        await importDir(tmp, rel + '/', depth + 1);
      } catch (err) {
        console.error(`  ! could not extract ${rel}: ${(err as Error).message}`);
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    } else if (e.isFile()) {
      await importFile(full, rel);
    }
  }
}

// Import only the files listed in a manifest (the first tab-column of each line, a path
// relative to `source`). Used to bring in just the teacher's own work — `own.tsv` from the
// reconcile job — without re-importing the superseded Teach Computing copies beside it.
async function importFromManifest(source: string, manifestPath: string): Promise<void> {
  const lines = (await readFile(manifestPath, 'utf8')).split('\n');
  const rels = lines.map((l) => l.split('\t')[0]?.trim()).filter((x): x is string => !!x);
  console.log(`importing ${rels.length} listed file(s) from ${source} …`);
  for (const rel of rels) {
    const full = join(source, rel);
    const st = await stat(full).catch(() => null);
    if (!st || !st.isFile()) {
      console.error(`  ! missing, skipped: ${rel}`);
      stats.skipped++;
      continue;
    }
    await importFile(full, rel); // listed files import as-is (no zip extraction)
  }
}

async function main(): Promise<void> {
  // Args: <source> [--filter <manifest.tsv>]
  const args = process.argv.slice(2);
  const filterIdx = args.indexOf('--filter');
  const manifest = filterIdx >= 0 ? args[filterIdx + 1] : undefined;
  const source = (filterIdx === 0 ? undefined : args[0]) ?? `${process.env.HOME ?? ''}/Downloads/TeachComputing`;
  const s = await stat(source).catch(() => null);
  if (!s || !s.isDirectory()) {
    console.error(`source directory not found: ${source}`);
    process.exit(1);
  }
  if (manifest) {
    await importFromManifest(source, manifest);
  } else {
    console.log(`importing resources from ${source} …`);
    await importDir(source, '', 0);
  }
  console.log(`done: ${stats.imported} imported, ${stats.skipped} duplicate(s) skipped, ${stats.zips} zip(s) extracted.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
