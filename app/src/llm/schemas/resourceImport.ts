import * as z from 'zod/v4';

export const resourceImportSchema = z.object({
  files: z.array(
    z.object({
      path: z.string().describe('the file path EXACTLY as provided, so it can be matched back'),
      title: z.string().describe('a clear, concise human-readable resource title'),
      category: z.string().describe('a short topic/unit/category the file belongs to'),
    }),
  ),
});

export type ResourceImportProposal = z.infer<typeof resourceImportSchema>;
