-- Phase 8 review fixes (2026-06-13):
-- 1. The class-work AI summary is stored as a note of kind 'ai_summary' so the adapt-next-lesson
--    loop reads it — but the notes.kind CHECK from 0002 didn't allow that value, so a successful
--    (billed) summary crashed on insert. Allow 'ai_summary'.
-- 2. After 0019 re-keyed pupil_answers onto the lesson instance, resource_id is mere provenance —
--    but it still carried ON DELETE CASCADE from 0018, so deleting a worksheet resource would
--    silently delete a pupil's answers. Make it ON DELETE SET NULL.

ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_kind_check;
ALTER TABLE notes ADD CONSTRAINT notes_kind_check
  CHECK (kind IN ('lesson', 'general', 'oversight', 'plan_change', 'captured', 'ai_summary'));

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'pupil_answers'::regclass AND contype = 'f'
     AND pg_get_constraintdef(oid) LIKE '%REFERENCES resources%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE pupil_answers DROP CONSTRAINT %I', c); END IF;
END $$;

ALTER TABLE pupil_answers
  ADD CONSTRAINT pupil_answers_resource_id_fkey FOREIGN KEY (resource_id)
  REFERENCES resources(id) ON DELETE SET NULL;
