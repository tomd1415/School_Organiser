// File-store helpers for resources. Storage paths in the DB are relative; these
// resolve them against RESOURCE_STORE_PATH so the same rows work on the host
// (import/backups) and in the container (the app).
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { RESOURCE_STORE_PATH } from '../config/resources';

export function checksum(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

export function relPathFor(resourceId: number, versionNo: number, filename: string): string {
  return `${resourceId}/${versionNo}-${filename}`;
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
