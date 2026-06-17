-- Phase 12 D2 — a time-decaying "current interest" profile. Records WHEN an item was marked as a
-- current interest, so the Now screen can surface the freshest interests prominently and let older
-- ones fade out (a simple recency decay; no AI). Backfills existing interest items from updated_at so
-- they don't all read as brand-new. Cleared when interest is unmarked.
ALTER TABLE tasks ADD COLUMN interest_at TIMESTAMPTZ;
ALTER TABLE notes ADD COLUMN interest_at TIMESTAMPTZ;
UPDATE tasks SET interest_at = updated_at WHERE interest;
UPDATE notes SET interest_at = updated_at WHERE interest;
