-- Free-period task assignments: the teacher earmarks tasks from the main Tasks list to do during a
-- specific free period. A free period is a slot with purpose='free' or a dated 'free'/'cancelled'/
-- 'off_timetable' exception — neither has an occurrence — so we key the assignment by the
-- (date, timetabled_lesson) pair. The tasks are the real rows from `tasks`, so there is one source of
-- truth. Deleting the task or the slot removes the assignment.
CREATE TABLE period_tasks (
  date                 DATE   NOT NULL,
  timetabled_lesson_id BIGINT NOT NULL REFERENCES timetabled_lessons(id) ON DELETE CASCADE,
  task_id              BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (date, timetabled_lesson_id, task_id)
);
CREATE INDEX period_tasks_slot_idx ON period_tasks (date, timetabled_lesson_id);
