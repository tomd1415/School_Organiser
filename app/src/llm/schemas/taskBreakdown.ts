import * as z from 'zod/v4';

export const taskBreakdownSchema = z.object({
  steps: z.array(z.string()).describe('3–7 concrete, ordered, actionable sub-steps — each one small doable thing'),
});

export type TaskBreakdown = z.infer<typeof taskBreakdownSchema>;
