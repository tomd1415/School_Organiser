-- Phase 16B — homework as data (set · chase · mark). A lesson's worksheet flagged as HOMEWORK with a due
-- date: pupils see it in their homework list (behind the pupil gate), complete it via the same worksheet
-- surface (objective parts auto-mark, open answers flow to the SAME redacted AI-marking queue), and the
-- teacher gets a not-yet-submitted chase list. Anchored to the occurrence_course (the lesson instance whose
-- worksheet it is) so it reuses the entire pupil-work + marking machinery; "submitted" = a pupil_done row.
CREATE TABLE homework (
  occurrence_course_id BIGINT PRIMARY KEY REFERENCES occurrence_courses(id) ON DELETE CASCADE,
  due_at        TIMESTAMPTZ NOT NULL,
  released      BOOLEAN NOT NULL DEFAULT false,  -- pupil-facing results released (mirrors the assessment release control)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_homework_due ON homework (due_at);
