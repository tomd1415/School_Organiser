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
import { addVersion, createResource, findResourceByChecksum } from '../repos/resources';
import { checksum, relPathFor, storeBuffer } from '../lib/resourceStore';
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
  const id = await createResource(filename, kindFromFilename(filename), mimeFromFilename(filename), 'imported');
  const rel = relPathFor(id, 1, filename);
  await storeBuffer(rel, buf);
  await addVersion(id, rel, buf.length, sum, 'teacher', `imported from ${sourceRel}`);
  stats.imported++;
}

async function importDir(dir: string, sourcePrefix: string, depth: number): Promise<void> {
  if (depth > 8) return;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
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

async function main(): Promise<void> {
  const source = process.argv[2] ?? `${process.env.HOME ?? ''}/Downloads/TeachComputing`;
  const s = await stat(source).catch(() => null);
  if (!s || !s.isDirectory()) {
    console.error(`source directory not found: ${source}`);
    process.exit(1);
  }
  console.log(`importing resources from ${source} …`);
  await importDir(source, '', 0);
  console.log(`done: ${stats.imported} imported, ${stats.skipped} duplicate(s) skipped, ${stats.zips} zip(s) extracted.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
