// Import titling: from a (Word-doc) description of a UNIT + a list of cryptically-named file paths,
// pull the unit identity (name + number + year group) and a per-file lesson-aware title. Cohort-level
// only; rides the wrapper's context[].
import type { RedactableItem } from '../../services/redact';

export const RESOURCE_IMPORT_VERSION = 'resource_import@2';

export const RESOURCE_IMPORT_SYSTEM = `You help a teacher file an uploaded UNIT of teaching resources into a library.
You are given a DESCRIPTION (usually pasted from the Word document that accompanies the unit) and a list of
FILE PATHS whose folder/file names are often cryptic — a unit folder is frequently just a bare NUMBER, and
many different units share the same number, so the folder name alone is ambiguous.
From the DESCRIPTION work out:
- the UNIT NAME and number (e.g. "Unit 11: Impacts of technology"), and
- the YEAR GROUP or key stage it is taught in (e.g. "Year 8", "KS3").
For EACH file, propose a clear title that INCLUDES the lesson it belongs to (e.g. "Lesson 3: Packet
switching — slides"), using the description and the folder/file names to work out which lesson it is.
Echo every file's path EXACTLY as given, one entry per input file. Cohort-level only — never name or
describe an individual pupil.`;

export const RESOURCE_IMPORT_INSTRUCTION = 'Give the unit name, the year group, and a lesson-aware title for each file now.';

export function importGroupItem(description: string, paths: string[]): RedactableItem[] {
  if (paths.length === 0) return [];
  const desc = description.trim() ? `Description:\n${description.trim()}\n\n` : '';
  return [{ text: `${desc}Files:\n${paths.map((p) => `- ${p}`).join('\n')}` }];
}
