// A stateless capability for /lesson-image. The route serves teaching illustrations to any session,
// including the limited pupil/TA roles — but a limited role may ONLY fetch an image the server itself
// rendered into one of their pages, never an arbitrary id (BUG-003). The server signs the image URLs it
// hands a limited role (an onSend hook), and the route requires a matching signature for those roles.
// Teachers are unrestricted. Keyed by SESSION_KEY, so the capability rotates with the session secret.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { appConfig } from '../config/app';

function sig(id: number): string {
  return createHmac('sha256', appConfig.SESSION_KEY).update(`lesson-image:${id}`).digest('base64url').slice(0, 16);
}

/** Verify a presented signature for an image id (constant-time compare). */
export function verifyImageSig(id: number, presented: string | undefined): boolean {
  if (typeof presented !== 'string' || presented.length === 0) return false;
  const expected = sig(id);
  if (presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
}

/** The signed query suffix for an image id, e.g. "?s=abc123". */
export function imageSigQuery(id: number): string {
  return `?s=${sig(id)}`;
}

/** Rewrite every UNSIGNED /lesson-image/<id> reference in HTML to its signed form — applied to the HTML
 *  the server sends a limited role, so their browser only ever requests images the server chose to show. */
export function signLessonImages(html: string): string {
  // (?![\d?]) — the digits can't backtrack to a shorter number, and an already-signed URL (…<id>?s=…)
  // isn't re-signed.
  return html.replace(/\/lesson-image\/(\d+)(?![\d?])/g, (_m, n: string) => `/lesson-image/${n}${imageSigQuery(Number(n))}`);
}
