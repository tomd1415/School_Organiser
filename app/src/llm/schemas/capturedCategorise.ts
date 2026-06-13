// Structured output for captured-note auto-filing (10.17). Mirrors the email-triage shape.
import * as z from 'zod/v4';
import { CAPTURED_CATEGORIES } from '../../services/captured';

export const capturedCategoriseSchema = z.object({
  category: z.enum(CAPTURED_CATEGORIES).describe('the single best category for this note'),
  surfaceOn: z
    .string()
    .nullable()
    .describe('YYYY-MM-DD when it should resurface (a deadline, or the day before a relevant lesson), or null if not time-bound'),
  groupName: z.string().nullable().describe('EXACTLY one of the provided class names if the note is clearly about that class; otherwise null'),
  safeguarding: z.boolean().describe('true if the content touches safeguarding/welfare at all — flagged items are withheld from all future AI calls'),
  reason: z.string().describe('one short line: why this category'),
});

export type CapturedCategorise = z.infer<typeof capturedCategoriseSchema>;
