// Phase 5.3: identifying downloaded units among the imported resources, purely from their
// original folder paths (resource_versions.change_note = "imported from <relative path>").
// A "lesson folder" is a directory named like "Lesson 1 …" or "L2 - …"; its parent is a unit.
// Pure string logic — fully unit-testable, no DB.

const LESSON_DIR = /^(?:lesson|l)\s*\d+\b/i;

export interface UnitCandidate {
  folder: string; // e.g. "KS3/year_7/Unit 1" or "GCSE Lessons/Data Representation"
  lessonCount: number;
  title: string; // a friendly display title (from the unit guide, or the folder name)
}

// A "unit guide / overview / learning graph / curriculum map" file directly in the unit folder names
// the unit far better than an opaque folder ("unit_11") does — parse a human title from it.
const GUIDE_FILE = /unit\s*(?:guide|overview)|learning\s*graph|curriculum\s*map|scheme\s*of\s*work/i;
const KS_TOKEN = /(KS\s?[1-5]|Post.?16|GCSE|IGCSE|A.?Level|BTEC)/i;
const SEP = '[\\s_–\\-:]'; // space, underscore, en-dash, hyphen, colon

function normaliseKs(t: string): string {
  const m = /ks\s?([1-5])/i.exec(t);
  if (m) return `KS${m[1]}`;
  if (/post.?16/i.test(t)) return 'Post-16';
  if (/a.?level/i.test(t)) return 'A-Level';
  return t.toUpperCase(); // GCSE / IGCSE / BTEC
}

function tidy(s: string): string {
  return s.replace(/_+/g, ' ').replace(/\s{2,}/g, ' ').replace(new RegExp(`^${SEP}+|${SEP}+$`, 'g'), '').trim();
}

/** A human title from a guide-file name, e.g. "Unit guide_11_Impacts of technology_KS4_v1.2.docx" →
 *  "Impacts of technology — KS4". null when nothing useful is left. */
function titleFromGuide(filename: string): string | null {
  let s = filename.replace(/\.[a-z0-9]+$/i, ''); // drop extension
  const ks = KS_TOKEN.exec(s)?.[1];
  s = s.replace(new RegExp(`^(?:unit\\s*(?:guide|overview)|learning\\s*graph|curriculum\\s*map|scheme\\s*of\\s*work)`, 'i'), '');
  s = s.replace(new RegExp(`^${SEP}+`), '');
  s = s.replace(new RegExp(`^\\d+${SEP}+`), ''); // a leading unit number, e.g. "11_"
  if (ks) s = s.replace(new RegExp(`${SEP}*${ks.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'i'), ''); // cut at the key-stage token + anything after (incl. version)
  s = s.replace(new RegExp(`${SEP}*v?\\d+(?:\\.\\d+)*\\s*$`, 'i'), ''); // trailing version
  s = tidy(s);
  if (s.length < 2) return null;
  return ks ? `${s} — ${normaliseKs(ks)}` : s;
}

/** The friendly title for a unit folder: a parsed guide-file title if one is present, else the
 *  folder's last segment when it's descriptive, else the raw last segment (e.g. opaque "unit_11"). */
export function deriveUnitTitle(relPaths: string[], folder: string): string {
  const prefix = `${folder}/`;
  const guides: string[] = [];
  for (const p of relPaths) {
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length);
    if (!rest.includes('/') && GUIDE_FILE.test(rest)) guides.push(rest); // a file directly in the folder
  }
  const rank = (n: string): number => (/unit\s*(?:guide|overview)/i.test(n) ? 0 : /learning\s*graph/i.test(n) ? 1 : 2);
  for (const g of guides.sort((a, b) => rank(a) - rank(b))) {
    const t = titleFromGuide(g);
    if (t) return t;
  }
  const last = folder.split('/').pop() ?? folder;
  return /[a-z]{3,}/i.test(last) && !/^unit[_\s-]?\d+$/i.test(last) ? tidy(last) : last;
}

/** Distinct folders that directly contain ≥2 lesson-named subfolders — the convertible units. */
export function unitCandidates(relPaths: string[]): UnitCandidate[] {
  const lessonsByParent = new Map<string, Set<string>>();
  for (const p of relPaths) {
    const segs = p.split('/');
    // walk the directory segments (exclude the final segment — the file)
    for (let i = 1; i < segs.length - 1; i++) {
      const seg = segs[i]!;
      if (LESSON_DIR.test(seg)) {
        const parent = segs.slice(0, i).join('/');
        const set = lessonsByParent.get(parent) ?? new Set<string>();
        set.add(seg);
        lessonsByParent.set(parent, set);
        break; // deeper "Lesson…" dirs belong to this lesson, not a nested unit
      }
    }
  }
  return [...lessonsByParent.entries()]
    .filter(([, lessons]) => lessons.size >= 2)
    .map(([folder, lessons]) => ({ folder, lessonCount: lessons.size, title: deriveUnitTitle(relPaths, folder) }))
    .sort((a, b) => a.title.localeCompare(b.title) || a.folder.localeCompare(b.folder));
}

/** Convert-unit search: candidates whose folder name OR any imported file path inside them contains
 *  the query — so a topic search ("impacts") finds a unit even when its folder is named opaquely
 *  ("unit_11"). Without the content match, only folders whose NAME contains the term surface, which
 *  silently hides the complete copy of a unit when its sibling, partially-imported copy happens to be
 *  the named one. Case-insensitive; empty query ⇒ []. */
export function searchUnits(relPaths: string[], query: string): UnitCandidate[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const lowered = relPaths.map((p) => p.toLowerCase());
  return unitCandidates(relPaths).filter((c) => {
    const f = c.folder.toLowerCase();
    if (f.includes(needle)) return true;
    const prefix = `${f}/`;
    return lowered.some((p) => p.startsWith(prefix) && p.includes(needle));
  });
}

/** Strip packaging noise from a lesson folder name: "_v1.zip", ".zip", version suffixes. */
export function cleanLessonTitle(dirName: string): string {
  return dirName
    .replace(/\.zip$/i, '')
    .replace(/[_ ]v\d+(?:\.\d+)*$/i, '')
    .trim();
}

function lessonNumber(name: string): number {
  const m = /^(?:lesson|l)\s*(\d+)/i.exec(name);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

export interface SourceLesson {
  title: string; // cleaned lesson folder name
  dir: string; // the RAW lesson folder name (matches the imported `change_note` path, for image carry-over)
  files: string[]; // file names within the lesson folder (deduped, capped by caller if needed)
}

/** The teaching structure of one unit folder: its lessons in number order, with their files. */
export function lessonStructure(relPaths: string[], unitFolder: string): SourceLesson[] {
  const prefix = `${unitFolder}/`;
  const filesByLesson = new Map<string, Set<string>>();
  for (const p of relPaths) {
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length);
    const segs = rest.split('/');
    const dir = segs[0]!;
    if (segs.length < 2 || !LESSON_DIR.test(dir)) continue;
    const set = filesByLesson.get(dir) ?? new Set<string>();
    set.add(segs[segs.length - 1]!);
    filesByLesson.set(dir, set);
  }
  return [...filesByLesson.entries()]
    .sort((a, b) => lessonNumber(a[0]) - lessonNumber(b[0]) || a[0].localeCompare(b[0]))
    .map(([dir, files]) => ({ title: cleanLessonTitle(dir), dir, files: [...files].sort() }));
}
