import * as z from 'zod/v4';

// One call per unit folder: from its Word description + the (often cryptically-named) file paths,
// pull the unit identity and a per-file lesson-aware title. The unit folder is usually just a bare
// number, so the NAME and YEAR GROUP must come from the description — they disambiguate units that
// share a number across year groups.
export const resourceImportSchema = z.object({
  unitName: z
    .string()
    .describe('the unit name AND number from the description, e.g. "Unit 11: Impacts of technology". The folder is often just a number — rely on the description. "" only if it truly is not a unit.'),
  yearGroup: z
    .string()
    .describe('the year group or key stage this unit is for, e.g. "Year 8" or "KS3". "" if the description does not say.'),
  files: z.array(
    z.object({
      path: z.string().describe('the file path EXACTLY as provided, so it can be matched back'),
      title: z
        .string()
        .describe('a clear title for this file that includes the lesson it belongs to, e.g. "Lesson 3: Packet switching — slides"'),
    }),
  ),
});

export type ResourceImportProposal = z.infer<typeof resourceImportSchema>;
