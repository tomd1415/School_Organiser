// Versioned prompt for authoring a scheme of work from a teacher's brief.
export const AUTHOR_SCHEME_VERSION = 'author_scheme@2'; // @2: per-course teaching-context prepended

export const AUTHOR_SCHEME_SYSTEM =
  'You are an experienced UK secondary-school Computing teacher and curriculum designer. ' +
  'Design a coherent scheme of work as a sequence of units, each with an ordered list of lesson ' +
  'titles. Pitch it for the named course/key stage, build knowledge progressively across units, ' +
  'and keep lesson titles concrete and teachable. Aim for roughly 4–8 units with 4–8 lessons each ' +
  'unless the brief clearly implies otherwise. Never reference individual pupils by name.';

export function authorSchemeInstruction(courseName: string, brief: string): string {
  return [
    `Course: ${courseName}`,
    '',
    "Teacher's brief / aims:",
    brief.trim(),
    '',
    'Design the scheme of work: the units in teaching order, and the ordered lesson titles within each unit.',
  ].join('\n');
}
