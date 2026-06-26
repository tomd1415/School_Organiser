-- Async generation of a lesson's AI resource set. The "Generate resources" button used to BLOCK the
-- HTTP request for the whole multi-minute generation, so a slow line or a dropped connection left the
-- teacher with a spinner that never resolved — or, on a 5xx/abort that htmx swallows, a silent nothing.
-- Generation is now a JOB: the POST enqueues a row and returns at once, the page POLLS this row for live
-- progress, and the worker (services/resourceJobs.ts) runs the generation and updates status here. At
-- most ONE active (queued/running) job per plan — a unique partial index — so re-clicking can't
-- double-run; a finished/errored row is replaced on the next enqueue. A boot sweep (server.ts) re-runs
-- queued jobs and fails jobs left 'running' across a restart, so nothing is lost to a reboot/crash.
CREATE TABLE resource_jobs (
  id            BIGSERIAL PRIMARY KEY,
  plan_id       BIGINT NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'queued',   -- queued | running | done | error
  stage         TEXT NOT NULL DEFAULT '',         -- live progress line shown while running
  message       TEXT NOT NULL DEFAULT '',         -- final result / error line shown when done|error
  use_materials BOOLEAN NOT NULL DEFAULT true,    -- the teacher's "build on my uploaded files" opt-in
  complete      BOOLEAN,                          -- assessResourceSet verdict once status='done'
  attempts      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one active job per plan (re-clicking the button reuses the in-flight job rather than racing).
CREATE UNIQUE INDEX resource_jobs_active_plan_idx ON resource_jobs (plan_id) WHERE status IN ('queued', 'running');
-- The boot/interval sweep scans by status + age.
CREATE INDEX resource_jobs_status_idx ON resource_jobs (status, updated_at);
