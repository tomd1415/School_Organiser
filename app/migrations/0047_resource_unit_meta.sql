-- Bulk import records the unit (read from its Word description) and the year group on every file in a
-- unit, alongside the per-file lesson title (the resource title). Both nullable — only the importer
-- sets them; the rest of the app ignores them except to show/search by them on the Resources page.
ALTER TABLE resources ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS year_group TEXT;
