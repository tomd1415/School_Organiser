// Web bulk import: securely extract an uploaded archive (nested zips, per-zip Word descriptions),
// stage it for review, then import the chosen files into the resource store (checksum-dedup, like the
// CLI importer). adm-zip only — a .docx is itself a zip, so its text is pulled the same way (no
// Gotenberg). NEVER extractAllTo: we iterate entries and sanitise each path to defeat zip-slip.
import AdmZip from 'adm-zip';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { absPath, checksum, relPathFor, storeBuffer } from '../lib/resourceStore';
import { addVersion, createResource, findResourceByChecksum } from '../repos/resources';
import { kindFromFilename, mimeFromFilename, safeFilename } from './resource';

const MAX_FILES = 3000;
const MAX_TOTAL_BYTES = 400 * 1024 * 1024; // uncompressed
const MAX_DEPTH = 4; // nested-zip recursion
const SKIP_NAMES = new Set(['Thumbs.db', '.DS_Store', 'desktop.ini']);
const UUID_RE = /^[0-9a-f-]{36}$/;

export interface StagedFile {
  path: string; // relative to the batch dir, e.g. "topic-A/worksheet.pdf"
  name: string;
  source: string; // the zip group it came from ('' = loose at the top level)
  bytes: number;
  duplicate: boolean; // already in the store (matched by checksum)
}
export interface ImportGroup {
  source: string;
  description: string; // concatenated .docx text in this group, capped
  files: StagedFile[];
}
export interface ExtractResult {
  batchId: string;
  groups: ImportGroup[];
  fileCount: number;
  truncated: boolean; // hit a cap (file count / bytes / depth)
}

/** Reject zip-slip and noise; return a clean relative path, or null to skip the entry. */
export function safeRel(entryName: string): string | null {
  const norm = entryName.replace(/\\/g, '/');
  if (norm.startsWith('/') || /^[a-zA-Z]:/.test(norm)) return null; // absolute / drive path
  const parts: string[] = [];
  for (const p of norm.split('/')) {
    if (!p || p === '.') continue;
    if (p === '..') return null; // directory traversal
    if (p.startsWith('__MACOSX') || p.startsWith('.') || SKIP_NAMES.has(p)) return null;
    parts.push(p);
  }
  return parts.length ? parts.join('/') : null;
}

/** Plain-ish text of a .docx (it's a zip; read word/document.xml, strip tags), capped. */
export function docxText(buf: Buffer): string {
  try {
    const xml = new AdmZip(buf).getEntry('word/document.xml')?.getData().toString('utf8') ?? '';
    return xml
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim()
      .slice(0, 4000);
  } catch {
    return '';
  }
}

/** A sensible default title from a filename (drop extension, de-underscore). */
export function defaultTitle(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || name;
}

interface Acc {
  files: StagedFile[];
  descByGroup: Map<string, string[]>;
  count: number;
  bytes: number;
  truncated: boolean;
}

async function walkZip(zipBuf: Buffer, base: string, subDir: string, source: string, depth: number, acc: Acc): Promise<void> {
  if (depth > MAX_DEPTH) {
    acc.truncated = true;
    return;
  }
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuf);
  } catch {
    return;
  }
  for (const e of zip.getEntries()) {
    if (e.isDirectory) continue;
    if (acc.count >= MAX_FILES || acc.bytes >= MAX_TOTAL_BYTES) {
      acc.truncated = true;
      return;
    }
    const rel = safeRel(e.entryName);
    if (!rel) continue;
    const name = basename(rel);
    let buf: Buffer;
    try {
      buf = e.getData();
    } catch {
      continue;
    }
    if (buf.length === 0) continue;

    if (name.toLowerCase().endsWith('.zip')) {
      await walkZip(buf, base, join(subDir, rel), source ? `${source} › ${rel}` : rel, depth + 1, acc);
      continue;
    }

    const stagedRel = join(subDir, rel);
    const absDest = join(base, stagedRel);
    await mkdir(dirname(absDest), { recursive: true });
    await writeFile(absDest, buf);
    acc.count += 1;
    acc.bytes += buf.length;
    acc.files.push({ path: stagedRel, name, source, bytes: buf.length, duplicate: Boolean(await findResourceByChecksum(checksum(buf))) });

    if (name.toLowerCase().endsWith('.docx')) {
      const t = docxText(buf);
      if (t) {
        const arr = acc.descByGroup.get(source) ?? [];
        arr.push(t);
        acc.descByGroup.set(source, arr);
      }
    }
  }
}

export async function extractArchive(zipBuf: Buffer): Promise<ExtractResult> {
  const batchId = randomUUID();
  const base = absPath(join('imports', batchId));
  await mkdir(base, { recursive: true });
  const acc: Acc = { files: [], descByGroup: new Map(), count: 0, bytes: 0, truncated: false };
  await walkZip(zipBuf, base, '', '', 0, acc);

  const bySource = new Map<string, StagedFile[]>();
  for (const f of acc.files) {
    const a = bySource.get(f.source) ?? [];
    a.push(f);
    bySource.set(f.source, a);
  }
  const groups: ImportGroup[] = [...bySource.entries()]
    .map(([source, files]) => ({
      source,
      description: (acc.descByGroup.get(source) ?? []).join('\n\n').slice(0, 4000),
      files: files.sort((a, b) => a.path.localeCompare(b.path)),
    }))
    .sort((a, b) => a.source.localeCompare(b.source));

  return { batchId, groups, fileCount: acc.files.length, truncated: acc.truncated };
}

/** Resolve a posted (batch, relPath) to an absolute path, or null if it escapes the batch dir. */
function safeBatchPath(batchId: string, relPath: string): string | null {
  if (!UUID_RE.test(batchId)) return null;
  const cleanRel = relPath.replace(/\\/g, '/');
  if (cleanRel.includes('..') || cleanRel.startsWith('/')) return null;
  const baseAbs = absPath(join('imports', batchId));
  const abs = absPath(join('imports', batchId, cleanRel));
  return abs.startsWith(`${baseAbs}/`) ? abs : null;
}

export interface CommitItem {
  path: string;
  title: string;
}
export interface CommitResult {
  imported: number;
  skipped: number;
  failed: number;
}

export async function commitImport(batchId: string, items: CommitItem[]): Promise<CommitResult> {
  const res: CommitResult = { imported: 0, skipped: 0, failed: 0 };
  for (const item of items) {
    const abs = safeBatchPath(batchId, item.path);
    if (!abs) {
      res.failed += 1;
      continue;
    }
    let buf: Buffer;
    try {
      buf = await readFile(abs);
    } catch {
      res.failed += 1;
      continue;
    }
    if (buf.length === 0) {
      res.failed += 1;
      continue;
    }
    const sum = checksum(buf);
    if (await findResourceByChecksum(sum)) {
      res.skipped += 1;
      continue;
    }
    const name = safeFilename(basename(item.path));
    const title = (item.title || '').trim().slice(0, 200) || defaultTitle(name);
    const id = await createResource(title, kindFromFilename(name), mimeFromFilename(name), 'imported');
    const rel = relPathFor(id, 1, name);
    await storeBuffer(rel, buf);
    await addVersion(id, rel, buf.length, sum, 'teacher', 'imported from archive');
    res.imported += 1;
  }
  await cleanupBatch(batchId);
  return res;
}

export async function cleanupBatch(batchId: string): Promise<void> {
  if (!UUID_RE.test(batchId)) return;
  await rm(absPath(join('imports', batchId)), { recursive: true, force: true }).catch(() => {});
}
