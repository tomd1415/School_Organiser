// Phase 17.1 — bulk-import reference lessons into the existing resource store. Given staged files (relative
// Teach Computing path + bytes), create one reference resource per file: stamp its TCC coordinates
// (tcc_unit_key, tcc_lesson_no), infer an activity type, and attribute it to Teach Computing / OGL.
// Idempotent on the store's SHA-256 (re-running, and the +1.5 GB later, skip dupes). No AI; structure-only.
// Reuses createResourceWithVersion — does NOT rebuild the store. The host-side bulk command points this at
// the real TeachComputing/ tree; the test suite drives it with in-memory fixtures.
import { createResourceWithVersion } from '../repos/resources';
import { checksum } from '../lib/resourceStore';
import { checksumExists, setResourceReference } from '../repos/reference';
import { inferActivityType, parseTccPath } from './referenceImport';

const TCC_ATTRIBUTION = 'Teach Computing Curriculum © Raspberry Pi Foundation, used under the Open Government Licence v3.0.';

// `kind` is the coarse resource category (CHECK: document/slides/worksheet/quiz/image/link/note); zips and
// PDFs map to 'document'. The precise type lives in mime_type.
const EXT_MAP: Record<string, { kind: string; mime: string }> = {
  zip: { kind: 'document', mime: 'application/zip' },
  pptx: { kind: 'slides', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  ppt: { kind: 'slides', mime: 'application/vnd.ms-powerpoint' },
  docx: { kind: 'worksheet', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  doc: { kind: 'worksheet', mime: 'application/msword' },
  pdf: { kind: 'document', mime: 'application/pdf' },
  md: { kind: 'worksheet', mime: 'text/markdown' },
  txt: { kind: 'document', mime: 'text/plain' },
  png: { kind: 'image', mime: 'image/png' },
  jpg: { kind: 'image', mime: 'image/jpeg' },
  jpeg: { kind: 'image', mime: 'image/jpeg' },
  xlsx: { kind: 'document', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

function kindAndMime(fileName: string): { kind: string; mime: string } {
  const ext = (fileName.split('.').pop() ?? '').toLowerCase();
  return EXT_MAP[ext] ?? { kind: 'document', mime: 'application/octet-stream' };
}

/** Strip version/extension noise from a file name for a friendly title. */
export function referenceTitle(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_ ]v\d+(?:\.\d+)*$/i, '')
    .replace(/_/g, ' ')
    .trim();
}

export interface StagedReference {
  relPath: string; // e.g. 'KS3/year_7/unit_1/Lesson 2 …_v1.zip'
  buf: Buffer;
}

export interface ReferenceImportSummary {
  created: number;
  skipped: number;
  resourceIds: number[];
}

/** Import staged reference files into the store, idempotently (skip dupes by checksum). */
export async function importReferenceFiles(files: StagedReference[]): Promise<ReferenceImportSummary> {
  const summary: ReferenceImportSummary = { created: 0, skipped: 0, resourceIds: [] };
  for (const f of files) {
    const sum = checksum(f.buf);
    if (await checksumExists(sum)) {
      summary.skipped++;
      continue;
    }
    const coords = parseTccPath(f.relPath);
    const { kind, mime } = kindAndMime(coords.fileName);
    const title = referenceTitle(coords.fileName);
    const resId = await createResourceWithVersion(
      {
        title,
        kind,
        mimeType: mime,
        source: 'imported',
        unit: coords.unitKey,
        yearGroup: coords.yearGroup != null ? `Year ${coords.yearGroup}` : null,
        sourceAttribution: TCC_ATTRIBUTION,
      },
      { filename: coords.fileName, buf: f.buf, checksum: sum, author: 'teacher', changeNote: `imported from ${f.relPath}` },
    );
    await setResourceReference(resId, {
      tccUnitKey: coords.unitKey,
      tccLessonNo: coords.lessonNo,
      activityType: inferActivityType(coords.fileName),
    });
    summary.created++;
    summary.resourceIds.push(resId);
  }
  return summary;
}
