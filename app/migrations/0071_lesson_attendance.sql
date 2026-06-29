-- Phase 17 — per-pupil, per-lesson-instance attendance register (present / absent / left-early /
-- extended-leave). Keyed on the occurrence_course (the lesson instance) like the rest of the per-lesson
-- per-pupil tables (pupil_answers, pupil_done, pupil_lesson_feedback …), so it reuses the same roster
-- and authorisation machinery. Each lesson is marked INDEPENDENTLY (no auto-roll-forward); expected_return
-- is informational only. leave_reason is pupil-specific and lives ONLY in this register — it is NEVER
-- added to any AI context (per CLAUDE.md privacy rules); attendance is not read by the LLM wrapper.
CREATE TABLE lesson_attendance (
  id                    BIGSERIAL PRIMARY KEY,
  occurrence_course_id  BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE,
  pupil_id              BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  status                TEXT   NOT NULL CHECK (status IN ('present','absent','left_early','extended_leave')),
  left_early_minutes    INT,        -- when status='left_early'
  leave_reason          TEXT,       -- free text, e.g. 'medical appointment' (left_early / extended_leave)
  expected_return       DATE,       -- when status='extended_leave'
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (occurrence_course_id, pupil_id)
);
CREATE INDEX idx_lesson_attendance_oc ON lesson_attendance (occurrence_course_id);
