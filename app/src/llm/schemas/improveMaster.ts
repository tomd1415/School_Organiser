// Structured output for "suggest a master-lesson improvement" (5.5b): generalise what worked for
// a group back into the canonical lesson. Applied only when the teacher accepts.
import * as z from 'zod/v4';

export const improveMasterSchema = z.object({
  objectives: z.string().describe('the improved master objectives, one per line'),
  outline: z.string().describe('the improved master outline: numbered steps with rough minutes'),
  rationale: z
    .string()
    .describe('two or three sentences for the teacher: what was changed in the master and why, generalised from this group'),
});

export type ImprovedMaster = z.infer<typeof improveMasterSchema>;
