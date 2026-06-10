import * as z from 'zod/v4';

export const generateResourceSchema = z.object({
  title: z.string().describe('a short human-readable title for the resource'),
  filename: z.string().describe('a safe filename WITHOUT extension, e.g. "binary-addition-worksheet"'),
  content: z.string().describe('the full resource as clean, well-structured Markdown'),
});

export type GeneratedResource = z.infer<typeof generateResourceSchema>;
