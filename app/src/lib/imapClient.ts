// A minimal IMAP4rev1 client — dependency-free (npm is unreachable on the school line), covering
// exactly the poller's needs: LOGIN, SELECT, SEARCH UNSEEN, FETCH BODY.PEEK[], STORE \Seen,
// LOGOUT, over TLS (or plain TCP for the in-process test server). Handles IMAP literals
// ({123}\r\n + raw bytes) which carry the message bodies.
import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import { connect as netConnect, type Socket } from 'node:net';

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  folder: string;
  tls: boolean;
}

interface Line {
  text: string;
  literal: Buffer | null;
}

class ImapSession {
  private sock!: Socket | TLSSocket;
  private buf = Buffer.alloc(0);
  private waiters: Array<(l: Line) => void> = [];
  private pending: Line[] = [];
  private tagN = 0;
  private err: Error | null = null;

  async connect(cfg: ImapConfig): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const onErr = (e: Error) => reject(e);
      this.sock = cfg.tls
        ? tlsConnect({ host: cfg.host, port: cfg.port, servername: cfg.host }, () => resolve())
        : netConnect({ host: cfg.host, port: cfg.port }, () => resolve());
      this.sock.once('error', onErr);
      this.sock.setTimeout(30_000, () => this.sock.destroy(new Error('IMAP timeout')));
    });
    this.sock.on('data', (d: Buffer) => this.feed(d));
    this.sock.on('error', (e: Error) => {
      this.err = e;
      this.flushWaiters();
    });
    this.sock.on('close', () => {
      this.err ??= new Error('IMAP connection closed');
      this.flushWaiters();
    });
    await this.readLine(); // server greeting
  }

  private flushWaiters(): void {
    while (this.waiters.length) this.waiters.shift()!({ text: '', literal: null });
  }

  // Split the stream into lines, attaching {N} literals to the line that announced them.
  private feed(d: Buffer): void {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      const nl = this.buf.indexOf('\r\n');
      if (nl === -1) return;
      const text = this.buf.subarray(0, nl).toString('utf8');
      const lit = text.match(/\{(\d+)\}$/);
      if (lit) {
        const size = Number(lit[1]);
        if (this.buf.length < nl + 2 + size) return; // wait for the full literal
        const literal = this.buf.subarray(nl + 2, nl + 2 + size);
        this.buf = this.buf.subarray(nl + 2 + size);
        this.deliver({ text, literal });
      } else {
        this.buf = this.buf.subarray(nl + 2);
        this.deliver({ text, literal: null });
      }
    }
  }

  private deliver(l: Line): void {
    const w = this.waiters.shift();
    if (w) w(l);
    else this.pending.push(l);
  }

  private readLine(): Promise<Line> {
    if (this.err) return Promise.reject(this.err);
    const p = this.pending.shift();
    if (p) return Promise.resolve(p);
    return new Promise((resolve, reject) => {
      if (this.err) return reject(this.err);
      this.waiters.push((l) => (this.err && l.text === '' ? reject(this.err) : resolve(l)));
    });
  }

  /** Send a command; collect untagged lines until the tagged completion. Throws on NO/BAD. */
  async cmd(command: string): Promise<Line[]> {
    const tag = `A${++this.tagN}`;
    this.sock.write(`${tag} ${command}\r\n`);
    const lines: Line[] = [];
    for (;;) {
      const l = await this.readLine();
      if (l.text.startsWith(`${tag} `)) {
        if (!l.text.startsWith(`${tag} OK`)) throw new Error(`IMAP ${command.split(' ')[0]} failed: ${l.text.slice(tag.length + 1, tag.length + 120)}`);
        return lines;
      }
      lines.push(l);
    }
  }

  end(): void {
    this.sock.destroy();
  }
}

function q(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export interface FetchedMail {
  seq: number;
  raw: Buffer;
}

/** One polling session: log in, fetch every UNSEEN message (peek — nothing marked yet), and hand
 * each to `handler`; only messages whose handler succeeds are marked \Seen. */
export async function pollMailbox(
  cfg: ImapConfig,
  handler: (mail: FetchedMail) => Promise<void>,
): Promise<{ found: number; imported: number; failed: number }> {
  const s = new ImapSession();
  await s.connect(cfg);
  try {
    await s.cmd(`LOGIN ${q(cfg.user)} ${q(cfg.password)}`);
    await s.cmd(`SELECT ${q(cfg.folder || 'INBOX')}`);
    const search = await s.cmd('SEARCH UNSEEN');
    const seqs = search
      .map((l) => l.text)
      .filter((t) => t.startsWith('* SEARCH'))
      .flatMap((t) => t.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean).map(Number))
      .filter((n) => Number.isInteger(n) && n > 0);
    let imported = 0;
    let failed = 0;
    for (const seq of seqs) {
      try {
        const fetched = await s.cmd(`FETCH ${seq} (BODY.PEEK[])`);
        const withLiteral = fetched.find((l) => l.literal);
        if (!withLiteral?.literal) throw new Error('no body literal in FETCH response');
        await handler({ seq, raw: withLiteral.literal });
        await s.cmd(`STORE ${seq} +FLAGS (\\Seen)`);
        imported++;
      } catch {
        failed++; // leave unseen — it will be retried next poll
      }
    }
    await s.cmd('LOGOUT').catch(() => undefined);
    return { found: seqs.length, imported, failed };
  } finally {
    s.end();
  }
}
