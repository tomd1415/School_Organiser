// Phase 9.3 trigger — "mark as pupils finish", made DURABLE in 10.9. When a pupil taps Done ✓ and
// the class is on the on_done trigger, objective answers are marked immediately (instant, free), and
// the open AI pass is queued to a DB-backed row due ~2 min out (so finishers batch per question). A
// boot sweep + periodic tick (started in server.ts) run due jobs, so a reboot/crash during a live
// lesson no longer drops pending marks. markOpen is idempotent, so running a job twice is harmless.
import { appConfig } from '../config/app';
import { marksEnabled } from '../auth/marksGate';
import { getMarkingSettings, occCoursePlan, enqueueOpenMark, claimDueMarkJobs } from '../repos/marking';
import { occurrenceCourseIsTest } from '../repos/occurrence';
import { markObjective, markOpen } from './marking';

const DEBOUNCE_MS = 120_000;
const RETRY_MS = 300_000; // re-arm a job whose AI pass couldn't run (transient outage), so marks aren't dropped

export async function onPupilDone(occurrenceCourseId: number): Promise<void> {
  // TEST-LAB-GUARD: a Test Lab run's "Done" must never mark or queue an AI job (its answers are already
  // excluded from answersForMarking, so this is belt-and-braces — it stops a mark_job row being written).
  if (await occurrenceCourseIsTest(occurrenceCourseId)) return;
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
    // claimDueMarkJobs already DELETED the job. If the AI pass can't run (transient outage — the
    // wrapper returns 'unavailable', e.g. the IPv6 blackhole in client.ts), RE-ARM it instead of
    // dropping the class's written answers. markOpen is idempotent and the queue is one-job-per-oc, so
    // a re-arm can't pile up; when AI is genuinely off the wrapper short-circuits, so the retry is a
    // cheap no-op until AI returns (or the class switches to manual, which clears the job).
    try {
      const r = await markOpen(oc);
      if (r.status === 'unavailable') {
        console.error(`[marking] open pass for oc ${oc} unavailable: ${r.message ?? ''} — re-arming`);
        await enqueueOpenMark(oc, RETRY_MS).catch(() => {});
      }
    } catch (e) {
      console.error('[marking] open pass failed:', (e as Error).message, '— re-arming');
      await enqueueOpenMark(oc, RETRY_MS).catch(() => {});
    }
  }
  return due.length;
}
