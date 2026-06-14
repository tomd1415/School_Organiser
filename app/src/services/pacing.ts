// Fetch a class's recent pace samples and turn them into a sizing nudge (idea 2). The async seam over
// the pure classifyPace/paceItems: it counts the planned steps from each lesson outline, then defers
// all the gating + wording to the pure layer.
import { recentPaceSamples } from '../repos/adaptations';
import { outlineSteps } from '../lib/formatLesson';
import { classifyPace, paceItems } from '../llm/prompts/pacing';
import type { RedactableItem } from './redact';

export async function paceItemsFor(groupCourseId: number): Promise<RedactableItem[]> {
  const rows = await recentPaceSamples(groupCourseId).catch(() => []);
  const samples = rows.map((r) => ({ progressStep: r.progressStep, plannedSteps: outlineSteps(r.outline).length }));
  return paceItems(classifyPace(samples));
}
