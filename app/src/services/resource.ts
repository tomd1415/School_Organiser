// ResourceService — pure helpers: classify a file, make a safe name, validate a
// link target, and decide how to preview. The store I/O is in lib/resourceStore.ts.

export const RESOURCE_KINDS = ['document', 'slides', 'worksheet', 'quiz', 'image', 'link', 'note'] as const;

const EXT_KIND: Record<string, string> = {
  pptx: 'slides', ppt: 'slides', odp: 'slides', key: 'slides',
  docx: 'document', doc: 'document', odt: 'document', rtf: 'document', txt: 'document', md: 'document', pdf: 'document',
  xlsx: 'worksheet', xls: 'worksheet', ods: 'worksheet', csv: 'worksheet',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image',
};

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', mp4: 'video/mp4', mp3: 'audio/mpeg', zip: 'application/zip',
};

const OFFICE_EXT = new Set(['docx', 'doc', 'odt', 'rtf', 'pptx', 'ppt', 'odp', 'xlsx', 'xls', 'ods']);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']);

export function extOf(filename: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(filename);
  return m && m[1] ? m[1].toLowerCase() : '';
}

export function kindFromFilename(filename: string): string {
  return EXT_KIND[extOf(filename)] ?? 'document';
}

export function mimeFromFilename(filename: string): string {
  return MIME_BY_EXT[extOf(filename)] ?? 'application/octet-stream';
}

/** A filesystem-safe leaf name (path stripped, odd chars replaced). */
export function safeFilename(name: string): string {
  const leaf = name.replace(/^.*[\\/]/, '');
  const cleaned = leaf.replace(/[^A-Za-z0-9._ -]/g, '_').replace(/\s+/g, ' ').trim();
  return (cleaned || 'file').slice(0, 180);
}

export interface LinkTarget {
  courseId?: number | null;
  unitId?: number | null;
  lessonPlanId?: number | null;
  occurrenceId?: number | null;
  groupId?: number | null;
}

export function exactlyOneTarget(t: LinkTarget): boolean {
  return [t.courseId, t.unitId, t.lessonPlanId, t.occurrenceId, t.groupId].filter((x) => x != null).length === 1;
}

export type PreviewKind = 'pdf' | 'image' | 'office' | 'other';

export function previewKind(mime: string | null, filename: string): PreviewKind {
  const ext = extOf(filename);
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (IMAGE_EXT.has(ext) || (mime ?? '').startsWith('image/')) return 'image';
  if (OFFICE_EXT.has(ext)) return 'office';
  return 'other';
}
