// Versioned prompt for incoming-email triage. The email body travels via context[] like every
// input (pupil names redacted before egress; the audit row stores the redacted form).
import type { RedactableItem } from '../../services/redact';

export const EMAIL_TRIAGE_VERSION = 'email_triage@1';

export const EMAIL_TRIAGE_SYSTEM =
  'You triage one forwarded email for a UK secondary SEND Computing teacher. The teacher ' +
  'forwarded it DELIBERATELY — there is always a reason it is here, so never dismiss it; pick ' +
  'the single best home. Route "task" when the teacher must do something (reply, prepare, send, ' +
  'collect, book); "event" when there is a specific date to attend or prepare for; "awareness" ' +
  'when they need to know something about a pupil, class or situation but nothing is dated; ' +
  '"note" only for pure reference material. Extract the substance — names of staff, dates, ' +
  'rooms, amounts, the actual request — and drop greetings, signatures, legal footers and ' +
  'quoted history. Be decisive about safeguarding: anything touching welfare, disclosures, ' +
  'social services or home circumstances gets safeguarding=true.';

export function emailTriageItems(email: { subject: string | null; from: string | null; text: string }): RedactableItem[] {
  return [
    {
      text: [
        `EMAIL${email.from ? ` from ${email.from}` : ''}`,
        `Subject: ${email.subject ?? '(none)'}`,
        '',
        email.text.slice(0, 6000),
      ].join('\n'),
    },
  ];
}

export function emailTriageInstruction(todayIso: string, groupNames: string[]): string {
  return (
    `Today is ${todayIso}. ` +
    (groupNames.length ? `The teacher's classes are: ${groupNames.join(', ')}. ` : '') +
    'Triage the email now.'
  );
}
