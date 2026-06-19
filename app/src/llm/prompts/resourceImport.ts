// Wave-style import titling: from a (Word-doc) description + a list of cryptically-named file paths,
// propose a clear title + category per file. Cohort-level only; rides the wrapper's context[].
import type { RedactableItem } from '../../services/redact';

export const RESOURCE_IMPORT_VERSION = 'resource_import@1';

export const RESOURCE_IMPORT_SYSTEM = `You help a teacher file uploaded teaching resources into a library.
You are given a DESCRIPTION (usually pasted from a Word document that accompanied the files) and a list
of FILE PATHS whose folder/file names may be cryptic, or named by activity rather than by lesson. For
EACH file, propose a clear, concise human-readable title and a short category (the unit/topic it belongs
to). Use the description to disambiguate the names. Echo every file's path EXACTLY as given so it can be
matched back, and return one entry per input file. Cohort-level only — never name or describe a pupil.`;

export const RESOURCE_IMPORT_INSTRUCTION = 'Propose a title and category for each file now.';

export function importGroupItem(description: string, paths: string[]): RedactableItem[] {
  if (paths.length === 0) return [];
  const desc = description.trim() ? `Description:\n${description.trim()}\n\n` : '';
  return [{ text: `${desc}Files:\n${paths.map((p) => `- ${p}`).join('\n')}` }];
}
