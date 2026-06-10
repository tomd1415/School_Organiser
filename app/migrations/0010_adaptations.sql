-- Phase 5.1: per-group adaptation of master lessons.
-- The master lesson_plans stay canonical. A group only stores its DIFFERENCES from the master
-- (objectives/outline override + a note), keyed on its group_courses enrolment + the master lesson.
-- Every change is appended to a per-group history. Absence of a row ⇒ the group teaches the master.

CREATE TABLE IF NOT EXISTS lesson_adaptations (
  id              BIGSERIAL PRIMARY KEY,
  group_course_id BIGINT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE,
  lesson_plan_id  BIGINT NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  objectives      TEXT,                                   -- NULL ⇒ inherit master
  outline         TEXT,                                   -- NULL ⇒ inherit master
  adaptation_note TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_course_id, lesson_plan_id)
);

CREATE TABLE IF NOT EXISTS lesson_adaptation_history (
  id              BIGSERIAL PRIMARY KEY,
  adaptation_id   BIGINT NOT NULL REFERENCES lesson_adaptations(id) ON DELETE CASCADE,
  objectives      TEXT,
  outline         TEXT,
  adaptation_note TEXT,
  change_summary  TEXT,                                   -- "teacher edit" / "AI adapted from notes"
  author          TEXT NOT NULL DEFAULT 'teacher',        -- 'teacher' | 'ai'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_adaptation_history_idx ON lesson_adaptation_history (adaptation_id, created_at DESC);
