-- Phase 11 idea 10 (slice 1, AI-free) — the spec-coverage backbone. course_spec_points is the
-- source-of-truth list of what a course MUST cover (pasted in from the spec); lesson_plan_spec_points
-- maps each lesson to the points it covers. Coverage is then a deterministic query — "what's not yet
-- covered" stops being implicit. Reference/curriculum data only; no pupil identity ever attached.
-- NB: cloneSchemeNewVersion MUST copy the mappings on a version bump, or coverage silently resets to
-- zero every September rollover.
CREATE TABLE course_spec_points (
  id            BIGSERIAL PRIMARY KEY,
  course_id     BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,                 -- e.g. an OCR J277 sub-statement code (or the title if uncoded)
  title         TEXT NOT NULL,
  exam_weight   INT,                           -- optional; for later AI authoring (revision weighting)
  active        BOOLEAN NOT NULL DEFAULT true, -- archive, never delete
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, code)                      -- re-import upserts by code (idempotent)
);

CREATE TABLE lesson_plan_spec_points (
  lesson_plan_id BIGINT NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  spec_point_id  BIGINT NOT NULL REFERENCES course_spec_points(id) ON DELETE CASCADE,
  source         TEXT NOT NULL DEFAULT 'teacher' CHECK (source IN ('teacher', 'ai')),
  PRIMARY KEY (lesson_plan_id, spec_point_id)
);
CREATE INDEX lesson_plan_spec_points_point_idx ON lesson_plan_spec_points (spec_point_id);
