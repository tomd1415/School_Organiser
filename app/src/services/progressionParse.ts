// Phase 16A.2 — pure parser for the year-ladder source (docs/LEVEL_SYSTEM_FULL_PROGRESSION.md), so the seed
// can walk Stage → Strand → Unit → objective(lesson) → "I can…"(criterion) into the prog_* tables. Kept
// pure (string in, structure out) so it's unit-testable against a fixture with no DB and no filesystem.
//
// Source line grammar (consistent across the doc):
//   `## Stage 6 — Year 1 · age 5–6 (KS1)`     → a stage  (ordinal 6, year 1, age 5–6, key stage KS1)
//   `### Computing systems (CS)`               → a strand within the current stage (code CS)
//   `**Programming A – Moving a robot**`        → a unit  (bold, whole line — NOT a list item)
//   `- **To identify technology**  *(also: IT)*`→ a lesson/objective (bold list item; optional also-strands)
//   `    - I can name the main parts…`          → a criterion (indented list item, plain text)

export interface ParsedCriterion {
  descriptor: string;
  alsoStrands: string[];
}
export interface ParsedLesson {
  lessonNo: number | null; // KS3 lists "Lesson N" with no objective text; KS1/2 carries the objective instead
  objective: string | null;
  alsoStrands: string[];
  criteria: ParsedCriterion[];
}
export interface ParsedUnit {
  title: string;
  lessons: ParsedLesson[];
}
export interface ParsedStrandGroup {
  strandCode: string;
  strandName: string;
  units: ParsedUnit[];
}
export interface ParsedStage {
  ordinal: number;
  label: string; // the raw heading text after "Stage N — "
  yearGroup: number | null;
  ageLow: number | null;
  ageHigh: number | null;
  keyStage: string | null;
  strands: ParsedStrandGroup[];
}

const STAGE_RE = /^##\s+Stage\s+(\d+)\s*[—-]\s*(.+)$/;
const STRAND_RE = /^###\s+(.+?)\s*\(([A-Z]{2,4})\)\s*$/;
const UNIT_RE = /^\*\*(.+?)\*\*\s*$/;
const LESSON_RE = /^-\s+\*\*(.+?)\*\*\s*(?:\*\(also:\s*([^)]*)\)\*)?\s*$/;
const LESSON_KS3_RE = /^-\s+\*Lesson\s+(\d+):\*\s*$/; // KS3 form: "- *Lesson 2:*" (objective-less)
const CRITERION_RE = /^\s+-\s+(.+?)\s*$/;
const ALSO_INLINE_RE = /\*\(also:\s*([^)]*)\)\*/;

function parseAlso(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);
}

/** Parse the year-ladder markdown into ordered stages → strands → units → lessons → criteria. */
export function parseProgressionDoc(markdown: string): ParsedStage[] {
  const stages: ParsedStage[] = [];
  let stage: ParsedStage | null = null;
  let strand: ParsedStrandGroup | null = null;
  let unit: ParsedUnit | null = null;
  let lesson: ParsedLesson | null = null;

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed) continue;

    const mStage = STAGE_RE.exec(line);
    if (mStage) {
      const ordinal = Number(mStage[1]);
      const rest = mStage[2]!.trim();
      const year = /Year\s+(\d+)/i.exec(rest);
      const age = /age\s+(\d+)\s*[–-]\s*(\d+)/i.exec(rest);
      const ks = /\b(EYFS|KS[1-4])\b/.exec(rest);
      stage = {
        ordinal,
        label: rest,
        yearGroup: year ? Number(year[1]) : null,
        ageLow: age ? Number(age[1]) : null,
        ageHigh: age ? Number(age[2]) : null,
        keyStage: ks ? ks[1]! : null,
        strands: [],
      };
      stages.push(stage);
      strand = unit = lesson = null;
      continue;
    }

    const mStrand = STRAND_RE.exec(line);
    if (mStrand && stage) {
      strand = { strandName: mStrand[1]!.trim(), strandCode: mStrand[2]!.toUpperCase(), units: [] };
      stage.strands.push(strand);
      unit = lesson = null;
      continue;
    }

    // A criterion (indented list item) — check BEFORE unit/lesson because indentation is the signal.
    const mCrit = CRITERION_RE.exec(line);
    if (mCrit && /^\s/.test(line) && lesson) {
      const text = mCrit[1]!;
      const also = ALSO_INLINE_RE.exec(text);
      lesson.criteria.push({ descriptor: text.replace(ALSO_INLINE_RE, '').trim(), alsoStrands: parseAlso(also?.[1]) });
      continue;
    }

    const ensureUnit = (): ParsedUnit => {
      if (!unit) {
        // a lesson before any unit heading — synthesise a unit from the strand name
        unit = { title: strand!.strandName, lessons: [] };
        strand!.units.push(unit);
      }
      return unit;
    };

    const mLessonKs3 = LESSON_KS3_RE.exec(line);
    if (mLessonKs3 && strand) {
      lesson = { lessonNo: Number(mLessonKs3[1]), objective: null, alsoStrands: [], criteria: [] };
      ensureUnit().lessons.push(lesson);
      continue;
    }

    const mLesson = LESSON_RE.exec(line);
    if (mLesson && strand) {
      lesson = { lessonNo: null, objective: mLesson[1]!.trim(), alsoStrands: parseAlso(mLesson[2]), criteria: [] };
      ensureUnit().lessons.push(lesson);
      continue;
    }

    const mUnit = UNIT_RE.exec(line);
    if (mUnit && strand && !line.startsWith('-')) {
      unit = { title: mUnit[1]!.trim(), lessons: [] };
      strand.units.push(unit);
      lesson = null;
      continue;
    }
  }
  return stages;
}
