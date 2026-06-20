-- BUG-025: a `per_lesson` recurring task can legitimately recur more than once on the SAME day (a class
-- taught twice that day), so the per-occurrence dedup key must include the slot TIME, not just the date.
-- The generator now keys tasks `<defId>:<date>:<startMinute>`; bring existing keys (written as
-- `<defId>:<date>` by migration 0050) into that shape by appending the due_at minute-of-day (London), so
-- the new keys match the old rows and a re-sweep still dedups rather than duplicating.
-- Idempotent: a key that already carries a `:<digits>` time suffix is left alone. (The date component is
-- `YYYY-MM-DD`, which contains no ':' and never ends in `:<digits>`, so the guard is unambiguous.)
UPDATE tasks
SET recurring_slot_key = recurring_slot_key || ':' ||
    (extract(hour   FROM (due_at AT TIME ZONE 'Europe/London')) * 60
   + extract(minute FROM (due_at AT TIME ZONE 'Europe/London')))::int
WHERE source = 'recurring'
  AND recurring_slot_key IS NOT NULL
  AND due_at IS NOT NULL
  AND recurring_slot_key !~ ':[0-9]+$';
