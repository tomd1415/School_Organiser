-- Phase 8 fix: key a pupil's answers on (pupil, occurrence_course, field_key) — the lesson
-- instance — not on the worksheet resource/version. The worksheet a class works from can resolve
-- to the master plan's copy or a class-adapted copy, and can be re-versioned; keying on resource
-- meant those flips silently hid a pupil's earlier answers. resource_id/version_no are kept as
-- provenance (which worksheet/version the latest write came from), now nullable.

ALTER TABLE pupil_answers ALTER COLUMN resource_id DROP NOT NULL;
ALTER TABLE pupil_answers ALTER COLUMN version_no  DROP NOT NULL;

-- Drop whatever name the inline UNIQUE(...) in 0018 was auto-assigned, robustly.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'pupil_answers'::regclass AND contype = 'u';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE pupil_answers DROP CONSTRAINT %I', c); END IF;
END $$;

ALTER TABLE pupil_answers
  ADD CONSTRAINT pupil_answers_pupil_oc_field_key UNIQUE (pupil_id, occurrence_course_id, field_key);
