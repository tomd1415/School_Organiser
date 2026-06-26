// The async runner for the "Generate resources" job. The route ENQUEUES a job and fires runResourceJob
// without awaiting it (fire-and-forget), then returns a polling partial at once — so the HTTP request no
// longer blocks for the multi-minute generation. The worker claims the job, runs generateResourcesForPlan
// (reporting each stage so the teacher's poll shows live progress), and records the outcome. A boot sweep
// + interval (wired in server.ts) re-run jobs orphaned by a restart and fail jobs left mid-run, so a
// reboot or crash can never leave the teacher staring at a spinner that resolves to nothing.
import { appConfig } from '../config/app';
import {
  claimResourceJob,
  setResourceJobStage,
  markResourceJobDone,
  markResourceJobError,
  listQueuedResourceJobIds,
  failOrphanedRunningJobs,
  pruneFinishedResourceJobs,
} from '../repos/resourceJobs';
import { generateResourcesForPlan } from './resourceGen';

const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000; // keep finished rows for a day (diagnostics), then drop them

/** Turn any thrown error into a teacher-readable line — generation should never end on a raw stack. */
function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  return `Generation failed unexpectedly (${msg}). Please try again — if it keeps failing, check the AI key and the server's internet access.`;
}

/** Run one queued job to completion. Claim-guarded: if another caller already claimed it (the in-process
 *  fire vs. the sweep), this returns immediately. Never throws — every failure is recorded on the job. */
export async function runResourceJob(jobId: number): Promise<void> {
  const job = await claimResourceJob(jobId).catch(() => null);
  if (!job) return; // already claimed/finished, or a transient DB error — the sweep will retry queued ones
  try {
    const r = await generateResourcesForPlan(job.planId, job.useMaterials, (stage) => {
      void setResourceJobStage(jobId, stage).catch(() => {}); // best-effort progress; a missed update is harmless
    });
    if (r.ok) await markResourceJobDone(jobId, r.message, r.complete ?? true);
    else await markResourceJobError(jobId, r.message);
  } catch (err) {
    await markResourceJobError(jobId, friendlyError(err)).catch(() => {});
  }
}

/** BOOT sweep: fail orphaned 'running' jobs (their process is gone) and kick any queued jobs that never
 *  started. Run once on boot — see scheduleResourceJobs in server.ts. */
export async function bootSweepResourceJobs(): Promise<{ orphaned: number; queued: number }> {
  const orphaned = await failOrphanedRunningJobs('Generation was interrupted by a server restart — please run it again.');
  await pruneFinishedResourceJobs(PRUNE_AFTER_MS).catch(() => {});
  const ids = await listQueuedResourceJobIds();
  for (const id of ids) await runResourceJob(id); // sequential — don't fan out a fleet of AI calls on boot
  return { orphaned, queued: ids.length };
}

/** INTERVAL tick: a safety net that starts any queued job the fire-and-forget missed (e.g. it threw
 *  before claiming). Does NOT touch 'running' jobs — a live generation can legitimately take minutes. */
export async function tickResourceJobs(): Promise<void> {
  if (appConfig.NODE_ENV === 'test') return; // tests drive runResourceJob directly; no background timers
  const ids = await listQueuedResourceJobIds();
  for (const id of ids) await runResourceJob(id);
}
