// Resolve the worksheet a class is working from for a given bound lesson plan: prefer the class's
// own adapted copy, else the master plan's. Used by the pupil surface (/me) and the teacher's
// read-back so both render exactly the same document and version.
import { getAdaptation } from '../repos/adaptations';
import { getCurrentVersion, listResourcesForAdaptation, listResourcesForPlan, type LinkedResource } from '../repos/resources';
import { readStored } from '../lib/resourceStore';

export interface ResolvedWorksheet {
  resourceId: number;
  versionNo: number;
  title: string;
  markdown: string;
  adapted: boolean;
}

export async function getLessonWorksheet(groupCourseId: number, lessonPlanId: number): Promise<ResolvedWorksheet | null> {
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
  let markdown: string;
  try {
    markdown = (await readStored(v.storagePath)).toString('utf8');
  } catch {
    return null;
  }
  return { resourceId: res.resourceId, versionNo: v.versionNo, title: res.title, markdown, adapted };
}
