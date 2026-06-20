-- BUG-027: give the email dedup store an explicit processing/complete state + a claim timestamp, so a
-- poll can ATOMICALLY claim a message before doing any destination write — a concurrent poll, or a
-- re-seen copy whose \Seen flag failed, finds it already claimed/complete and skips (no duplicate) — and
-- a claim left 'processing' by a crash can be reclaimed after a stale window (no permanent loss).
-- Existing rows were only ever written AFTER a successful import, so they are 'complete'.
ALTER TABLE processed_emails ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'complete';
ALTER TABLE processed_emails ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
