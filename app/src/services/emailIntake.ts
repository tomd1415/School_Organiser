// EmailIntakeService — turn a pasted email into a draft task. Pure parser: a
// "Subject:" line (or the first line) becomes the title; the rest is the detail.
// Phase 2 paste-box (ARCHITECTURE email option 2); IMAP poll is Phase 5.

export interface ParsedEmail {
  title: string;
  detail: string;
  from: string | null;
  subject: string | null;
}

export function parseEmail(text: string): ParsedEmail {
  const lines = text.replace(/\r/g, '').split('\n');
  let from: string | null = null;
  let subject: string | null = null;
  const bodyLines: string[] = [];

  for (const line of lines) {
    const s = line.trim();
    if (subject === null && /^subject:/i.test(s)) {
      subject = s.replace(/^subject:/i, '').trim();
      continue;
    }
    if (from === null && /^from:/i.test(s)) {
      from = s.replace(/^from:/i, '').trim();
      continue;
    }
    bodyLines.push(line);
  }

  const body = bodyLines.join('\n').trim();
  let title: string;
  let detail: string;

  if (subject) {
    title = subject.slice(0, 200);
    detail = body;
  } else {
    const firstNl = body.indexOf('\n');
    title = (firstNl === -1 ? body : body.slice(0, firstNl)).trim().slice(0, 200);
    detail = firstNl === -1 ? '' : body.slice(firstNl + 1).trim();
  }

  return { title: title || 'Email task', detail, from, subject };
}
