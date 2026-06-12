-- Per-group adapted resources: a resource can now belong to one class's adaptation of a lesson.
-- When the adaptation is reset, the links cascade away (the documents stay in the store).
ALTER TABLE resource_links ADD COLUMN IF NOT EXISTS adaptation_id BIGINT REFERENCES lesson_adaptations(id) ON DELETE CASCADE;

ALTER TABLE resource_links DROP CONSTRAINT IF EXISTS resource_links_check;
ALTER TABLE resource_links ADD CONSTRAINT resource_links_check CHECK (
  (course_id IS NOT NULL)::int + (unit_id IS NOT NULL)::int + (lesson_plan_id IS NOT NULL)::int +
  (occurrence_id IS NOT NULL)::int + (group_id IS NOT NULL)::int + (adaptation_id IS NOT NULL)::int = 1
);
