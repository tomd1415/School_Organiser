// Phase 9.3 trigger — "mark as pupils finish", made DURABLE in 10.9. When a pupil taps Done ✓ and
// the class is on the on_done trigger, objective answers are marked immediately (instant, free), and
// the open AI pass is queued to a DB-backed row due ~2 min out (so finishers batch per question). A
// boot sweep + periodic tick (started in server.ts) run due jobs, so a reboot/crash during a live
// lesson no longer drops pending marks. markOpen is idempotent, so running a job twice is harmless.
import { appConfig } from '../config/app';
import { marksEnabled } from '../auth/marksGate';
import { getMarkingSettings, occCoursePlan, enqueueOpenMark, claimDueMarkJobs } from '../repos/marking';
import { markObjective, markOpen } from './marking';

const DEBOUNCE_MS = 120_000;

export async function onPupilDone(occurrenceCourseId: number): Promise<void> {
  if (!(await marksEnabled())) return;
  const oc = await occCoursePlan(occurrenceCourseId);
  if (!oc) return;
  if ((await getMarkingSettings(oc.groupCourseId)).markingTrigger !== 'on_done') return;

  await markObjective(occurrenceCourseId).catch((e) => console.error('[marking] objective pass failed:', (e as Error).message)); // instant, no AI

  // In tests, run the open pass inline (AI is forced off, so it's a no-op) — no DB timers to leak.
  if (appConfig.NODE_ENV === 'test') {
    await markOpen(occurrenceCourseId).catch(() => {});
    return;
  }
  // Persist the job (re-arms the debounce) — the sweeper picks it up when due, surviving a restart.
  await enqueueOpenMark(occurrenceCourseId, DEBOUNCE_MS).catch((e) => console.error('[marking] enqueue failed:', (e as Error).message));
}

/** Run every open-mark job that is now due. Called on boot and on a periodic tick (server.ts).
 *  Returns how many jobs ran (for logging/tests). */
export async function runDueMarkJobs(): Promise<number> {
  const due = await claimDueMarkJobs();
  for (const oc of due) {
    // Log failures (and a non-ok status) so a class's written answers can't silently go unmarked.
    await markOpen(oc)
      .then((r) => {
        if (r.status === 'unavailable') console.error(`[marking] open pass for oc ${oc} unavailable: ${r.message ?? ''}`);
      })
      .catch((e) => console.error('[marking] open pass failed:', (e as Error).message));
  }
  return due.length;
}
