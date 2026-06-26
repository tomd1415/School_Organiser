// Data access for resource_jobs — the async "Generate resources" job (see migrations/0065 and
// services/resourceJobs.ts). One active (queued|running) job per plan, claimed atomically so the
// in-process worker and the boot/interval sweep can never double-run the same generation.
import { pool } from '../db/pool';

export type ResourceJobStatus = 'queued' | 'running' | 'done' | 'error';

export interface ResourceJob {
  id: number;
  planId: number;
  status: ResourceJobStatus;
  stage: string;
  message: string;
  useMaterials: boolean;
  complete: boolean | null;
  attempts: number;
}

const COLS = `id, plan_id AS "planId", status, stage, message, use_materials AS "useMaterials", complete, attempts`;

/** Enqueue a generation job for a plan, REUSING any job already in flight (so re-clicking the button
 *  can't start a second run). Finished/errored rows for the plan are cleared first, so there is at most
 *  one row per plan. Returns the active job (the new one, or the in-flight one that was reused). */
export async function enqueueResourceJob(planId: number, useMaterials: boolean): Promise<ResourceJob> {
  await pool.query(`DELETE FROM resource_jobs WHERE plan_id = $1 AND status IN ('done', 'error')`, [planId]);
  await pool.query(
    `INSERT INTO resource_jobs (plan_id, use_materials) VALUES ($1, $2)
     ON CONFLICT (plan_id) WHERE status IN ('queued', 'running') DO NOTHING`,
    [planId, useMaterials],
  );
  const job = await getResourceJobForPlan(planId);
  if (!job) throw new Error('failed to enqueue resource job'); // unreachable — we just inserted/reused
  return job;
}

export async function getResourceJob(id: number): Promise<ResourceJob | null> {
  const { rows } = await pool.query<ResourceJob>(`SELECT ${COLS} FROM resource_jobs WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** The single current job for a plan (at most one exists — see enqueueResourceJob). */
export async function getResourceJobForPlan(planId: number): Promise<ResourceJob | null> {
  const { rows } = await pool.query<ResourceJob>(`SELECT ${COLS} FROM resource_jobs WHERE plan_id = $1 ORDER BY id DESC LIMIT 1`, [planId]);
  return rows[0] ?? null;
}

/** The active (queued|running) jobs for a set of plans — used to resume the polling UI after the teacher
 *  navigates away and back. Returns a map planId → status line (stage, or "Queued…"). */
export async function activeResourceJobsForPlans(planIds: number[]): Promise<Map<number, ResourceJob>> {
  if (planIds.length === 0) return new Map();
  const { rows } = await pool.query<ResourceJob>(
    `SELECT ${COLS} FROM resource_jobs WHERE plan_id = ANY($1::bigint[]) AND status IN ('queued', 'running')`,
    [planIds],
  );
  return new Map(rows.map((r) => [r.planId, r]));
}

/** Atomically claim a QUEUED job for running. Returns the job (with plan_id/use_materials) if this caller
 *  won the claim, or null if it was already taken (so the worker and the sweep can both call this). */
export async function claimResourceJob(id: number): Promise<ResourceJob | null> {
  const { rows } = await pool.query<ResourceJob>(
    `UPDATE resource_jobs SET status = 'running', attempts = attempts + 1, stage = 'Starting…', updated_at = now()
     WHERE id = $1 AND status = 'queued' RETURNING ${COLS}`,
    [id],
  );
  return rows[0] ?? null;
}

export async function setResourceJobStage(id: number, stage: string): Promise<void> {
  await pool.query(`UPDATE resource_jobs SET stage = $2, updated_at = now() WHERE id = $1 AND status = 'running'`, [id, stage]);
}

export async function markResourceJobDone(id: number, message: string, complete: boolean): Promise<void> {
  await pool.query(`UPDATE resource_jobs SET status = 'done', message = $2, complete = $3, stage = '', updated_at = now() WHERE id = $1`, [id, message, complete]);
}

export async function markResourceJobError(id: number, message: string): Promise<void> {
  await pool.query(`UPDATE resource_jobs SET status = 'error', message = $2, stage = '', updated_at = now() WHERE id = $1`, [id, message]);
}

/** Ids of every queued-but-unstarted job — the sweep kicks these (claim-guarded, so already-running
 *  ones are skipped). */
export async function listQueuedResourceJobIds(): Promise<number[]> {
  const { rows } = await pool.query<{ id: number }>(`SELECT id FROM resource_jobs WHERE status = 'queued' ORDER BY id`);
  return rows.map((r) => r.id);
}

/** On BOOT, any job still 'running' is orphaned (the process that ran it is gone) — fail it so the
 *  teacher sees an honest "interrupted, try again" instead of a spinner that polls a dead job forever. */
export async function failOrphanedRunningJobs(message: string): Promise<number> {
  const { rowCount } = await pool.query(`UPDATE resource_jobs SET status = 'error', message = $1, stage = '', updated_at = now() WHERE status = 'running'`, [message]);
  return rowCount ?? 0;
}

/** Housekeeping: drop finished rows older than the cutoff so the table stays tiny. */
export async function pruneFinishedResourceJobs(olderThanMs: number): Promise<void> {
  await pool.query(`DELETE FROM resource_jobs WHERE status IN ('done', 'error') AND updated_at < now() - ($1::bigint) * interval '1 millisecond'`, [olderThanMs]);
}
