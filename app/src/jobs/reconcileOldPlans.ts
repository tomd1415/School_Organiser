// Reconcile the teacher's old, hand-organised lesson folder against the freshly
// downloaded *pristine* Teach Computing units, so their OWN work is separated from
// superseded copies that the new downloads already supply.
//
//   cd app && npm run reconcile                       # defaults below
//   cd app && npm run reconcile -- <old-dir> <pristine-dir> [<pristine-dir> ...]
//
// Report-only: it changes nothing and imports nothing. It writes manifests to
// data/reconcile-report/ and prints a summary. Re-run as the GCSE download grows.
//
// Each old file lands in one of three buckets:
//   EXACT    — byte-identical to a pristine file (incl. files inside the unit .zips).
//              Superseded; the new download already has it. Safe to ignore.
//   MODIFIED — same filename as a pristine file but different bytes. Almost always a
//              Teach Computing file you edited — review and keep your version if wanted.
//   UNIQUE   — filename appears nowhere in the pristine units. Your own creation
//              (custom code, data, worksheets) — this is what must be preserved.
import AdmZip from 'adm-zip';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';

const HOME = process.env.HOME ?? '';
const TC = `${HOME}/Downloads/TeachComputing`;
const OLD = process.argv[2] ?? `${TC}/old_lesson_plan`;
const PRISTINE = process.argv.length > 3 ? process.argv.slice(3) : [`${TC}/KS3`, `${TC}/GCSE`];
const OUT = join(process.cwd(), '..', 'data', 'reconcile-report');

const SKIP = new Set(['Thumbs.db', '.DS_Store', '.mounttest']);

// Heuristic: does this filename follow Teach Computing's naming convention? TC files are
// named "L1 Slides - <unit> - Y8.pptx", "A2 Worksheet - <topic>.docx", "Unit overview ...",
// etc. The teacher's own files don't (year10-sept-2024.py, dbSwim.sqbpro, testing grid.xlsx).
// This separates TC-derived from genuinely-own work EVEN for units not yet downloaded.
function isTcName(base: string): boolean {
  const b = base.toLowerCase();
  if (/^(l|a)\d+[ _.\-]/.test(b)) return true; // L1 / A2 prefixed
  if (/^(ap|as) /.test(b)) return true; // AP/AS answer & activity sheets
  if (/^lesson \d+/.test(b)) return true;
  if (/ -\s*y[789]\b/.test(b)) return true; // "- Y8" year suffix, any spacing
  return /(lesson plan|slides|worksheet|handout|unit overview|summative|learning graph|knowledge organiser|solutions?|exemplar|assessment|activity|resource|change ?log|homework|starter|objectives|vocabulary)/.test(
    b,
  );
}
const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex');
const lower = (s: string): string => s.toLowerCase();
const isZip = (n: string): boolean => lower(n).endsWith('.zip');
const isPart = (n: string): boolean => lower(n).endsWith('.part');

// Pristine index: every filename and every content hash the new downloads provide,
// reaching inside the unit .zips so an extracted-but-unchanged file still counts.
const pNames = new Set<string>();
const pHashes = new Set<string>();

interface Rec {
  path: string;
  size: number;
  ext: string;
  top: string; // first path segment under OLD — GCSE Lessons / KS3 Lessons
  unit: string; // the unit folder, e.g. "KS3 Lessons/Year 8/Introduction to Python"
}

// The unit a file belongs to, so we can report per-unit how much of it the pristine
// download already covers. A unit sitting at ~0% matched simply hasn't downloaded yet.
function unitKey(rel: string): string {
  const s = rel.split('/');
  if (s[0] === 'KS3 Lessons' && s.length >= 3) return s.slice(0, 3).join('/');
  if (s[0] === 'GCSE Lessons' && s.length >= 2) return s.slice(0, 2).join('/');
  return s[0] ?? '(root)';
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e.name) || e.name === '__MACOSX') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

function indexZip(zipPath: string): void {
  try {
    for (const entry of new AdmZip(zipPath).getEntries()) {
      if (entry.isDirectory) continue;
      if (entry.entryName.includes('__MACOSX/')) continue; // Mac zip resource-fork junk
      const name = basename(entry.entryName);
      if (!name || SKIP.has(name) || name.startsWith('._')) continue;
      pNames.add(lower(name));
      try {
        pHashes.add(sha(entry.getData()));
      } catch {
        /* unreadable entry — name still indexed */
      }
    }
  } catch (err) {
    console.error(`  ! could not read zip ${basename(zipPath)}: ${(err as Error).message}`);
  }
}

async function buildPristine(): Promise<void> {
  for (const root of PRISTINE) {
    for await (const f of walk(root)) {
      if (isPart(f)) continue; // in-progress browser download
      pNames.add(lower(basename(f)));
      if (isZip(f)) indexZip(f);
      try {
        pHashes.add(sha(await readFile(f)));
      } catch {
        /* unreadable — name still indexed */
      }
    }
  }
}

function tsv(recs: Rec[]): string {
  return recs
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((r) => `${r.path}\t${r.size}`)
    .join('\n');
}

function tally(recs: Rec[], key: (r: Rec) => string): string {
  const counts = new Map<string, { n: number; bytes: number }>();
  for (const r of recs) {
    const k = key(r) || '(none)';
    const cur = counts.get(k) ?? { n: 0, bytes: 0 };
    cur.n += 1;
    cur.bytes += r.size;
    counts.set(k, cur);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .map(([k, v]) => `  ${String(v.n).padStart(5)}  ${mb(v.bytes).padStart(8)}  ${k}`)
    .join('\n');
}

const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

async function main(): Promise<void> {
  const src = await stat(OLD).catch(() => null);
  if (!src || !src.isDirectory()) {
    console.error(`old-plan directory not found: ${OLD}`);
    process.exit(1);
  }
  console.log(`reconciling ${OLD}`);
  console.log(`against pristine: ${PRISTINE.join(', ')}\n`);

  await buildPristine();
  console.log(`pristine index: ${pNames.size} distinct filenames, ${pHashes.size} content hashes`);

  const exact: Rec[] = [];
  const modified: Rec[] = [];
  const unique: Rec[] = [];
  for await (const f of walk(OLD)) {
    if (isPart(f)) continue;
    const rel = relative(OLD, f);
    const name = lower(basename(f));
    let h = '';
    let size = 0;
    try {
      const buf = await readFile(f);
      h = sha(buf);
      size = buf.length;
    } catch {
      size = (await stat(f).catch(() => null))?.size ?? 0;
    }
    const seg = rel.split('/');
    const rec: Rec = {
      path: rel,
      size,
      ext: lower(extname(name)) || '(none)',
      top: seg[0] ?? '(root)',
      unit: unitKey(rel),
    };
    if (h && pHashes.has(h)) exact.push(rec);
    else if (pNames.has(name)) modified.push(rec);
    else unique.push(rec);
  }

  // Per-unit coverage: matched (exact+modified) vs unique. Low coverage ⇒ that unit's
  // pristine zip is not downloaded yet, so its "unique" files are not yet meaningful.
  const cover = new Map<string, { matched: number; uniq: number }>();
  const bump = (r: Rec, k: 'matched' | 'uniq'): void => {
    const c = cover.get(r.unit) ?? { matched: 0, uniq: 0 };
    c[k] += 1;
    cover.set(r.unit, c);
  };
  for (const r of [...exact, ...modified]) bump(r, 'matched');
  for (const r of unique) bump(r, 'uniq');
  const coverageLines = [...cover.entries()]
    .map(([unit, c]) => ({ unit, ...c, total: c.matched + c.uniq, pct: Math.round((100 * c.matched) / (c.matched + c.uniq)) }))
    .sort((a, b) => a.pct - b.pct || b.uniq - a.uniq)
    .map((u) => `  ${String(u.pct).padStart(3)}% matched  ${String(u.uniq).padStart(4)} unique / ${String(u.total).padStart(4)} total  ${u.unit}`)
    .join('\n');

  // The actionable subset: unique AND not Teach-Computing-named ⇒ your own creation.
  // Robust to the in-progress download (doesn't rely on the pristine unit being present).
  const likelyOwn = unique.filter((r) => !isTcName(basename(r.path)));

  // Download-independent split: classify ALL old files purely by naming convention.
  // This is the number to trust, because the new download is a *different version* of the
  // curriculum (renamed units, new file-naming, en-dashes) — so matching old↔new largely
  // fails even once everything is downloaded. Naming never matches against the pristine set.
  const allOld = [...exact, ...modified, ...unique];
  const ownAll = allOld.filter((r) => !isTcName(basename(r.path)));
  const tcAll = allOld.filter((r) => isTcName(basename(r.path)));

  const total = exact.length + modified.length + unique.length;
  const sumBytes = (r: Rec[]): number => r.reduce((s, x) => s + x.size, 0);
  const summary = [
    `Reconciliation report — ${OLD}`,
    `Pristine sources: ${PRISTINE.join(', ')}`,
    ``,
    `Total old files: ${total}`,
    `  EXACT    ${String(exact.length).padStart(5)}  ${mb(sumBytes(exact)).padStart(8)}  superseded — the new download already has these, byte-identical`,
    `  MODIFIED ${String(modified.length).padStart(5)}  ${mb(sumBytes(modified)).padStart(8)}  same name, your edits — review`,
    `  UNIQUE   ${String(unique.length).padStart(5)}  ${mb(sumBytes(unique)).padStart(8)}  not in the pristine download (inflated while it is still arriving)`,
    `    of which LIKELY-OWN ${String(likelyOwn.length).padStart(5)}  ${mb(sumBytes(likelyOwn)).padStart(8)}  unique AND not Teach-Computing-named — your own work, preserve these`,
    ``,
    `Download-independent split (by TC naming — robust to the version/structure changes):`,
    `  YOUR OWN ${String(ownAll.length).padStart(5)}  ${mb(sumBytes(ownAll)).padStart(8)}  not TC-named — your creations (preserve)`,
    `  TC FILES ${String(tcAll.length).padStart(5)}  ${mb(sumBytes(tcAll)).padStart(8)}  TC curriculum — the new download supersedes these, even across versions`,
    `           (of those, ${exact.length} are byte-identical to a file you have already re-downloaded)`,
    ``,
    `LIKELY-OWN by file type:`,
    tally(likelyOwn, (r) => r.ext),
    ``,
    `LIKELY-OWN by unit:`,
    tally(likelyOwn, (r) => r.unit),
    ``,
    `Per-unit coverage (low % ⇒ that unit is not downloaded yet — ignore its "unique" for now):`,
    coverageLines,
    ``,
    `UNIQUE by file type:`,
    tally(unique, (r) => r.ext),
    ``,
    `UNIQUE by top-level folder:`,
    tally(unique, (r) => r.top),
    ``,
    `MODIFIED by file type:`,
    tally(modified, (r) => r.ext),
    ``,
  ].join('\n');

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'summary.txt'), summary);
  await writeFile(join(OUT, 'unique.tsv'), tsv(unique));
  await writeFile(join(OUT, 'likely-own.tsv'), tsv(likelyOwn));
  await writeFile(join(OUT, 'own.tsv'), tsv(ownAll));
  await writeFile(join(OUT, 'modified.tsv'), tsv(modified));
  await writeFile(join(OUT, 'exact-dup.tsv'), tsv(exact));

  console.log(`\n${summary}`);
  console.log(`manifests written to ${OUT}/ (summary.txt, unique.tsv, modified.tsv, exact-dup.tsv)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
