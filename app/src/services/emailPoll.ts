// Email intake v2: poll an IMAP mailbox and turn each unseen message into a draft task — the
// same path as the paste box (email_intake row + task with source='email'), so triage, the Now
// screen and everything downstream behave identically. Dedup is the mailbox's own \Seen flag:
// only messages successfully imported get marked, failures stay unseen for the next poll.
import { pollMailbox, type ImapConfig } from '../lib/imapClient';
import { parseMime } from '../lib/mime';
import { createTaskFromEmail } from '../repos/tasks';
import { getSetting, setSetting } from '../repos/settings';

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

/** Run one poll now. Records a human-readable status line in settings either way. */
export async function pollEmailOnce(): Promise<EmailPollResult> {
  const cfg = await emailPollConfig();
  if (!cfg) return { ok: false, message: 'Email intake is not configured (host, user and password needed).' };
  try {
    const r = await pollMailbox(cfg, async (mail) => {
      const m = parseMime(mail.raw);
      const title = (m.subject ?? m.text.split('\n')[0] ?? 'Email task').trim().slice(0, 200) || 'Email task';
      const detail = [m.from ? `From: ${m.from}` : '', m.text.slice(0, 5000)].filter(Boolean).join('\n');
      await createTaskFromEmail({ title, detail, from: m.from, subject: m.subject }, mail.raw.toString('utf8').slice(0, 100_000));
    });
    const msg = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} — ${r.found} unseen, ${r.imported} imported${r.failed ? `, ${r.failed} failed (left unseen)` : ''}`;
    await setSetting('email_last_poll', msg);
    return { ok: true, message: msg, ...r };
  } catch (err) {
    const msg = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} — poll failed: ${(err as Error).message.slice(0, 160)}`;
    await setSetting('email_last_poll', msg);
    return { ok: false, message: msg };
  }
}
