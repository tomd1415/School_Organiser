-- Live slide sync (teacher → pupils + board). The teacher's cockpit drives which slide every pupil
-- device and the projector board show; `slides_locked` pins them to the teacher's slide (pupils can't
-- roam) until the teacher unlocks. Per occurrence_course (one class's binding at one dated lesson), so
-- it resets naturally for the next lesson. Same mirror pattern as planner_locked / progress_step.
ALTER TABLE occurrence_courses ADD COLUMN IF NOT EXISTS current_slide INT NOT NULL DEFAULT 0;
ALTER TABLE occurrence_courses ADD COLUMN IF NOT EXISTS slides_locked BOOLEAN NOT NULL DEFAULT false;
