// Resolve the worksheet a class is working from for a given bound lesson plan: prefer the class's
// own adapted copy, else the master plan's. Used by the pupil surface (/me) and the teacher's
// read-back so both render exactly the same document and version.
import { getAdaptation } from '../repos/adaptations';
import { getCurrentVersion, listResourcesForAdaptation, listResourcesForPlan, type LinkedResource } from '../repos/resources';
import { readStored } from '../lib/resourceStore';

export interface WorksheetMeta {
  resourceId: number;
  versionNo: number;
  storagePath: string;
  title: string;
  adapted: boolean;
}

export interface ResolvedWorksheet extends WorksheetMeta {
  markdown: string;
}

/** Resolve WHICH worksheet (resource + current version) a class works from — no file read.
 * Cheap enough to call on every autosave just to record answer provenance. */
export async function getLessonWorksheetMeta(groupCourseId: number, lessonPlanId: number): Promise<WorksheetMeta | null> {
  const pick = (rs: LinkedResource[]): LinkedResource | undefined => rs.find((r) => r.kind === 'worksheet');
  const adaptation = await getAdaptation(groupCourseId, lessonPlanId);
  let res: LinkedResource | undefined;
  let adapted = false;
  if (adaptation) {
    res = pick(await listResourcesForAdaptation(adaptation.id));
    adapted = res != null;
  }
  if (!res) res = pick(await listResourcesForPlan(lessonPlanId));
  if (!res) return null;
  const v = await getCurrentVersion(res.resourceId);
  if (!v) return null;
  return { resourceId: res.resourceId, versionNo: v.versionNo, storagePath: v.storagePath, title: res.title, adapted };
}

/** As above, plus the worksheet markdown (reads the stored file). Use only when rendering. */
export async function getLessonWorksheet(groupCourseId: number, lessonPlanId: number): Promise<ResolvedWorksheet | null> {
  const meta = await getLessonWorksheetMeta(groupCourseId, lessonPlanId);
  if (!meta) return null;
  try {
    const markdown = (await readStored(meta.storagePath)).toString('utf8');
    return { ...meta, markdown };
  } catch {
    return null;
  }
}
