-- Phase 6.7: calendar exceptions — the dated reality on top of the weekly pattern.
-- A row either targets one timetabled lesson on one date (cancelled / room change / cover) or,
-- with a NULL lesson, the whole day (off-timetable: trips, exam days, snow).
CREATE TABLE IF NOT EXISTS lesson_exceptions (
  id                   BIGSERIAL PRIMARY KEY,
  date                 DATE NOT NULL,
  timetabled_lesson_id BIGINT REFERENCES timetabled_lessons(id) ON DELETE CASCADE, -- NULL = whole day
  kind                 TEXT NOT NULL CHECK (kind IN ('cancelled','room_change','cover','off_timetable')),
  room_id              BIGINT REFERENCES rooms(id),   -- for room_change
  staff_id             BIGINT REFERENCES staff(id),   -- for cover
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_exceptions_date_idx ON lesson_exceptions (date);
