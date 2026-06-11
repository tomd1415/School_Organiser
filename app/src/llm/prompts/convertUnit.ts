// Versioned prompt for converting a downloaded unit (e.g. Teach Computing / NCCE) into the
// teacher's adapted master lessons (5.3). The teaching-context item is injected separately by the
// route (through context[], so it inherits redaction/withholding/audit).
import type { SourceLesson } from '../../services/convertUnit';

export const CONVERT_UNIT_VERSION = 'convert_unit@1';

export const CONVERT_UNIT_SYSTEM =
  'You are an experienced UK secondary Computing teacher adapting a published unit of work for ' +
  'your own classes. You are given the source unit\'s lesson folders and file names — keep the ' +
  'same teaching sequence and coverage (one adapted lesson per source lesson, same order), but ' +
  'rewrite each lesson to fit the teaching context you are given: concrete objectives, a clear ' +
  'step-by-step outline with rough timings that fits the lesson length, low cognitive load, ' +
  'predictable structure, and explicit success criteria. Plain UK English. Never reference ' +
  'individual pupils by name.';

export function convertUnitInstruction(courseName: string, unitFolder: string, lessons: SourceLesson[]): string {
  const tree = lessons
    .map((l, i) => `${i + 1}. ${l.title}\n${l.files.map((f) => `   - ${f}`).join('\n')}`)
    .join('\n');
  return [
    `Course: ${courseName}`,
    `Source unit folder: ${unitFolder}`,
    '',
    'Source lessons and their files:',
    tree,
    '',
    'Convert this unit into my adapted master lessons: an adapted unit title, and for each source ' +
      'lesson (same order) an adapted lesson with objectives and an outline.',
  ].join('\n');
}
