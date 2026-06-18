// Phase 12 B1 — gather the TEXT of a lesson's already-prepared materials so worksheet generation and
// unit conversion can build ON the real content the teacher uploaded (slides, worksheets, handouts),
// not just the lesson title/outline. Reuses the existing docText extractor (PDF / Office via the
// Gotenberg sidecar / plain text) and the resource store. AI-generated docs and images are skipped
// (never feed our own output back in; images are handled separately by sourceImages). Best-effort:
// an unreadable or non-text file is silently skipped. The result rides context[] like every other AI
// input, so it inherits redaction / safeguarding-withholding / egress-assert / audit.
import { extractDocText } from '../lib/docText';
import {
  getCurrentVersion,
  getResource,
  listResourcesForPlan,
  listSourceDocsForPlan,
  type LinkedResource,
} from '../repos/resources';
import { readStored } from '../lib/resourceStore';

export interface MaterialFile {
  title: string;
  chars: number; // characters actually included (after the per-file cap)
}

export interface LessonMaterials {
  text: string; // the concatenated extract, ready to drop into context[]
  files: MaterialFile[]; // what was read + how much (for the teacher preview, B4)
  truncated: boolean; // a cap was hit (some content omitted)
}

export const PER_FILE_CAP = 4000; // chars per source file — enough to anchor the AI, not the whole book
export const TOTAL_CAP = 10000; // chars across all sources — keeps the prompt (and cost) bounded

const TEXT_EXT = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'odt', 'odp', 'rtf', 'txt', 'md', 'markdown', 'csv', 'text']);

/** Does this filename look like something docText can extract words from? (cheap pre-filter) */
export function isTextBearing(title: string): boolean {
  return TEXT_EXT.has((title.split('.').pop() ?? '').toLowerCase());
}

/**
 * B4 consent: read the generate form's `use_materials` field. The control posts a paired hidden
 * "0" plus a checked "1", so a CHECKED box yields '1' (on) and an UNCHECKED box yields only '0'
 * (off). A request with NO field at all (a generate button without the control) defaults to ON, so
 * every existing surface keeps building on materials unless the teacher explicitly opts out.
 */
export function readUseMaterials(body: unknown): boolean {
  const raw = (body as Record<string, unknown> | null | undefined)?.use_materials;
  if (raw === undefined) return true;
  return ([] as unknown[]).concat(raw).map(String).includes('1');
}

/**
 * Pure assembly of the materials block from already-extracted file texts — capped per-file and in
 * total, empty/whitespace files dropped. Separated from the IO so the capping is unit-testable.
 */
export function buildMaterialText(
  files: Array<{ title: string; text: string }>,
  perFileCap = PER_FILE_CAP,
  totalCap = TOTAL_CAP,
): LessonMaterials {
  const parts: string[] = [];
  const included: MaterialFile[] = [];
  let total = 0;
  let truncated = false;
  for (const f of files) {
    const text = (f.text ?? '').trim();
    if (!text) continue;
    if (total >= totalCap) {
      truncated = true;
      break;
    }
    const room = Math.min(perFileCap, totalCap - total);
    const slice = text.slice(0, room);
    if (slice.length < text.length) truncated = true;
    parts.push(`— ${f.title} —\n${slice}`);
    included.push({ title: f.title, chars: slice.length });
    total += slice.length;
  }
  return { text: parts.join('\n\n'), files: included, truncated };
}

/** The titles of the teacher's source docs that WOULD feed this plan's generation — cheap (no text
 *  extraction), for the pre-spend "build on my materials" preview/consent (B4). */
export async function materialCandidatesForPlan(planId: number): Promise<string[]> {
  return (await listSourceDocsForPlan(planId)).filter((r) => isTextBearing(r.title)).map((r) => r.title);
}

/** Read + extract the text of every text-bearing source linked to a plan, then cap it. Best-effort. */
export async function lessonMaterialsForPlan(planId: number): Promise<LessonMaterials> {
  const linked = await listResourcesForPlan(planId);
  return gather(linked);
}

/** Same, for an explicit set of resource ids — used by unit conversion (the folder's source files,
 *  before they are linked to any plan). Reads in id order; stops once the total cap is reached. */
export async function lessonMaterialsForResourceIds(ids: number[], totalCap = TOTAL_CAP): Promise<LessonMaterials> {
  const linked: LinkedResource[] = [];
  for (const id of ids) {
    const res = await getResource(id);
    if (res) linked.push({ resourceId: id, title: res.title, kind: res.kind, source: res.source });
  }
  return gather(linked, totalCap);
}

async function gather(linked: LinkedResource[], totalCap = TOTAL_CAP): Promise<LessonMaterials> {
  const extracted: Array<{ title: string; text: string }> = [];
  let approx = 0;
  for (const r of linked) {
    if (approx >= totalCap) break; // enough content already — don't pay for more extractions
    if (!isTextBearing(r.title)) continue;
    const res = await getResource(r.resourceId);
    if (!res || res.source === 'ai_generated') continue; // only the teacher's own source material
    const v = await getCurrentVersion(r.resourceId);
    if (!v) continue;
    let buf: Buffer;
    try {
      buf = await readStored(v.storagePath);
    } catch {
      continue;
    }
    let text = '';
    try {
      text = await extractDocText(buf, r.title);
    } catch {
      text = '';
    }
    if (text.trim()) {
      extracted.push({ title: r.title, text });
      approx += Math.min(text.length, PER_FILE_CAP);
    }
  }
  return buildMaterialText(extracted, PER_FILE_CAP, totalCap);
}
