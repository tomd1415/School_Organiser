-- Attribution line for an imported resource (e.g. the Open Government Licence credit required when
-- reusing the NCCE Teach Computing Curriculum). Empty for own/uploaded work. Display-only metadata.
ALTER TABLE resources ADD COLUMN IF NOT EXISTS source_attribution TEXT NOT NULL DEFAULT '';
