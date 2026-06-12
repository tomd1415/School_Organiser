-- In-lesson progress marker + per-class ability midpoint.
-- progress_step: which outline step a class is on for one dated lesson (the movable marker);
-- the same click also writes the textual stopping_point so the resume machinery keeps working.
ALTER TABLE occurrence_courses ADD COLUMN IF NOT EXISTS progress_step INT;

-- The class's recorded ability midpoint for this course — the anchor the three differentiation
-- levels (Support / Core / Challenge) are pitched around. Cohort-level prose, never a pupil.
ALTER TABLE group_courses ADD COLUMN IF NOT EXISTS ability_midpoint TEXT;
