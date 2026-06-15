// Minimal MIME parsing for email intake — dependency-free, covering what school email actually
// sends: RFC2047-encoded subjects, multipart/alternative bodies, quoted-printable and base64
// transfer encodings, utf-8/latin1 charsets, and an HTML-stripping fallback when there is no
// text/plain part. Deliberately tolerant: anything unparseable degrades to raw text.

export interface ParsedMime {
  subject: string | null;
  from: string | null;
  date: string | null;
  text: string;
  messageId: string | null; // for de-duplicating re-seen messages on intake (#21)
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────

function decodeCharset(buf: Buffer, charset: string | null): string {
  const cs = (charset ?? 'utf-8').toLowerCase();
  if (cs.includes('1252') || cs.includes('latin') || cs.includes('8859')) return buf.toString('latin1');
  return buf.toString('utf8');
}

/** RFC2047 encoded-words in headers: =?utf-8?B?...?= / =?iso-8859-1?Q?...?= */
export function decodeWords(value: string): string {
  return value
    .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, cs: string, enc: string, data: string) => {
      try {
        if (enc.toLowerCase() === 'b') return decodeCharset(Buffer.from(data, 'base64'), cs);
        const qp = data.replace(/_/g, ' ').replace(/=([0-9a-fA-F]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
        return decodeCharset(Buffer.from(qp, 'latin1'), cs);
      } catch {
        return data;
      }
    })
    .replace(/\?=\s+=\?/g, '?==?'); // adjacent encoded words: separating WS is ignored
}

function decodeBody(buf: Buffer, encoding: string | null, charset: string | null): string {
  const enc = (encoding ?? '').toLowerCase().trim();
  try {
    if (enc === 'base64') return decodeCharset(Buffer.from(buf.toString('ascii').replace(/[\r\n\s]/g, ''), 'base64'), charset);
    if (enc === 'quoted-printable') {
      const qp = buf
        .toString('latin1')
        .replace(/=\r?\n/g, '') // soft line breaks
        .replace(/=([0-9a-fA-F]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
      return decodeCharset(Buffer.from(qp, 'latin1'), charset);
    }
  } catch {
    // fall through to raw
  }
  return decodeCharset(buf, charset);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── structure ────────────────────────────────────────────────────────────────────────────────

interface Part {
  headers: Map<string, string>;
  body: Buffer;
}

function splitHeadersBody(raw: Buffer): Part {
  const sep = raw.indexOf('\r\n\r\n');
  const sepLf = sep === -1 ? raw.indexOf('\n\n') : -1;
  const headEnd = sep !== -1 ? sep : sepLf !== -1 ? sepLf : raw.length;
  const bodyStart = sep !== -1 ? sep + 4 : sepLf !== -1 ? sepLf + 2 : raw.length;
  const headText = raw.subarray(0, headEnd).toString('latin1');
  const headers = new Map<string, string>();
  // unfold continuation lines, then split
  for (const line of headText.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim().toLowerCase();
      if (!headers.has(k)) headers.set(k, line.slice(idx + 1).trim());
    }
  }
  return { headers, body: raw.subarray(bodyStart) };
}

function param(headerValue: string | undefined, name: string): string | null {
  if (!headerValue) return null;
  const m = headerValue.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`, 'i')) ?? headerValue.match(new RegExp(`${name}\\s*=\\s*([^;\\s]+)`, 'i'));
  return m ? m[1]! : null;
}

/** Walk a (possibly multipart) part and return the best text body. Prefers text/plain. */
function bestText(part: Part, depth = 0): { plain: string | null; html: string | null } {
  const ct = (part.headers.get('content-type') ?? 'text/plain').toLowerCase();
  if (ct.startsWith('multipart/') && depth < 5) {
    const boundary = param(part.headers.get('content-type'), 'boundary');
    if (!boundary) return { plain: null, html: null };
    const marker = `--${boundary}`;
    const segments = part.body.toString('latin1').split(marker).slice(1, -1); // drop preamble + closing
    let plain: string | null = null;
    let html: string | null = null;
    for (const seg of segments) {
      const sub = splitHeadersBody(Buffer.from(seg.replace(/^\r?\n/, ''), 'latin1'));
      const got = bestText(sub, depth + 1);
      plain = plain ?? got.plain;
      html = html ?? got.html;
      if (plain) break;
    }
    return { plain, html };
  }
  const text = decodeBody(part.body, part.headers.get('content-transfer-encoding') ?? null, param(part.headers.get('content-type'), 'charset'));
  if (ct.startsWith('text/html')) return { plain: null, html: text };
  if (ct.startsWith('text/') || !part.headers.has('content-type')) return { plain: text, html: null };
  return { plain: null, html: null }; // attachments etc.
}

export function parseMime(raw: Buffer): ParsedMime {
  const top = splitHeadersBody(raw);
  const { plain, html } = bestText(top);
  const text = (plain ?? (html ? stripHtml(html) : top.body.toString('utf8'))).replace(/\r\n/g, '\n').trim();
  const subject = top.headers.get('subject') ? decodeWords(top.headers.get('subject')!) : null;
  const from = top.headers.get('from') ? decodeWords(top.headers.get('from')!) : null;
  const messageId = (top.headers.get('message-id') ?? '').replace(/[<>]/g, '').trim() || null;
  return { subject, from, date: top.headers.get('date') ?? null, text, messageId };
}
