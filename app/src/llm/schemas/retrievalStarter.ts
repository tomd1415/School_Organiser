// Structured output for the retrieval-practice starter (10.15): exactly 3 recall questions + answers.
import * as z from 'zod/v4';

export const retrievalStarterSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().describe('a short, plain recall question re-testing one weak idea'),
        answer: z.string().describe('a brief model answer for the teacher to mark against'),
      }),
    )
    .min(1)
    .max(3)
    .describe('exactly 3 starter questions (fewer only if there is little to re-test)'),
});

export type RetrievalStarter = z.infer<typeof retrievalStarterSchema>;
