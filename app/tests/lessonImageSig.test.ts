import { describe, it, expect } from 'vitest';
import { signLessonImages, verifyImageSig, imageSigQuery } from '../src/lib/lessonImageSig';

// BUG-003: a limited role may only fetch an image the server signed into one of their pages.
describe('lessonImageSig — the /lesson-image capability', () => {
  const NOW = 1_700_000_000_000;

  it('signs unsigned /lesson-image URLs in HTML (with an expiry) and is idempotent', () => {
    const html = '<img class="md-img" src="/lesson-image/42" alt="x"> and <img src="/lesson-image/7">';
    const signed = signLessonImages(html, NOW);
    expect(signed).toMatch(/\/lesson-image\/42\?s=[A-Za-z0-9_-]+&e=\d+/);
    expect(signed).toMatch(/\/lesson-image\/7\?s=[A-Za-z0-9_-]+&e=\d+/);
    expect(signLessonImages(signed, NOW)).toBe(signed); // already-signed URLs are not double-signed
  });

  it('verifies a valid id+expiry signature and rejects forged / mismatched / missing / expired ones', () => {
    const q = imageSigQuery(99, NOW); // "?s=<sig>&e=<exp>"
    const s = /s=([^&]+)/.exec(q)![1]!;
    const exp = Number(/e=(\d+)/.exec(q)![1]);
    expect(verifyImageSig(99, s, exp, NOW)).toBe(true);
    expect(verifyImageSig(100, s, exp, NOW)).toBe(false); // bound to the id
    expect(verifyImageSig(99, s, exp, exp + 1)).toBe(false); // EXPIRED — now is past the expiry
    expect(verifyImageSig(99, s, undefined, NOW)).toBe(false); // missing expiry
    expect(verifyImageSig(99, undefined, exp, NOW)).toBe(false);
    expect(verifyImageSig(99, '', exp, NOW)).toBe(false);
    expect(verifyImageSig(99, 'forgedforgedforg', exp, NOW)).toBe(false);
  });
});
