-- Phase 6.1: the academic year becomes a hard boundary.
-- Day shapes (period_definitions) become year-scoped so September can have new times while the
-- old year's record keeps its old ones. Groups gain a predecessor chain so a class keeps its
-- identity across the annual rename (7ARO → 8ARO) without rewriting any history.

ALTER TABLE period_definitions ADD COLUMN IF NOT EXISTS academic_year_id BIGINT REFERENCES academic_years(id);
UPDATE period_definitions SET academic_year_id = (SELECT id FROM academic_years WHERE is_current)
  WHERE academic_year_id IS NULL;
ALTER TABLE period_definitions ALTER COLUMN academic_year_id SET NOT NULL;

-- (weekday, slot_order) is now unique per year, not globally.
ALTER TABLE period_definitions DROP CONSTRAINT IF EXISTS period_definitions_weekday_slot_order_key;
CREATE UNIQUE INDEX IF NOT EXISTS period_definitions_year_slot
  ON period_definitions (academic_year_id, weekday, slot_order);

-- The same class last year (set by the September rollover; NULL for new intake / pre-Phase-6 rows).
ALTER TABLE groups ADD COLUMN IF NOT EXISTS predecessor_group_id BIGINT REFERENCES groups(id);

-- Existing instances are already set up; brand-new ones get the onboarding wizard (6.5).
INSERT INTO settings (key, value)
  SELECT 'setup_complete', 'true' WHERE EXISTS (SELECT 1 FROM timetabled_lessons)
  ON CONFLICT (key) DO NOTHING;
