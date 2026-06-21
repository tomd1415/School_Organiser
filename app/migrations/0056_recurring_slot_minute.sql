-- BUG-025: persist the slot-MINUTE cursor alongside the date.
--
-- The recurring-task generator walks (date, slot-minute) for per_lesson definitions, but only the date
-- was durable (last_generated). A crash between two same-day slots therefore resumed at end-of-day and
-- skipped the later slot forever. We add last_generated_min so resume continues mid-day.
--
-- Default 1440 (END_OF_DAY) so EXISTING rows keep today's "resume after the whole day" behaviour — the
-- column only changes behaviour for generations made after this migration.
ALTER TABLE recurring_tasks ADD COLUMN IF NOT EXISTS last_generated_min INTEGER NOT NULL DEFAULT 1440;
