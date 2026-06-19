// File-store helpers for resources. Storage paths in the DB are relative; these
// resolve them against RESOURCE_STORE_PATH so the same rows work on the host
// (import/backups) and in the container (the app).
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { RESOURCE_STORE_PATH } from '../config/resources';

export function checksum(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

// BUG-008: the version number here is only a human-readable prefix — a random token makes the path
// unique regardless. Previously the path was `<id>/<versionNo>-<filename>`, so two concurrent appends
// (which both pre-compute the same next version number) wrote to the SAME file and one silently
// clobbered the other. Storage paths are opaque once written (reads use the stored value, never
// reconstruct), so the token is safe; addVersion still allocates the authoritative version_no in the DB.
export function relPathFor(resourceId: number, versionNo: number, filename: string): string {
  return `${resourceId}/${versionNo}-${randomBytes(4).toString('hex')}-${filename}`;
}

export function absPath(relPath: string): string {
  return join(RESOURCE_STORE_PATH, relPath);
}

export async function storeBuffer(relPath: string, buf: Buffer): Promise<void> {
  const abs = absPath(relPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buf);
}

export async function readStored(relPath: string): Promise<Buffer> {
  return readFile(absPath(relPath));
}

// Best-effort delete of one stored file — used by pupil erasure to remove pasted screenshots
// (DATA_MODEL §O, DPIA §7). Guards against escaping the store; a missing file is a no-op.
export async function removeStored(relPath: string): Promise<void> {
  if (relPath.includes('..')) return;
  await rm(absPath(relPath), { force: true });
}

/** BUG-008: stage a file, then run `commit` (typically the addVersion that records it). If `commit`
 *  throws — e.g. the version write rolled back — the just-staged file is removed so a failed write never
 *  leaves an orphan on disk. Repo-free: the DB call lives in the caller's callback, so this stays a lib. */
export async function withStagedFile<T>(relPath: string, buf: Buffer, commit: () => Promise<T>): Promise<T> {
  await storeBuffer(relPath, buf);
  try {
    return await commit();
  } catch (err) {
    await removeStored(relPath).catch(() => {});
    throw err;
  }
}
