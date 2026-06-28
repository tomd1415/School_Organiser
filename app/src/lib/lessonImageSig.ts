// A stateless capability for /lesson-image. The route serves teaching illustrations to any session,
// including the limited pupil/TA roles — but a limited role may ONLY fetch an image the server itself
// rendered into one of their pages, never an arbitrary id (BUG-003). The server signs the image URLs it
// hands a limited role (an onSend hook), and the route requires a matching signature for those roles.
// Teachers are unrestricted. Keyed by SESSION_KEY, so the capability rotates with the session secret.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { appConfig } from '../config/app';

// BUG-003: a signed image URL also carries an EXPIRY, so a copied/logged URL stops working after a window
// (≈ one school day) rather than lasting until the session secret rotates. The expiry is part of the signed
// payload AND echoed in the URL (?s=<sig>&e=<exp>), so the route can re-derive and check it.
const IMAGE_TTL_MS = 12 * 60 * 60 * 1000;

// The capability is identical for images and documents — only the signed-payload prefix differs, so a
// signature minted for /lesson-image/<id> can't be replayed against /lesson-doc/<id> (or vice versa).
function sigFor(kind: 'image' | 'doc', id: number, exp: number): string {
  return createHmac('sha256', appConfig.SESSION_KEY).update(`lesson-${kind}:${id}:${exp}`).digest('base64url').slice(0, 16);
}

function verifySig(kind: 'image' | 'doc', id: number, presented: string | undefined, exp: number | undefined, now: number): boolean {
  if (typeof presented !== 'string' || presented.length === 0) return false;
  if (typeof exp !== 'number' || !Number.isFinite(exp) || exp < now) return false; // missing or expired
  const expected = sigFor(kind, id, exp);
  if (presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
}

/** Verify a presented signature + expiry for an image id (constant-time compare; rejects an expired URL). */
export function verifyImageSig(id: number, presented: string | undefined, exp: number | undefined, now: number): boolean {
  return verifySig('image', id, presented, exp, now);
}

/** Verify a presented signature + expiry for a lesson-document id (same capability as images, different
 *  payload prefix so the two URL families can't be cross-replayed). */
export function verifyDocSig(id: number, presented: string | undefined, exp: number | undefined, now: number): boolean {
  return verifySig('doc', id, presented, exp, now);
}

/** The signed query suffix for an image id, valid for ~one school day, e.g. "?s=abc123&e=1700000000000". */
export function imageSigQuery(id: number, now: number): string {
  const exp = now + IMAGE_TTL_MS;
  return `?s=${sigFor('image', id, exp)}&e=${exp}`;
}

/** The signed query suffix for a lesson-document id, valid for ~one school day. */
export function docSigQuery(id: number, now: number): string {
  const exp = now + IMAGE_TTL_MS;
  return `?s=${sigFor('doc', id, exp)}&e=${exp}`;
}

/** Rewrite every UNSIGNED /lesson-image/<id> AND /lesson-doc/<id> reference in HTML to its signed form —
 *  applied to the HTML the server sends a limited role, so their browser only ever requests media the
 *  server chose to show them (the BUG-003 capability). Each family is signed with its own prefix.
 *  (?![\d?]) — the digits can't backtrack to a shorter number, and an already-signed URL isn't re-signed. */
export function signLessonMedia(html: string, now: number): string {
  return html
    .replace(/\/lesson-image\/(\d+)(?![\d?])/g, (_m, n: string) => `/lesson-image/${n}${imageSigQuery(Number(n), now)}`)
    .replace(/\/lesson-doc\/(\d+)(?![\d?])/g, (_m, n: string) => `/lesson-doc/${n}${docSigQuery(Number(n), now)}`);
}

/** @deprecated use signLessonMedia. Thin alias (images only), kept for compatibility. */
export function signLessonImages(html: string, now: number): string {
  return html.replace(/\/lesson-image\/(\d+)(?![\d?])/g, (_m, n: string) => `/lesson-image/${n}${imageSigQuery(Number(n), now)}`);
}
