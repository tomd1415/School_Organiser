import { afterAll, describe, expect, it } from 'vitest';
import { createServer, type Server, type Socket } from 'node:net';
import { pool } from '../../src/db/pool';
import { setSetting } from '../../src/repos/settings';
import { pollEmailOnce } from '../../src/services/emailPoll';

// End-to-end email intake v2 against a scripted in-process IMAP server: one unseen multipart
// email → poll → a draft task appears (source='email'), the message is marked \Seen, and a
// second poll imports nothing.
const EMAIL = [
  'From: Office <office@school.org>',
  'Subject: =?utf-8?B?VHJpcCBmb3JtcyDinIU=?=', // "Trip forms ✅"
  'Content-Type: multipart/alternative; boundary="XYZ"',
  '',
  '--XYZ',
  'Content-Type: text/html',
  '',
  '<p>HTML version</p>',
  '--XYZ',
  'Content-Type: text/plain',
  '',
  'Collect the trip forms by Friday.',
  '--XYZ--',
  '',
].join('\r\n');

let seenStored = false;
let searchCalls = 0;

function fakeImap(): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer((sock: Socket) => {
      sock.write('* OK fake ready\r\n');
      let buf = '';
      sock.on('data', (d) => {
        buf += d.toString('utf8');
        let nl: number;
        while ((nl = buf.indexOf('\r\n')) !== -1) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 2);
          const [tag, ...rest] = line.split(' ');
          const cmd = rest.join(' ').toUpperCase();
          if (cmd.startsWith('LOGIN')) sock.write(`${tag} OK logged in\r\n`);
          else if (cmd.startsWith('SELECT')) sock.write(`* 1 EXISTS\r\n${tag} OK selected\r\n`);
          else if (cmd.startsWith('SEARCH')) {
            searchCalls++;
            sock.write(`* SEARCH${seenStored ? '' : ' 1'}\r\n${tag} OK done\r\n`);
          } else if (cmd.startsWith('FETCH')) {
            const body = Buffer.from(EMAIL, 'utf8');
            sock.write(`* 1 FETCH (BODY[] {${body.length}}\r\n`);
            sock.write(body);
            sock.write(`)\r\n${tag} OK fetched\r\n`);
          } else if (cmd.startsWith('STORE')) {
            seenStored = true;
            sock.write(`${tag} OK stored\r\n`);
          } else if (cmd.startsWith('LOGOUT')) {
            sock.write(`* BYE\r\n${tag} OK bye\r\n`);
            sock.end();
          } else sock.write(`${tag} OK noop\r\n`);
        }
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: (server.address() as { port: number }).port }));
  });
}

describe('email intake v2 (integration — fake IMAP server)', () => {
  afterAll(async () => {
    await pool.query(`DELETE FROM settings WHERE key LIKE 'email_%'`);
  });

  it('polls, imports a task, marks seen; second poll is a no-op', async () => {
    const { server, port } = await fakeImap();
    try {
      await setSetting('email_imap_host', '127.0.0.1');
      await setSetting('email_imap_port', String(port));
      await setSetting('email_imap_user', 'intake');
      await setSetting('email_imap_password', 'pw');
      await setSetting('email_imap_tls', 'false');

      const r1 = await pollEmailOnce();
      expect(r1.ok).toBe(true);
      expect(r1.imported).toBe(1);
      expect(seenStored).toBe(true);

      const task = await pool.query<{ id: number; title: string; detail: string; source: string }>(
        `SELECT t.id, t.title, t.detail, t.source FROM tasks t WHERE t.title = 'Trip forms ✅' ORDER BY t.id DESC LIMIT 1`,
      );
      expect(task.rows[0]).toBeDefined();
      expect(task.rows[0]!.source).toBe('email');
      expect(task.rows[0]!.detail).toContain('Collect the trip forms by Friday.'); // text/plain part won
      expect(task.rows[0]!.detail).toContain('office@school.org');

      const r2 = await pollEmailOnce();
      expect(r2.ok).toBe(true);
      expect(r2.found).toBe(0); // marked seen — nothing re-imported
      expect(searchCalls).toBe(2);

      // cleanup: the two tables reference each other — break the cycle, then delete
      await pool.query(`UPDATE email_intake SET created_task_id = NULL WHERE subject = 'Trip forms ✅'`);
      await pool.query(`DELETE FROM tasks WHERE title = 'Trip forms ✅'`);
      await pool.query(`DELETE FROM email_intake WHERE subject = 'Trip forms ✅'`);
    } finally {
      server.close();
    }
  });

  it('unconfigured → clear message, no crash', async () => {
    await pool.query(`DELETE FROM settings WHERE key LIKE 'email_imap_%'`);
    const r = await pollEmailOnce();
    expect(r.ok).toBe(false);
    expect(r.message).toContain('not configured');
  });
});

import { routeTriagedEmail } from '../../src/services/emailPoll';

describe('email triage routing (no AI — fake triage objects)', () => {
  const m = { subject: 'FW: original', from: 'office@school.org', date: null, text: 'body' };
  const base = { title: 'X', summary: 'Y', urgency: null, eventKind: null, dateIso: null, category: null, groupName: null, safeguarding: false, reason: 'test' };

  it('task route: urgency + group land on the task', async () => {
    const g = await pool.query<{ id: number; name: string }>(`SELECT id, name FROM groups WHERE active ORDER BY id LIMIT 1`);
    const route = await routeTriagedEmail(
      { ...base, route: 'task', title: 'TEST triage task', urgency: 'urgent_today', groupName: g.rows[0]!.name },
      m, 'raw', [{ id: Number(g.rows[0]!.id), name: g.rows[0]!.name }],
    );
    expect(route).toBe('task');
    const t = await pool.query<{ urgency: string; gid: number }>(
      `SELECT urgency, group_id gid FROM tasks WHERE title = 'TEST triage task'`,
    );
    expect(t.rows[0]!.urgency).toBe('urgent_today');
    expect(Number(t.rows[0]!.gid)).toBe(Number(g.rows[0]!.id));
    await pool.query(`UPDATE email_intake SET created_task_id = NULL WHERE subject = 'FW: original'`);
    await pool.query(`DELETE FROM tasks WHERE title = 'TEST triage task'`);
  });

  it('event route: dated entry in events', async () => {
    const route = await routeTriagedEmail(
      { ...base, route: 'event', title: 'TEST triage trip', eventKind: 'trip', dateIso: '2099-07-01' },
      m, 'raw', [],
    );
    expect(route).toBe('event');
    const e = await pool.query<{ kind: string; d: string }>(
      `SELECT kind, to_char(date,'YYYY-MM-DD') d FROM events WHERE title = 'TEST triage trip'`,
    );
    expect(e.rows[0]!.kind).toBe('trip');
    expect(e.rows[0]!.d).toBe('2099-07-01');
    await pool.query(`DELETE FROM events WHERE title = 'TEST triage trip'`);
  });

  it('awareness route: captured note with category + safeguarding flag', async () => {
    const route = await routeTriagedEmail(
      { ...base, route: 'awareness', title: 'TEST triage aware', category: 'pupil', safeguarding: true },
      m, 'raw', [],
    );
    expect(route).toBe('awareness');
    const n = await pool.query<{ kind: string; category: string; sg: boolean }>(
      `SELECT kind, category, safeguarding sg FROM notes WHERE body LIKE 'TEST triage aware%'`,
    );
    expect(n.rows[0]!.kind).toBe('captured');
    expect(n.rows[0]!.category).toBe('pupil');
    expect(n.rows[0]!.sg).toBe(true); // withheld from all future AI calls
    await pool.query(`DELETE FROM notes WHERE body LIKE 'TEST triage aware%'`);
  });

  it('note route: general note with the extraction', async () => {
    const route = await routeTriagedEmail({ ...base, route: 'note', title: 'TEST triage ref', summary: 'the wifi code is X' }, m, 'raw', []);
    expect(route).toBe('note');
    const n = await pool.query<{ kind: string; body: string }>(`SELECT kind, body FROM notes WHERE body LIKE 'TEST triage ref%'`);
    expect(n.rows[0]!.kind).toBe('general');
    expect(n.rows[0]!.body).toContain('wifi code');
    await pool.query(`DELETE FROM notes WHERE body LIKE 'TEST triage ref%'`);
  });

  it('intake rows recorded for non-task routes too', async () => {
    const c = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM email_intake WHERE subject = 'FW: original'`);
    expect(c.rows[0]!.n).toBeGreaterThanOrEqual(3);
    await pool.query(`DELETE FROM email_intake WHERE subject = 'FW: original'`);
  });
});

afterAll(async () => {
  await pool.end(); // file-level: after every describe in this file
});
