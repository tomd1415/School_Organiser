-- TA read/feedback access: a TA logs in with a separate password (settings: ta_password_hash),
-- sees the current lesson read-only, and leaves structured feedback that feeds the teacher's
-- view and the adapt-next-lesson AI loop. Safeguarding-flagged feedback is withheld from AI.
CREATE TABLE IF NOT EXISTS ta_feedback (
  id                   BIGSERIAL PRIMARY KEY,
  occurrence_course_id BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE,
  pupils_text          TEXT NOT NULL DEFAULT '',   -- how the pupils were
  lesson_text          TEXT NOT NULL DEFAULT '',   -- thoughts on the lesson itself
  safeguarding         BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ta_feedback_oc_idx ON ta_feedback (occurrence_course_id, created_at DESC);
