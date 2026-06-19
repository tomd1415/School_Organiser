// Web bulk import: securely take an uploaded archive OR a whole selected folder (webkitdirectory),
// stage it for review, then import the chosen files into the resource store (checksum-dedup, like the
// CLI importer). adm-zip only — a .docx is itself a zip, so its text is pulled the same way (no
// Gotenberg). NEVER extractAllTo: we sanitise every path to defeat zip-slip.
//
// Units: a unit folder is usually named by a bare number (ambiguous — many units share a number), with
// a Word doc describing it and lesson zips beside it. We read that doc (AI) for the unit NAME + YEAR
// GROUP and stamp them on every file in the unit, and we record a normalised "Year / Unit / Lesson N"
// path so the scheme-author "convert a downloaded unit" tool can find and group them.
import AdmZip from 'adm-zip';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { absPath, checksum, relPathFor, storeBuffer } from '../lib/resourceStore';
import { addVersion, createResource, findResourceByChecksum, setResourceUnit } from '../repos/resources';
import { kindFromFilename, mimeFromFilename, safeFilename } from './resource';

const MAX_FILES = 3000;
const MAX_TOTAL_BYTES = 400 * 1024 * 1024; // uncompressed
const MAX_DEPTH = 6; // nested-zip recursion
const SKIP_NAMES = new Set(['Thumbs.db', '.DS_Store', 'desktop.ini']);
const UUID_RE = /^[0-9a-f-]{36}$/;
const LESSON_SEG = /^(?:lesson|l)\s*\d+\b/i;

export interface StagedFile {
  path: string; // clean logical path within the upload, e.g. "11/Lesson 1/slides.pptx"
  name: string;
  bytes: number;
  duplicate: boolean; // already in the store (matched by checksum)
}
export interface ImportGroup {
  folder: string; // the unit folder ('' = root unit or the loose bucket)
  isUnit: boolean; // a detected unit folder (a description doc + lesson sub-folders) vs loose files
  description: string; // the unit Word-doc text in this folder, capped
  files: StagedFile[];
}
export interface ExtractResult {
  batchId: string;
  groups: ImportGroup[];
  fileCount: number;
  truncated: boolean; // hit a cap (file count / bytes / depth)
}
export interface UploadEntry {
  relPath: string; // path as the browser/zip provides it (sanitised inside)
  buf: Buffer;
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
      .slice(0, 6000);
  } catch {
    return '';
  }
}

/** A sensible default title from a filename (drop extension, de-underscore). */
export function defaultTitle(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || name;
}

function dirOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i < 0 ? '' : p.slice(0, i);
}

interface Acc {
  base: string;
  files: StagedFile[];
  docxByDir: Map<string, string[]>; // logical dir → text of the .docx files directly in it
  count: number;
  bytes: number;
  truncated: boolean;
}

/** Stage one logical entry; recurse transparently into a nested .zip (its name becomes a directory). */
async function stageEntry(logicalPath: string, buf: Buffer, depth: number, acc: Acc): Promise<void> {
  if (acc.count >= MAX_FILES || acc.bytes >= MAX_TOTAL_BYTES) {
    acc.truncated = true;
    return;
  }
  const name = basename(logicalPath);
  if (name.toLowerCase().endsWith('.zip')) {
    await stageZip(buf, logicalPath.replace(/\.zip$/i, ''), depth + 1, acc);
    return;
  }
  const absDest = join(acc.base, logicalPath);
  if (absDest !== acc.base && !absDest.startsWith(`${acc.base}/`)) return; // defence in depth
  await mkdir(dirname(absDest), { recursive: true });
  await writeFile(absDest, buf);
  acc.count += 1;
  acc.bytes += buf.length;
  acc.files.push({ path: logicalPath, name, bytes: buf.length, duplicate: Boolean(await findResourceByChecksum(checksum(buf))) });

  if (name.toLowerCase().endsWith('.docx')) {
    const t = docxText(buf);
    if (t) {
      const d = dirOf(logicalPath);
      const arr = acc.docxByDir.get(d) ?? [];
      arr.push(t);
      acc.docxByDir.set(d, arr);
    }
  }
}

async function stageZip(zipBuf: Buffer, baseDir: string, depth: number, acc: Acc): Promise<void> {
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
    let inner: Buffer;
    try {
      inner = e.getData();
    } catch {
      continue;
    }
    if (inner.length === 0) continue;
    await stageEntry(baseDir ? `${baseDir}/${rel}` : rel, inner, depth, acc);
  }
}

// A unit folder = a directory that directly holds a .docx (the unit description) AND has at least one
// sub-directory (the lessons live under it). That distinguishes it from a lesson folder, whose own
// .docx (a worksheet) sits beside content files with no further sub-directory.
function detectUnitFolders(paths: string[], docxByDir: Map<string, string[]>): string[] {
  const out: string[] = [];
  for (const dir of docxByDir.keys()) {
    const prefix = dir === '' ? '' : `${dir}/`;
    const hasSubdir = paths.some((p) => p.startsWith(prefix) && p.slice(prefix.length).includes('/'));
    if (hasSubdir) out.push(dir);
  }
  return out.sort((a, b) => b.length - a.length); // deepest first, so nested units win
}

function nearestUnit(path: string, unitsDeepestFirst: string[]): string | null {
  for (const u of unitsDeepestFirst) {
    if (u === '' || path.startsWith(`${u}/`)) return u;
  }
  return null;
}

function buildGroups(acc: Acc): ImportGroup[] {
  const paths = acc.files.map((f) => f.path);
  const units = detectUnitFolders(paths, acc.docxByDir);
  const byFolder = new Map<string, StagedFile[]>();
  const loose: StagedFile[] = [];
  for (const f of acc.files) {
    const u = nearestUnit(f.path, units);
    if (u === null) loose.push(f);
    else {
      const a = byFolder.get(u) ?? [];
      a.push(f);
      byFolder.set(u, a);
    }
  }
  const groups: ImportGroup[] = [...byFolder.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([folder, files]) => ({
      folder,
      isUnit: true,
      description: (acc.docxByDir.get(folder) ?? []).join('\n\n').slice(0, 6000),
      files: files.sort((a, b) => a.path.localeCompare(b.path)),
    }));
  if (loose.length) groups.push({ folder: '', isUnit: false, description: '', files: loose.sort((a, b) => a.path.localeCompare(b.path)) });
  return groups;
}

async function newBatch(): Promise<{ batchId: string; acc: Acc }> {
  const batchId = randomUUID();
  const base = absPath(join('imports', batchId));
  await mkdir(base, { recursive: true });
  return { batchId, acc: { base, files: [], docxByDir: new Map(), count: 0, bytes: 0, truncated: false } };
}

/** Extract one uploaded .zip (it may hold nested zips + per-unit Word descriptions). */
export async function extractArchive(zipBuf: Buffer): Promise<ExtractResult> {
  const { batchId, acc } = await newBatch();
  await stageZip(zipBuf, '', 0, acc);
  return { batchId, groups: buildGroups(acc), fileCount: acc.files.length, truncated: acc.truncated };
}

/** Extract a whole selected folder: many files, each carrying its relative path (webkitdirectory). */
export async function extractFolder(entries: UploadEntry[]): Promise<ExtractResult> {
  const { batchId, acc } = await newBatch();
  for (const e of entries) {
    const rel = safeRel(e.relPath);
    if (rel) await stageEntry(rel, e.buf, 0, acc);
  }
  return { batchId, groups: buildGroups(acc), fileCount: acc.files.length, truncated: acc.truncated };
}

function cleanSeg(s: string): string {
  return s.replace(/[\\/]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 80);
}

/** Normalise the lesson directory: a bare/leading number becomes "Lesson N …" so it is recognisable. */
function lessonSeg(seg: string): string {
  if (LESSON_SEG.test(seg)) return seg;
  const m = /^0*(\d+)\b[\s_–\-:.]*(.*)$/.exec(seg);
  if (m) return `Lesson ${m[1]}${m[2] ? ` ${m[2].trim()}` : ''}`.trim();
  return seg;
}

// The path recorded in change_note (which the scheme-author "convert a downloaded unit" tool reads to
// group units + lessons). We normalise opaque numbers to "Year group / Unit name / Lesson N / file" so
// units sharing a bare number stay distinct and the lesson folders are recognisable.
export function buildStorePath(yearGroup: string, unit: string, unitFolder: string, originalPath: string): string {
  let rest = originalPath;
  if (unitFolder && originalPath.startsWith(`${unitFolder}/`)) rest = originalPath.slice(unitFolder.length + 1);
  const segs = rest.split('/').filter(Boolean);
  if (segs.length >= 2) segs[0] = lessonSeg(segs[0]!); // the first dir under the unit is the lesson
  const head = [yearGroup, unit].map(cleanSeg).filter(Boolean);
  const tail = segs.map((s, i) => (i < segs.length - 1 ? cleanSeg(s) : safeFilename(basename(s))));
  return [...head, ...tail].filter(Boolean).join('/') || originalPath;
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
  path: string; // staged logical path — where the bytes are read from
  title: string;
  unit: string; // '' if none
  yearGroup: string; // ''
  storePath: string; // normalised path recorded in change_note (year/unit/lesson/file)
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
    const storePath = (item.storePath || item.path).slice(0, 500);
    await addVersion(id, rel, buf.length, sum, 'teacher', `imported from ${storePath}`);
    if (item.unit || item.yearGroup) await setResourceUnit(id, item.unit || null, item.yearGroup || null);
    res.imported += 1;
  }
  await cleanupBatch(batchId);
  return res;
}

export async function cleanupBatch(batchId: string): Promise<void> {
  if (!UUID_RE.test(batchId)) return;
  await rm(absPath(join('imports', batchId)), { recursive: true, force: true }).catch(() => {});
}
