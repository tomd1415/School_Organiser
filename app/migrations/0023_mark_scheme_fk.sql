-- Phase 9 review fix: mark_schemes.resource_id was ON DELETE CASCADE (0022), reintroducing the
-- footgun 0020 fixed for pupil_answers — deleting a worksheet resource would silently delete its
-- mark scheme + (via pupil_marks→pupil_answers) leave marks dangling. There is no hard-delete path
-- for resources today, so this is latent, but make it ON DELETE SET NULL for safety + consistency.

ALTER TABLE mark_schemes ALTER COLUMN resource_id DROP NOT NULL;

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'mark_schemes'::regclass AND contype = 'f'
     AND pg_get_constraintdef(oid) LIKE '%REFERENCES resources%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE mark_schemes DROP CONSTRAINT %I', c); END IF;
END $$;

ALTER TABLE mark_schemes
  ADD CONSTRAINT mark_schemes_resource_id_fkey FOREIGN KEY (resource_id)
  REFERENCES resources(id) ON DELETE SET NULL;
