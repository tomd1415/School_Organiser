-- Phase 2.12: recurring task definitions (templates). The generator materialises
-- due instances into `tasks` (source='recurring', linked back via recurring_task_id)
-- so completing an instance never touches the template.
CREATE TABLE recurring_tasks (
  id             BIGSERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  detail         TEXT,
  urgency        TEXT NOT NULL DEFAULT 'this_week'
                   CHECK (urgency IN ('urgent_today', 'by_next_lesson', 'this_week', 'someday')),
  estimate_min   INT,
  cognitive_load TEXT CHECK (cognitive_load IN ('low', 'medium', 'high')),
  group_id       BIGINT REFERENCES groups(id),
  course_id      BIGINT REFERENCES courses(id),
  pattern        TEXT NOT NULL,   -- weekly:<dow> | per_lesson:<group_id> | every_weeks:<n>:<dow> | monthly:<dom>
  lead_days      INT NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT true,
  last_generated DATE,            -- the last due date we materialised an instance for
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN recurring_task_id BIGINT REFERENCES recurring_tasks(id);
CREATE INDEX idx_tasks_recurring ON tasks (recurring_task_id) WHERE recurring_task_id IS NOT NULL;
