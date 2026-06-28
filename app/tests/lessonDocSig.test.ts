import { describe, it, expect } from 'vitest';
import { signLessonMedia, verifyDocSig, verifyImageSig, docSigQuery, imageSigQuery } from '../src/lib/lessonImageSig';

// Note #3: provided lesson documents are pupil-viewable via the signed /lesson-doc capability — the same
// BUG-003 model as /lesson-image, with a separate payload prefix so the two can't be cross-replayed.
describe('lessonDocSig — the /lesson-doc capability', () => {
  const NOW = 1_700_000_000_000;

  it('signs unsigned /lesson-doc AND /lesson-image URLs in one HTML pass (with expiry, idempotent)', () => {
    const html = '<a href="/lesson-doc/5">doc</a> and <img src="/lesson-image/42">';
    const signed = signLessonMedia(html, NOW);
    expect(signed).toMatch(/\/lesson-doc\/5\?s=[A-Za-z0-9_-]+&e=\d+/);
    expect(signed).toMatch(/\/lesson-image\/42\?s=[A-Za-z0-9_-]+&e=\d+/);
    expect(signLessonMedia(signed, NOW)).toBe(signed); // already-signed URLs are not double-signed
  });

  it('verifies a valid doc signature and rejects forged / wrong-id / missing / expired', () => {
    const q = docSigQuery(77, NOW);
    const s = /s=([^&]+)/.exec(q)![1]!;
    const exp = Number(/e=(\d+)/.exec(q)![1]);
    expect(verifyDocSig(77, s, exp, NOW)).toBe(true);
    expect(verifyDocSig(78, s, exp, NOW)).toBe(false); // bound to the id
    expect(verifyDocSig(77, s, exp, exp + 1)).toBe(false); // expired
    expect(verifyDocSig(77, s, undefined, NOW)).toBe(false);
    expect(verifyDocSig(77, undefined, exp, NOW)).toBe(false);
    expect(verifyDocSig(77, 'forgedforgedforg', exp, NOW)).toBe(false);
  });

  it('does NOT accept an image signature for a doc id (or vice versa) — no cross-replay', () => {
    const imgQ = imageSigQuery(50, NOW);
    const imgS = /s=([^&]+)/.exec(imgQ)![1]!;
    const imgExp = Number(/e=(\d+)/.exec(imgQ)![1]);
    expect(verifyImageSig(50, imgS, imgExp, NOW)).toBe(true); // valid as an image…
    expect(verifyDocSig(50, imgS, imgExp, NOW)).toBe(false); // …but NOT as a doc

    const docQ = docSigQuery(50, NOW);
    const docS = /s=([^&]+)/.exec(docQ)![1]!;
    const docExp = Number(/e=(\d+)/.exec(docQ)![1]);
    expect(verifyDocSig(50, docS, docExp, NOW)).toBe(true);
    expect(verifyImageSig(50, docS, docExp, NOW)).toBe(false); // doc sig rejected as an image
  });
});
