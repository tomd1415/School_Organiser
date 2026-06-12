// Structured output for email triage: every forwarded email is classified, its useful content
// extracted, and filed in the right part of the app. The teacher forwards deliberately — there
// is always a reason the email arrived, so "ignore" is never an option.
import * as z from 'zod/v4';

export const emailTriageSchema = z.object({
  route: z
    .enum(['task', 'event', 'awareness', 'note'])
    .describe(
      'task = something the teacher must DO; event = a dated thing to attend/prepare for (needs dateIso); awareness = something to know about a pupil/class/situation, no specific date; note = pure reference material worth keeping',
    ),
  title: z.string().describe('short, action-first title (max ~12 words) — what it is, not "FW: …"'),
  summary: z
    .string()
    .describe(
      'the information that actually matters, extracted and rewritten concisely (who/what/when/where, amounts, room numbers, what is being asked) — strip greetings, signatures and disclaimers',
    ),
  urgency: z
    .enum(['urgent_today', 'by_next_lesson', 'this_week', 'someday'])
    .nullable()
    .describe('for route=task: how urgent it reads; null otherwise'),
  eventKind: z
    .enum(['parents_evening', 'ehcp_review', 'report_deadline', 'exam', 'data_drop', 'inset', 'trip', 'open_evening', 'meeting', 'parent_contact', 'other'])
    .nullable()
    .describe('for route=event; null otherwise'),
  dateIso: z.string().nullable().describe('for route=event: the date as YYYY-MM-DD; null if genuinely undated'),
  category: z
    .string()
    .nullable()
    .describe('for route=awareness: one of pupil, parent, staff, admin, site, other'),
  groupName: z.string().nullable().describe('EXACTLY one of the provided class names if the email is clearly about that class; otherwise null'),
  safeguarding: z
    .boolean()
    .describe('true if the content touches safeguarding/welfare AT ALL — flagged items are withheld from all future AI calls'),
  reason: z.string().describe('one short line: why this route'),
});

export type EmailTriage = z.infer<typeof emailTriageSchema>;
