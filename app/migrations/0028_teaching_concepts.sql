-- Phase 11 idea 1.1 — a library of cohort-level teaching concepts/ideas the AI should weave into
-- lessons where they fit. course_id NULL = applies to every course; otherwise scoped to one course
-- (decided 2026-06-14: course-scoped with optional global). Cohort/curriculum prose only — never
-- about an individual pupil; it rides the wrapper's context[] so redaction/withholding/audit apply.
CREATE TABLE teaching_concepts (
  id         BIGSERIAL PRIMARY KEY,
  course_id  BIGINT REFERENCES courses(id) ON DELETE CASCADE,   -- NULL = all courses
  title      TEXT NOT NULL,
  body       TEXT,
  tags       TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,    -- archive, never delete (matches the kit/equipment convention)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The hot path is "active concepts for this course (or global)" at generation time.
CREATE INDEX teaching_concepts_course_active_idx ON teaching_concepts (course_id) WHERE active;
