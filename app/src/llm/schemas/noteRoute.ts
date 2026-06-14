// Phase 11 idea 12 — structured output for "smart capture": a quick note the teacher typed is split
// into ONE OR MORE destinations and filed where each part belongs. The manual-note sibling of
// email_triage, but a single note can fan out (e.g. an event AND a task). The teacher confirms before
// anything is created, so the model only ever proposes.
import * as z from 'zod/v4';

const destination = z.object({
  kind: z
    .enum(['task', 'event', 'captured', 'note'])
    .describe('task = something to DO; event = a dated thing (needs dateIso); captured = something to be aware of about a pupil/class, no date; note = pure reference to keep'),
  title: z.string().describe('short, action-first title (max ~12 words)'),
  summary: z.string().describe('the part of the note that belongs in THIS destination, rewritten concisely; strip the bits that belong elsewhere'),
  urgency: z.enum(['urgent_today', 'by_next_lesson', 'this_week', 'someday']).nullable().describe('for kind=task; null otherwise'),
  eventKind: z
    .enum(['parents_evening', 'ehcp_review', 'report_deadline', 'exam', 'data_drop', 'inset', 'trip', 'open_evening', 'meeting', 'parent_contact', 'other'])
    .nullable()
    .describe('for kind=event; null otherwise'),
  dateIso: z.string().nullable().describe('for kind=event: YYYY-MM-DD; null if genuinely undated'),
  category: z.string().nullable().describe('for kind=captured: one of pupil, parent, staff, admin, site, other; null otherwise'),
  groupName: z.string().nullable().describe('EXACTLY one of the provided class names if this part is clearly about that class; otherwise null'),
});

export const noteRouteSchema = z.object({
  destinations: z
    .array(destination)
    .min(1)
    .max(3)
    .describe('1–3 places this note should be filed. Most notes are ONE destination; only split when the note genuinely contains separate things.'),
  reason: z.string().describe('one short line: how you split it'),
});

export type NoteRoute = z.infer<typeof noteRouteSchema>;
export type NoteDestination = z.infer<typeof destination>;
