import { describe, it, expect } from 'vitest';
import { signLessonImages, verifyImageSig, imageSigQuery } from '../src/lib/lessonImageSig';

// BUG-003: a limited role may only fetch an image the server signed into one of their pages.
describe('lessonImageSig — the /lesson-image capability', () => {
  it('signs unsigned /lesson-image URLs in HTML and is idempotent', () => {
    const html = '<img class="md-img" src="/lesson-image/42" alt="x"> and <img src="/lesson-image/7">';
    const signed = signLessonImages(html);
    expect(signed).toMatch(/\/lesson-image\/42\?s=[A-Za-z0-9_-]+/);
    expect(signed).toMatch(/\/lesson-image\/7\?s=[A-Za-z0-9_-]+/);
    expect(signLessonImages(signed)).toBe(signed); // already-signed URLs are not double-signed
  });

  it('verifies a valid id-bound signature and rejects forged / mismatched / missing ones', () => {
    const s = imageSigQuery(99).slice(3); // strip "?s="
    expect(verifyImageSig(99, s)).toBe(true);
    expect(verifyImageSig(100, s)).toBe(false); // the signature is bound to the id
    expect(verifyImageSig(99, undefined)).toBe(false);
    expect(verifyImageSig(99, '')).toBe(false);
    expect(verifyImageSig(99, 'forgedforgedforg')).toBe(false);
  });
});
