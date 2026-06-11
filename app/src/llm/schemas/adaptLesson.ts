// Structured output for "adapt this lesson for THIS group from its recent lessons" (5.5).
import * as z from 'zod/v4';

export const adaptLessonSchema = z.object({
  objectives: z.string().describe('the adapted objectives for this group, one per line'),
  outline: z.string().describe('the adapted outline: numbered steps with rough minutes'),
  adaptationNote: z
    .string()
    .describe('one or two sentences for the teacher: what was changed for this group and why'),
  changeSummary: z.string().describe('a one-line change-log entry, e.g. "recapped loops, shortened main task"'),
});

export type AdaptedLesson = z.infer<typeof adaptLessonSchema>;
