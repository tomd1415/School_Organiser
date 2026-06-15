// Phase 11 — carry images over from the source unit/slides into generated worksheets. Office files
// (.pptx/.docx/.odp/.odt/.xlsx) are ZIP archives whose embedded pictures live under a media folder;
// we already depend on adm-zip, so pull them straight out — no new package, no Gotenberg round-trip.
// Deliberately conservative: raster only (an extracted SVG would be force-downloaded for XSS-safety,
// §SECURITY, so it could never render inline anyway), tiny images skipped (logos/bullets/icons), and
// a hard cap so one slide deck can't flood a lesson.
import AdmZip from 'adm-zip';
import { createHash } from 'node:crypto';

// Where the picture parts sit in each Office package (OOXML: ppt/word/xl ; ODF: Pictures/).
const MEDIA_DIRS = ['ppt/media/', 'word/media/', 'xl/media/', 'Pictures/'];
// Raster types only — SVG omitted on purpose (served as a download, never inline).
const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};
const MIN_BYTES = 3000; // below this it's almost always a bullet/icon/logo, not a teaching visual
const MAX_IMAGES = 12; // a sane ceiling per source file

export interface ExtractedImage {
  name: string; // the original media filename (e.g. "image3.png")
  ext: string;
  mime: string;
  bytes: Buffer;
  sha: string; // sha256 of the bytes — drives cross-file + cross-run de-duplication
}

const isOfficeZipName = (filename: string): boolean =>
  /\.(pptx|docx|xlsx|odp|odt|ods)$/i.test(filename);

/** True if a filename is an Office package we can mine for images (a ZIP container). */
export function canHaveImages(filename: string): boolean {
  return isOfficeZipName(filename);
}

/** Extract the embedded raster images from one Office file. Returns [] for anything that isn't a
 *  readable Office ZIP (a stray .doc/.pdf, a corrupt file) — never throws. */
export function extractOfficeImages(buf: Buffer, filename = ''): ExtractedImage[] {
  if (filename && !isOfficeZipName(filename)) return [];
  let zip: AdmZip;
  try {
    zip = new AdmZip(buf);
  } catch {
    return []; // not a zip (e.g. legacy binary .doc/.ppt, or truncated) — nothing to mine
  }
  const seen = new Set<string>();
  const out: ExtractedImage[] = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const path = entry.entryName;
    if (!MEDIA_DIRS.some((d) => path.startsWith(d))) continue;
    const ext = (path.split('.').pop() ?? '').toLowerCase();
    const mime = IMAGE_MIME[ext];
    if (!mime) continue; // svg/emf/wmf and non-images skipped
    let bytes: Buffer;
    try {
      bytes = entry.getData();
    } catch {
      continue;
    }
    if (bytes.length < MIN_BYTES) continue;
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (seen.has(sha)) continue; // the same picture reused on many slides → keep one
    seen.add(sha);
    out.push({ name: path.split('/').pop() ?? path, ext, mime, bytes, sha });
    if (out.length >= MAX_IMAGES) break;
  }
  return out;
}
