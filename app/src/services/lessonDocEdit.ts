// Phase 13.4 — save a teacher's manual edit of a lesson document (slides / worksheet markdown) from
// the pupil-preview surface. Two scopes (matching the lesson edit toggle):
//   master — version the MASTER resource (every class using this lesson sees it).
//   local  — version THIS CLASS's adapted copy (created the first time, seeded from the effective
//            markdown; the master and other classes are unchanged). Persistent for the class.
// Pure resource plumbing over the existing store — no AI.
import { getAdaptation, upsertAdaptation } from '../repos/adaptations';
import {
  addVersionWithFile,
  createResourceWithVersion,
  linkResourceToAdaptation,
  linkResourceToPlan,
  listResourcesForAdaptation,
  listResourcesForPlan,
  type LinkedResource,
} from '../repos/resources';
import { checksum } from '../lib/resourceStore';
import { getPlanRow } from '../repos/schemes';
import { safeFilename } from './resource';

export type DocKind = 'slides' | 'worksheet';
export type EditScope = 'local' | 'master';

const STORE_KIND: Record<DocKind, string> = { slides: 'slides', worksheet: 'worksheet' };
// A renderable markdown doc of this kind (so an uploaded .pptx stored as 'slides' is never matched).
const isMdDoc = (kind: DocKind) => (r: LinkedResource): boolean => r.kind === kind && /\.(md|markdown)$/i.test(r.title);

async function writeVersion(resourceId: number, title: string, buf: Buffer, note: string): Promise<void> {
  // BUG-028: file + version row + current-version pointer in ONE transaction (no orphan on a crash).
  await addVersionWithFile(resourceId, { filename: title, buf, checksum: checksum(buf), author: 'teacher', changeNote: note });
}

// BUG-028: create the resource AND its first version in one transaction (atomic) — the first version's
// content is the doc the caller is saving, so there is no separate "create then version" gap to crash in.
async function createDoc(kind: DocKind, lp: number, suffix: string, versionFilename: string, buf: Buffer, note: string): Promise<number> {
  const plan = await getPlanRow(lp);
  const title = `${safeFilename(plan?.title ?? 'lesson').replace(/\.md$/i, '') || 'lesson'} — ${kind}${suffix}.md`;
  return createResourceWithVersion(
    { title, kind: STORE_KIND[kind], mimeType: 'text/markdown', source: 'ai_generated' },
    { filename: versionFilename, buf, checksum: checksum(buf), author: 'teacher', changeNote: note },
  );
}

export async function saveLessonDocMarkdown(gc: number, lp: number, kind: DocKind, scope: EditScope, markdown: string): Promise<{ ok: boolean; adapted: boolean }> {
  const buf = Buffer.from(markdown, 'utf8');

  if (scope === 'master') {
    const existing = (await listResourcesForPlan(lp)).find(isMdDoc(kind));
    if (existing) await writeVersion(existing.resourceId, existing.title, buf, 'edited in pupil preview');
    else {
      const id = await createDoc(kind, lp, '', `${kind}.md`, buf, 'created in pupil preview');
      await linkResourceToPlan(id, lp);
    }
    return { ok: true, adapted: false };
  }

  // local: ensure the class's adaptation row exists (without clobbering an existing one), then version
  // the adapted resource — creating it the first time so the master copy is never touched.
  let adaptationId = (await getAdaptation(gc, lp))?.id;
  if (adaptationId == null) {
    adaptationId = await upsertAdaptation({ groupCourseId: gc, lessonPlanId: lp, objectives: null, outline: null, adaptationNote: null, changeSummary: 'edited a resource for this class' });
  }
  const existing = (await listResourcesForAdaptation(adaptationId)).find(isMdDoc(kind));
  if (existing) await writeVersion(existing.resourceId, existing.title, buf, 'edited for this class in pupil preview');
  else {
    const id = await createDoc(kind, lp, ' (class)', `${kind} (class).md`, buf, 'created for this class in pupil preview');
    await linkResourceToAdaptation(id, adaptationId);
  }
  return { ok: true, adapted: true };
}
