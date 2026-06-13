// Phase 9.3 trigger — "mark as pupils finish". When a pupil taps Done ✓ and the class is on the
// on_done trigger, objective answers are marked immediately (instant, free), and the open AI pass
// is DEBOUNCED (~2 min) so finishers batch together per question (consistency + fewer calls) — the
// per-question anonymous batches survive the auto trigger. Manual-trigger classes do nothing here;
// the teacher presses "Mark answers now" instead.
import { appConfig } from '../config/app';
import { marksEnabled } from '../auth/marksGate';
import { getMarkingSettings, occCoursePlan } from '../repos/marking';
import { markObjective, markOpen } from './marking';

const DEBOUNCE_MS = 120_000;
const timers = new Map<number, NodeJS.Timeout>();

export async function onPupilDone(occurrenceCourseId: number): Promise<void> {
  if (!(await marksEnabled())) return;
  const oc = await occCoursePlan(occurrenceCourseId);
  if (!oc) return;
  if ((await getMarkingSettings(oc.groupCourseId)).markingTrigger !== 'on_done') return;

  await markObjective(occurrenceCourseId).catch((e) => console.error('[marking] objective pass failed:', (e as Error).message)); // instant, no AI

  // In tests, run the open pass inline (AI is forced off, so it's a no-op) — no dangling timers.
  if (appConfig.NODE_ENV === 'test') {
    await markOpen(occurrenceCourseId).catch(() => {});
    return;
  }
  const existing = timers.get(occurrenceCourseId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    timers.delete(occurrenceCourseId);
    // Log failures (and a non-ok status) so a class's written answers can't silently go unmarked.
    void markOpen(occurrenceCourseId)
      .then((r) => {
        if (r.status === 'unavailable') console.error(`[marking] open pass for oc ${occurrenceCourseId} unavailable: ${r.message ?? ''}`);
      })
      .catch((e) => console.error('[marking] open pass failed:', (e as Error).message));
  }, DEBOUNCE_MS);
  t.unref?.(); // don't keep the process alive for a pending mark
  timers.set(occurrenceCourseId, t);
}
