// Email intake v2: poll an IMAP mailbox and turn each unseen message into a draft task — the
// same path as the paste box (email_intake row + task with source='email'), so triage, the Now
// screen and everything downstream behave identically. Dedup is the mailbox's own \Seen flag:
// only messages successfully imported get marked, failures stay unseen for the next poll.
import { pollMailbox, type ImapConfig } from '../lib/imapClient';
import { parseMime, type ParsedMime } from '../lib/mime';
import { createTaskFromEmail, listGroups, recordEmailIntake, setTaskTriage } from '../repos/tasks';
import { createEventFromIntake } from '../repos/events';
import { fileCaptured } from '../repos/captured';
import { createNote, updateNoteBody } from '../repos/notes';
import { getSetting, setSetting } from '../repos/settings';
import { callLLMStructured } from '../llm/client';
import { modelFor } from '../repos/settings';
import { emailTriageSchema, type EmailTriage } from '../llm/schemas/emailTriage';
import { EMAIL_TRIAGE_SYSTEM, EMAIL_TRIAGE_VERSION, emailTriageInstruction, emailTriageItems } from '../llm/prompts/emailTriage';
import { guardMatch } from '../lib/markSafetyGate';

/** 10.5 — the pre-egress safeguarding screen. Triage decides safeguarding by sending the body to
 * the AI, so a disclosure would reach the model BEFORE any withholding could fire; and the
 * redactor is roster-only, so a sibling/other-class child named in an email is never tokenised.
 * Screen locally first: a trip means the email is filed as a flagged captured item with NO AI call
 * at all. Returns the matched pattern (for the log) or null. */
export function screenEmailForSafeguarding(subject: string | null, text: string): string | null {
  return guardMatch(`${subject ?? ''}\n${text}`);
}

export interface EmailPollResult {
  ok: boolean;
  message: string;
  found?: number;
  imported?: number;
  failed?: number;
}

export async function emailPollConfig(): Promise<ImapConfig | null> {
  const [host, port, user, password, folder, tls] = await Promise.all([
    getSetting('email_imap_host'),
    getSetting('email_imap_port'),
    getSetting('email_imap_user'),
    getSetting('email_imap_password'),
    getSetting('email_imap_folder'),
    getSetting('email_imap_tls'),
  ]);
  if (!host || !user || !password) return null;
  return {
    host,
    port: Number(port) > 0 ? Number(port) : 993,
    user,
    password,
    folder: folder || 'INBOX',
    tls: tls !== 'false',
  };
}

/** Classify + extract with the cheap model; null = AI unavailable (caller falls back to a task). */
async function triageEmail(m: ParsedMime, groupNames: string[]): Promise<EmailTriage | null> {
  const result = await callLLMStructured(
    {
      feature: 'email_triage',
      model: await modelFor('cheap'),
      promptVersion: EMAIL_TRIAGE_VERSION,
      system: EMAIL_TRIAGE_SYSTEM,
      context: emailTriageItems({ subject: m.subject, from: m.from, text: m.text }),
      instruction: emailTriageInstruction(new Date().toISOString().slice(0, 10), groupNames),
      maxTokens: 1500,
    },
    emailTriageSchema,
  );
  return result.status === 'ok' ? result.data : null;
}

export type EmailRoute = 'task' | 'event' | 'awareness' | 'note';

/** File a triaged email in the right part of the app. Exported for tests (no AI involved). */
export async function routeTriagedEmail(
  t: EmailTriage,
  m: ParsedMime,
  raw: string,
  groups: Array<{ id: number; name: string }>,
): Promise<EmailRoute> {
  const groupId = t.groupName ? (groups.find((g) => g.name.toLowerCase() === t.groupName!.toLowerCase())?.id ?? null) : null;
  const provenance = `${t.reason}${m.from ? ` · from ${m.from}` : ''}`;
  const factLines = (t.facts ?? []).map((f) => `• ${f.label}: ${f.value}`).join('\n');
  const detailText = [t.summary, factLines, `(${provenance})`].filter(Boolean).join('\n');
  const dateOk = t.dateIso && /^\d{4}-\d{2}-\d{2}$/.test(t.dateIso) ? t.dateIso : null;

  if (t.route === 'event') {
    await createEventFromIntake({
      kind: t.eventKind ?? 'other',
      title: t.title,
      date: dateOk,
      detail: detailText,
    });
    await recordEmailIntake({ from: m.from, subject: m.subject }, raw);
    return 'event';
  }
  if (t.route === 'awareness') {
    await fileCaptured({
      body: `${t.title} — ${detailText}`,
      category: t.category ?? null,
      groupId: groupId == null ? null : Number(groupId),
      safeguarding: t.safeguarding,
    });
    await recordEmailIntake({ from: m.from, subject: m.subject }, raw);
    return 'awareness';
  }
  if (t.route === 'note') {
    const id = await createNote({ kind: 'general', groupId: groupId == null ? null : Number(groupId) });
    await updateNoteBody(id, `${t.title}\n${detailText}`);
    await recordEmailIntake({ from: m.from, subject: m.subject }, raw);
    return 'note';
  }
  // default: task
  const taskId = await createTaskFromEmail(
    { title: t.title, detail: detailText, from: m.from, subject: m.subject },
    raw,
  );
  await setTaskTriage(taskId, t.urgency ?? null, groupId == null ? null : Number(groupId));
  return 'task';
}

/** Run one poll now. Records a human-readable status line in settings either way. */
export async function pollEmailOnce(): Promise<EmailPollResult> {
  const cfg = await emailPollConfig();
  if (!cfg) return { ok: false, message: 'Email intake is not configured (host, user and password needed).' };
  try {
    const groups = await listGroups();
    const counts: Record<EmailRoute, number> = { task: 0, event: 0, awareness: 0, note: 0 };
    const r = await pollMailbox(cfg, async (mail) => {
      const m = parseMime(mail.raw);
      const raw = mail.raw.toString('utf8').slice(0, 100_000);
      // 10.5: screen for safeguarding BEFORE any AI egress. A trip is filed locally, flagged, and
      // NEVER sent to the AI (it's withheld everywhere downstream by the safeguarding flag).
      if (screenEmailForSafeguarding(m.subject, m.text)) {
        await fileCaptured({
          body: `⚠ Possible safeguarding content — screened on intake, NOT sent to AI.\nSubject: ${m.subject ?? '(none)'}${m.from ? `\nFrom: ${m.from}` : ''}\n\n${m.text.slice(0, 5000)}`,
          category: 'safeguarding',
          groupId: null,
          safeguarding: true,
        });
        await recordEmailIntake({ from: m.from, subject: m.subject }, raw);
        counts.awareness++;
        return;
      }
      const triage = await triageEmail(m, groups.map((g) => g.name));
      if (triage) {
        counts[await routeTriagedEmail(triage, m, raw, groups)]++;
      } else {
        // AI unavailable → never block intake: plain task, exactly as v1 behaved
        const title = (m.subject ?? m.text.split('\n')[0] ?? 'Email task').trim().slice(0, 200) || 'Email task';
        const detail = [m.from ? `From: ${m.from}` : '', m.text.slice(0, 5000)].filter(Boolean).join('\n');
        await createTaskFromEmail({ title, detail, from: m.from, subject: m.subject }, raw);
        counts.task++;
      }
    });
    const routed = (Object.entries(counts) as Array<[EmailRoute, number]>)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${k}${n === 1 ? '' : 's'}`.replace('awarenesss', 'awareness'))
      .join(', ');
    const msg = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} — ${r.found} unseen, ${r.imported} imported${routed ? ` (${routed})` : ''}${r.failed ? `, ${r.failed} failed (left unseen)` : ''}`;
    await setSetting('email_last_poll', msg);
    return { ok: true, message: msg, ...r };
  } catch (err) {
    const msg = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} — poll failed: ${(err as Error).message.slice(0, 160)}`;
    await setSetting('email_last_poll', msg);
    return { ok: false, message: msg };
  }
}
