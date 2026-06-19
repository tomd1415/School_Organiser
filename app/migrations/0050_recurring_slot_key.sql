-- BUG-026 (Wave A6 — transactional invariants): DB-enforced idempotency for materialised
-- recurring-task occurrences. generateDueInstances dedups by (recurring_task_id, due date) with a
-- WHERE NOT EXISTS, which two concurrent sweeps (boot + daily cron, say) can BOTH pass before either
-- inserts — a TOCTOU race that yields duplicate tasks. We add an explicit per-occurrence dedup key and
-- a partial unique index so the database guarantees one task per definition per due date; the generator
-- switches to ON CONFLICT DO NOTHING (and wraps insert + cursor bump in one transaction).

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_slot_key TEXT;

-- Backfill existing recurring rows: key the EARLIEST row per (definition, due date); any pre-existing
-- duplicates keep a NULL key (they remain, harmless, and don't block the unique index). The date is
-- derived in Europe/London to match the generator's due_at. timezone() is STABLE — fine in this one-off
-- UPDATE, just not usable in an index expression, which is exactly why the key is stored explicitly.
WITH ranked AS (
  SELECT id,
         recurring_task_id || ':' || (due_at AT TIME ZONE 'Europe/London')::date AS k,
         row_number() OVER (
           PARTITION BY recurring_task_id, (due_at AT TIME ZONE 'Europe/London')::date
           ORDER BY id
         ) AS rn
  FROM tasks
  WHERE source = 'recurring' AND recurring_task_id IS NOT NULL AND due_at IS NOT NULL
)
UPDATE tasks t SET recurring_slot_key = ranked.k
FROM ranked WHERE t.id = ranked.id AND ranked.rn = 1;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_recurring_slot_key_uniq
  ON tasks (recurring_slot_key) WHERE recurring_slot_key IS NOT NULL;
