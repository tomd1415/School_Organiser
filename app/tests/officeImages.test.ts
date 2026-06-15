import { describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import { extractOfficeImages, canHaveImages } from '../src/lib/officeImages';

// Build a synthetic Office package (a ZIP) with the given internal files.
function pkg(entries: Array<{ name: string; bytes: Buffer }>): Buffer {
  const zip = new AdmZip();
  for (const e of entries) zip.addFile(e.name, e.bytes);
  return zip.toBuffer();
}
const fill = (n: number, byte: number): Buffer => Buffer.alloc(n, byte);

describe('officeImages — extract embedded pictures from a source deck', () => {
  it('pulls raster media over the size floor; skips tiny icons and non-media parts', () => {
    const buf = pkg([
      { name: 'ppt/slides/slide1.xml', bytes: fill(500, 1) }, // not media — ignored
      { name: 'ppt/media/image1.png', bytes: fill(5000, 2) }, // a real visual
      { name: 'ppt/media/image2.jpeg', bytes: fill(8000, 3) }, // a real visual
      { name: 'ppt/media/bullet.png', bytes: fill(800, 4) }, // < 3KB → icon/bullet, skipped
    ]);
    const imgs = extractOfficeImages(buf, 'deck.pptx');
    expect(imgs.map((i) => i.name).sort()).toEqual(['image1.png', 'image2.jpeg']);
    expect(imgs.every((i) => i.mime.startsWith('image/'))).toBe(true);
  });

  it('de-duplicates the same picture reused across slides (by content hash)', () => {
    const same = fill(6000, 9);
    const buf = pkg([
      { name: 'ppt/media/image1.png', bytes: same },
      { name: 'ppt/media/image2.png', bytes: same }, // identical bytes → one kept
      { name: 'ppt/media/image3.png', bytes: fill(6000, 10) },
    ]);
    expect(extractOfficeImages(buf, 'deck.pptx')).toHaveLength(2);
  });

  it('skips SVG (would be force-downloaded for XSS-safety, never rendered inline)', () => {
    const buf = pkg([{ name: 'word/media/image1.svg', bytes: fill(5000, 1) }]);
    expect(extractOfficeImages(buf, 'doc.docx')).toHaveLength(0);
  });

  it('reads docx (word/media) and odp (Pictures/) layouts too', () => {
    expect(extractOfficeImages(pkg([{ name: 'word/media/image1.png', bytes: fill(5000, 1) }]), 'a.docx')).toHaveLength(1);
    expect(extractOfficeImages(pkg([{ name: 'Pictures/100002.png', bytes: fill(5000, 1) }]), 'a.odp')).toHaveLength(1);
  });

  it('a non-zip buffer (legacy .doc / .pdf / corrupt) yields nothing, never throws', () => {
    expect(extractOfficeImages(Buffer.from('%PDF-1.7 not a zip'), 'old.pdf')).toEqual([]);
    expect(extractOfficeImages(Buffer.from('\xD0\xCF\x11\xE0 legacy doc'), 'old.doc')).toEqual([]);
  });

  it('caps the number of images so one deck cannot flood a lesson', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ name: `ppt/media/image${i}.png`, bytes: fill(5000, i + 20) }));
    expect(extractOfficeImages(pkg(entries), 'big.pptx').length).toBe(12);
  });

  it('canHaveImages recognises Office packages only', () => {
    expect(canHaveImages('deck.pptx')).toBe(true);
    expect(canHaveImages('notes.docx')).toBe(true);
    expect(canHaveImages('scan.pdf')).toBe(false);
    expect(canHaveImages('photo.png')).toBe(false);
  });
});
