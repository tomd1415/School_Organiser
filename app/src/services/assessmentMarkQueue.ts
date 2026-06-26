// Phase 4 — the durable assessment-marking queue worker (mirrors services/markingQueue.ts). On submit, a
// real attempt's objective parts mark inline (instant); the open AI pass is queued to a DB row that a boot
// sweep + periodic tick (server.ts) drain — so a reboot mid-marking never drops pending marks. markAttemptOpen
// is idempotent (skips already-marked answers), so running a job twice is harmless. Test-Lab attempts are
// never marked or queued.
import { appConfig } from '../config/app';
import { marksEnabled } from '../auth/marksGate';
import { claimDueAttemptMarks, enqueueAttemptMark } from '../repos/assessmentAttempts';
import { markAttemptObjective, markAttemptOpen, recomputeAttempt } from './assessmentMarking';

const DEBOUNCE_MS = 120_000;
const RETRY_MS = 300_000; // re-arm a job whose AI pass couldn't run (transient outage), so marks aren't dropped

const recomputeAfter = recomputeAttempt;

/** Phase 3's submit route calls this. Objective parts mark inline (instant, free); the open AI pass is
 *  queued (or, in tests, run inline as a no-op with AI off). Never blocks on AI; never touches a test attempt. */
export async function onAttemptSubmitted(attemptId: number, isTest: boolean): Promise<void> {
  if (isTest) return; // Test-Lab attempts are excluded from marking + cohort analytics
  if (!(await marksEnabled())) return; // DPIA gate
  await markAttemptObjective(attemptId).catch((e) => console.error('[asmt-mark] objective pass failed:', (e as Error).message));
  await recomputeAfter(attemptId);
  if (appConfig.NODE_ENV === 'test') {
    // Run the open pass inline (AI forced off → no-op) so no DB timer is left dangling in the test DB.
    await markAttemptOpen(attemptId).catch(() => {});
    await recomputeAfter(attemptId);
    return;
  }
  await enqueueAttemptMark(attemptId, DEBOUNCE_MS).catch((e) => console.error('[asmt-mark] enqueue failed:', (e as Error).message));
}

/** Run every due assessment open-mark job. Called on boot + on a periodic tick (server.ts). Re-arms a job
 *  whose AI pass was unavailable rather than dropping the pupil's answers. Returns how many ran. */
export async function runDueAttemptMarks(): Promise<number> {
  const due = await claimDueAttemptMarks();
  for (const id of due) {
    try {
      const r = await markAttemptOpen(id);
      await recomputeAfter(id);
      if (r.status === 'unavailable') {
        console.error(`[asmt-mark] open pass for attempt ${id} unavailable: ${r.message ?? ''} — re-arming`);
        await enqueueAttemptMark(id, RETRY_MS).catch(() => {});
      }
    } catch (e) {
      console.error('[asmt-mark] open pass failed:', (e as Error).message, '— re-arming');
      await enqueueAttemptMark(id, RETRY_MS).catch(() => {});
    }
  }
  return due.length;
}
