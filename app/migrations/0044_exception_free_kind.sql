-- Add a dedicated 'free' exception kind: "the class is away (trip/exam) so I don't teach this slot",
-- distinct from a plain 'cancelled' lesson. Like cancelled it frees the slot; the Now screen reads
-- cancelled/free/off_timetable as free time and 'cover' as on-cover.
ALTER TABLE lesson_exceptions DROP CONSTRAINT IF EXISTS lesson_exceptions_kind_check;
ALTER TABLE lesson_exceptions
  ADD CONSTRAINT lesson_exceptions_kind_check
  CHECK (kind IN ('cancelled', 'room_change', 'cover', 'off_timetable', 'free'));
