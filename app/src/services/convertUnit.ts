// Phase 5.3: identifying downloaded units among the imported resources, purely from their
// original folder paths (resource_versions.change_note = "imported from <relative path>").
// A "lesson folder" is a directory named like "Lesson 1 …" or "L2 - …"; its parent is a unit.
// Pure string logic — fully unit-testable, no DB.

const LESSON_DIR = /^(?:lesson|l)\s*\d+\b/i;

export interface UnitCandidate {
  folder: string; // e.g. "KS3/year_7/Unit 1" or "GCSE Lessons/Data Representation"
  lessonCount: number;
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
    .map(([folder, lessons]) => ({ folder, lessonCount: lessons.size }))
    .sort((a, b) => a.folder.localeCompare(b.folder));
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
