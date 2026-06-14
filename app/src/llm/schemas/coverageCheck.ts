// Phase 11 idea 10 slice 2 — structured output for the coverage gap-filler. For each uncovered spec
// point, the model names the existing lesson (by ref) that best covers it, or "NEW" if none fits.
import * as z from 'zod/v4';

export const coverageCheckSchema = z.object({
  suggestions: z
    .array(
      z.object({
        point: z.string().describe('the spec point code, exactly as given in the list'),
        lesson: z.string().describe('the ref (e.g. "L3") of the existing lesson that best covers this point, or "NEW" if none is a reasonable fit'),
        why: z.string().describe('one short line on the fit'),
      }),
    )
    .max(80)
    .describe('one entry per uncovered point you can place'),
});

export type CoverageCheck = z.infer<typeof coverageCheckSchema>;
