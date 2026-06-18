-- Phase 13.5 — lock a planned lesson to its date. When the teacher pins a fixed event (an assessment,
-- a guest, a deadline) the planner's "all move along one" cascades flow AROUND it rather than shifting
-- it. Per occurrence_course (one class's binding at one dated slot). Defaults false; cleared on rebind
-- is the route's job, not the schema's.
ALTER TABLE occurrence_courses ADD COLUMN IF NOT EXISTS planner_locked BOOLEAN NOT NULL DEFAULT false;
