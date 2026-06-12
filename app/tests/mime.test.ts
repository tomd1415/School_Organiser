import { describe, expect, it } from 'vitest';
import { decodeWords, parseMime, stripHtml } from '../src/lib/mime';

const CRLF = (s: string) => s.replace(/\n/g, '\r\n');

describe('parseMime (email intake v2)', () => {
  it('plain text email: subject, from, body', () => {
    const m = parseMime(Buffer.from(CRLF('From: Head <head@school.org>\nSubject: Cover needed P3\nDate: Fri, 12 Jun 2026\n\nPlease cover 9TDU period 3.\nThanks')));
    expect(m.subject).toBe('Cover needed P3');
    expect(m.from).toContain('head@school.org');
    expect(m.text).toContain('Please cover 9TDU period 3.');
  });

  it('RFC2047 encoded subject (base64 + quoted-printable)', () => {
    expect(decodeWords('=?utf-8?B?Q2xhc3MgdHJpcCDinIU=?=')).toBe('Class trip ✅');
    expect(decodeWords('=?iso-8859-1?Q?caf=E9_meeting?=')).toBe('café meeting');
  });

  it('quoted-printable body decodes', () => {
    const m = parseMime(Buffer.from(CRLF('Subject: QP\nContent-Transfer-Encoding: quoted-printable\nContent-Type: text/plain; charset=utf-8\n\nDon=E2=80=99t forget =\nthe forms')));
    expect(m.text).toBe('Don’t forget the forms');
  });

  it('multipart/alternative prefers text/plain over html', () => {
    const raw = CRLF(`Subject: Multi\nContent-Type: multipart/alternative; boundary="B1"\n\n--B1\nContent-Type: text/html\n\n<p>HTML <b>version</b></p>\n--B1\nContent-Type: text/plain\n\nPlain version\n--B1--\n`);
    const m = parseMime(Buffer.from(raw));
    expect(m.text).toBe('Plain version');
  });

  it('html-only email falls back to stripped text', () => {
    const raw = CRLF('Subject: H\nContent-Type: text/html\n\n<div>Trip forms<br>due <b>Friday</b> &amp; signed</div>');
    const m = parseMime(Buffer.from(raw));
    expect(m.text).toContain('Trip forms\ndue Friday & signed');
  });

  it('base64 body decodes', () => {
    const b64 = Buffer.from('Meeting moved to room 7', 'utf8').toString('base64');
    const m = parseMime(Buffer.from(CRLF(`Subject: B\nContent-Transfer-Encoding: base64\nContent-Type: text/plain\n\n${b64}`)));
    expect(m.text).toBe('Meeting moved to room 7');
  });

  it('stripHtml drops style/script and entities', () => {
    expect(stripHtml('<style>x{}</style><p>Hi&nbsp;there</p><script>bad()</script>')).toBe('Hi there');
  });
});
