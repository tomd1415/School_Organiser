// Phase 11 — carry images over from a lesson's source slides/unit into its generated resources.
// Extracts the embedded pictures from the plan's linked SOURCE Office files, stores each as an
// image resource linked to the plan, and returns the list so the generator can embed them. The
// resource view route already serves raster images inline, and the Markdown renderer now accepts
// app-hosted (/resources/:id/view) image URLs — so an embedded reference actually renders.
import { extractOfficeImages, canHaveImages } from '../lib/officeImages';
import {
  addVersion,
  createResource,
  getCurrentVersion,
  getResource,
  linkResourceToPlan,
  listResourcesForPlan,
  listSourceFilesForUnit,
} from '../repos/resources';
import { getPlanRow } from '../repos/schemes';
import { readStored, relPathFor, storeBuffer } from '../lib/resourceStore';

const titleWords = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, '') // drop extension
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 2),
  );

export interface SourceImage {
  id: number;
  label: string; // the original media filename (a hint for the model)
  url: string; // /resources/:id/view
}

const SRC_IMG_PREFIX = 'src-img-'; // deterministic, content-hashed title → idempotent across re-runs

/**
 * Idempotently materialise the source images for a lesson plan. Re-runs reuse the same resource
 * (titled by content hash), so regenerating a lesson's resources never duplicates images. Returns
 * every available source image (existing + newly extracted). Best-effort: unreadable / non-Office /
 * AI-generated sources are skipped, never throw.
 */
export async function ensureSourceImagesForPlan(planId: number): Promise<SourceImage[]> {
  const linked = await listResourcesForPlan(planId);
  const existingByTitle = new Map<string, number>();
  for (const r of linked) {
    if (r.kind === 'image' && r.title.startsWith(SRC_IMG_PREFIX)) existingByTitle.set(r.title, r.resourceId);
  }

  // Candidate source files: the plan's own linked Office files first.
  const sources: Array<{ resourceId: number; title: string }> = linked
    .filter((r) => canHaveImages(r.title))
    .map((r) => ({ resourceId: r.resourceId, title: r.title }));

  // Fallback for units converted before per-plan source linking existed: their sources are linked at
  // the UNIT level. Match the plan to its unit's source files by title overlap, then LINK the best
  // matches to the plan (a one-time backfill, so subsequent runs use the fast path above).
  if (sources.length === 0 && existingByTitle.size === 0) {
    const plan = await getPlanRow(planId);
    if (plan?.unitId) {
      const unitFiles = (await listSourceFilesForUnit(Number(plan.unitId))).filter((f) => canHaveImages(f.title));
      // Best signal on real data: the plan title carries a lesson number ("Lesson 3 – …") and each
      // source deck was imported from a "Lesson N" folder. Match on that; the decks are named by
      // topic, so title word-overlap (below) is only a last resort.
      const planLesson = /(?:lesson|^l)\s*0*(\d+)/i.exec(plan.title)?.[1] ?? null;
      const pathLesson = (p: string): string | null => {
        for (const seg of p.split('/')) {
          const m = /^(?:lesson|l)\s*0*(\d+)\b/i.exec(seg.trim());
          if (m) return m[1]!;
        }
        return null;
      };
      let matched = planLesson ? unitFiles.filter((f) => pathLesson(f.path) === planLesson) : [];
      if (matched.length === 0) {
        const want = titleWords(plan.title);
        matched = unitFiles
          .map((f) => ({ f, score: [...titleWords(f.title)].filter((w) => want.has(w)).length }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((x) => x.f);
      }
      for (const f of matched.slice(0, 4)) {
        await linkResourceToPlan(f.resourceId, planId).catch(() => {});
        sources.push({ resourceId: f.resourceId, title: f.title });
      }
    }
  }

  const out: SourceImage[] = [];
  const seenTitles = new Set<string>();
  for (const r of sources) {
    const res = await getResource(r.resourceId);
    if (!res || res.source === 'ai_generated') continue; // never mine our own generated markdown
    const v = await getCurrentVersion(r.resourceId);
    if (!v) continue;
    let buf: Buffer;
    try {
      buf = await readStored(v.storagePath);
    } catch {
      continue;
    }
    for (const img of extractOfficeImages(buf, r.title)) {
      const title = `${SRC_IMG_PREFIX}${img.sha.slice(0, 12)}.${img.ext}`;
      if (seenTitles.has(title)) continue;
      seenTitles.add(title);
      let id = existingByTitle.get(title);
      if (id == null) {
        id = await createResource(title, 'image', img.mime, 'imported');
        const rel = relPathFor(id, 1, title);
        await storeBuffer(rel, img.bytes);
        await addVersion(id, rel, img.bytes.length, img.sha, 'teacher', `image from source: ${r.title}`);
        await linkResourceToPlan(id, planId);
      }
      out.push({ id, label: img.name, url: `/lesson-image/${id}` }); // pupil/TA-accessible (see /lesson-image)
    }
  }
  return out;
}
