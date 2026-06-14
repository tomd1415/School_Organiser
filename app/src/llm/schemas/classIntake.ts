// Phase 11 — class-intake: turn a free-text class description into the structured per-class fields.
// Cohort-level only; the model leaves things null/false/empty when the description doesn't say.
import * as z from 'zod/v4';

export const classIntakeSchema = z.object({
  teachingContext: z
    .string()
    .describe('cohort-level TEACHING CONTEXT — concise prose another teacher could plan from (how to pitch, support, pace and run lessons for this class). Never name an individual pupil.'),
  coveredSummary: z
    .string()
    .describe('a short summary of the topics/areas this class has ALREADY covered, drawn from the description ("" if none stated)'),
  abilityMidpoint: z
    .string()
    .nullable()
    .describe('the class ability midpoint if stated or clearly implied (e.g. "working at Entry Level 3 / emerging GCSE grade 2"), else null'),
  guidedAccess: z
    .object({
      viFont: z.number().int().nullable().describe('minimum font size in pt if a visual-impairment need implies one, else null'),
      shortAttention: z.boolean().describe('true if very short attention spans are indicated'),
      readingAge: z.string().nullable().describe('target reading age if stated/implied, else null'),
      eal: z.boolean().describe('true if EAL learners are indicated'),
      dyslexiaFriendly: z.boolean().describe('true if a dyslexia-friendly layout is indicated'),
      lowTyping: z.boolean().describe('true if limited keyboard/typing fluency is indicated'),
    })
    .describe('access needs inferred from the description; null/false where not indicated — do not invent'),
});

export type ClassIntake = z.infer<typeof classIntakeSchema>;
