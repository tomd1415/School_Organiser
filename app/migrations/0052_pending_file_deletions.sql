-- BUG-044: a durable tombstone for resource-volume files that must be deleted (currently only pupil
-- screenshots, on disposal). The row is written INSIDE the disposal transaction, so even if the
-- post-commit unlink fails (fs error) or the process crashes before it runs, a record survives and a
-- periodic sweep retries the unlink idempotently — a pupil's screenshot can never silently outlive an
-- erasure. The storage path is an opaque, non-identifying object key (`pupil-work/<oc>/<pupil>/file`).
CREATE TABLE IF NOT EXISTS pending_file_deletions (
  id              BIGSERIAL PRIMARY KEY,
  storage_path    TEXT NOT NULL,
  reason          TEXT,                                  -- e.g. 'disposal-erase'
  attempts        INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_file_deletions_created_idx ON pending_file_deletions (created_at);
