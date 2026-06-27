// Phase 17 — PURE structure logic for the reference-lesson library (no DB, no AI, no filesystem): parse a
// Teach Computing file path into its (key stage, year, unit, lesson) coordinates, classify the file, and
// infer an activity type from its name. The importer (17.1) and the structure-link (17.2) read these; the
// AI overview (17.2) and the 4.8 GB bulk import drive these against real / fixture files.

const KS_SEG = /^(KS[1-4]|GCSE|KS4[_ ]?non[_ ]?GCSE|Post[_ ]?16|A[_ ]?Level)$/i;
const YEAR_SEG = /^year[_ ]?(\d{1,2})$/i;
const UNIT_SEG = /^unit[_ ]?(\d{1,2})$/i;
const LESSON_FILE = /^(?:lesson|l)\s*(\d+)\b/i;
const GUIDE_FILE = /unit\s*(?:guide|overview)|learning\s*graph|curriculum\s*map|scheme\s*of\s*work|teacher\s*guide/i;

export interface TccCoords {
  keyStage: string | null; // 'KS3', 'GCSE', 'KS4_non_GCSE', …
  yearGroup: number | null; // 7 from 'year_7'
  unitFolder: string | null; // 'unit_1'
  unitKey: string | null; // normalised 'KS3:Y7:unit_1' — the join key for resources.tcc_unit_key
  lessonNo: number | null; // 2 from 'Lesson 2 …'
  kind: 'lesson' | 'guide' | 'other';
  fileName: string;
}

function normaliseKs(seg: string): string {
  const s = seg.replace(/\s+/g, '_');
  const m = /^ks([1-4])$/i.exec(s);
  if (m) return `KS${m[1]}`;
  if (/^ks4[_]?non[_]?gcse$/i.test(s)) return 'KS4_non_GCSE';
  if (/^post[_]?16$/i.test(s)) return 'Post16';
  if (/^a[_]?level$/i.test(s)) return 'A_Level';
  return s.toUpperCase();
}

/** Parse a Teach Computing relative path (e.g. 'KS3/year_7/unit_1/Lesson 2 …_v1.zip') into its coords. */
export function parseTccPath(relPath: string): TccCoords {
  const segs = relPath.split('/').filter((s) => s.length > 0);
  const fileName = segs[segs.length - 1] ?? '';
  let keyStage: string | null = null;
  let yearGroup: number | null = null;
  let unitFolder: string | null = null;
  for (const seg of segs.slice(0, -1)) {
    if (!keyStage && KS_SEG.test(seg)) keyStage = normaliseKs(seg);
    const y = YEAR_SEG.exec(seg);
    if (y) yearGroup = Number(y[1]);
    const u = UNIT_SEG.exec(seg);
    if (u) unitFolder = `unit_${u[1]}`;
  }
  const unitKey = keyStage && unitFolder ? `${keyStage}:${yearGroup != null ? `Y${yearGroup}` : '-'}:${unitFolder}` : null;
  const lessonMatch = LESSON_FILE.exec(fileName);
  const lessonNo = lessonMatch ? Number(lessonMatch[1]) : null;
  const kind: TccCoords['kind'] = GUIDE_FILE.test(fileName) ? 'guide' : lessonNo != null ? 'lesson' : 'other';
  return { keyStage, yearGroup, unitFolder, unitKey, lessonNo, kind, fileName };
}

// ── 17.3: activity-type inference from a lesson's name/headings (a starting point; teacher-overridable) ──
export interface ActivityTypeDef {
  code: string;
  name: string;
  description: string;
  keywords: string[];
}

export const ACTIVITY_TYPES: ActivityTypeDef[] = [
  { code: 'unplugged', name: 'Unplugged', description: 'Away from the computer — physical / paper activity', keywords: ['unplugged', 'card sort', 'cards', 'paper', 'role play', 'physical'] },
  { code: 'parsons', name: 'Parsons problem', description: 'Re-order jumbled code lines into a working program', keywords: ['parsons', 'jumbled', 're-order', 'reorder', 'rearrange code'] },
  { code: 'code_trace', name: 'Code trace', description: 'Read and predict what code does, line by line', keywords: ['trace', 'predict', 'dry run', 'walkthrough', 'what does this code'] },
  { code: 'predict_run_investigate', name: 'Predict–Run–Investigate', description: 'PRIMM — predict, run, then investigate', keywords: ['primm', 'predict run', 'investigate', 'predict, run'] },
  { code: 'debugging', name: 'Debugging challenge', description: 'Find and fix the bugs in a broken program', keywords: ['debug', 'fix the', 'find the error', 'broken', 'bug'] },
  { code: 'worksheet', name: 'Worksheet', description: 'Structured questions to work through', keywords: ['worksheet', 'questions', 'workbook'] },
  { code: 'quiz', name: 'Quiz', description: 'Multiple-choice / quick-fire recall', keywords: ['quiz', 'multiple choice', 'kahoot', 'recall'] },
  { code: 'project', name: 'Project', description: 'Build a larger artefact over the lesson', keywords: ['project', 'make a', 'build a', 'create a', 'design a', 'animation', 'game'] },
  { code: 'investigation', name: 'Investigation', description: 'Explore / research a topic and report', keywords: ['investigate', 'research', 'explore', 'find out'] },
  { code: 'discussion', name: 'Discussion', description: 'Talk-based — paired / class discussion', keywords: ['discuss', 'talk', 'debate', 'think pair share'] },
];

/** Infer an activity-type code from a lesson title / heading text, or null when nothing matches. */
export function inferActivityType(text: string): string | null {
  const t = text.toLowerCase();
  for (const a of ACTIVITY_TYPES) {
    if (a.keywords.some((k) => t.includes(k))) return a.code;
  }
  return null;
}
