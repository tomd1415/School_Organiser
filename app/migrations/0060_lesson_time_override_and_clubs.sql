-- Per-lesson time override: a commitment may run for only PART of its slot — e.g. a lunchtime club
-- 13:00–13:30 inside a longer lunch. When set, these win over the slot's period_definition time;
-- NULL means "use the whole slot" (the normal case for a teaching lesson).
ALTER TABLE timetabled_lessons ADD COLUMN start_time TIME;
ALTER TABLE timetabled_lessons ADD COLUMN end_time   TIME;

-- A record of what happened in a club on a given date ("where everyone got up to"), one per session,
-- so the teacher keeps continuity across weeks. Keyed by the club's timetabled slot + the date.
CREATE TABLE club_sessions (
  timetabled_lesson_id BIGINT NOT NULL REFERENCES timetabled_lessons(id) ON DELETE CASCADE,
  date                 DATE   NOT NULL,
  record               TEXT   NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (timetabled_lesson_id, date)
);
