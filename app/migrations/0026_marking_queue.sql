-- Phase 10.9 — durable open-marking queue. The "mark as pupils finish" open-answer AI pass was a
-- debounced in-process setTimeout, so a reboot/crash/redeploy during a live lesson silently dropped
-- every pending mark (the NFR requires "survives a server reboot"). Persist the pending job here; a
-- boot sweep + periodic tick run any that are due. One row per occurrence-course; a fresh "Done" tap
-- pushes due_at forward so finishers still batch. markOpen is idempotent (only marks unmarked
-- answers), so running a job twice is harmless.
CREATE TABLE marking_queue (
  occurrence_course_id BIGINT PRIMARY KEY REFERENCES occurrence_courses(id) ON DELETE CASCADE,
  due_at               TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX marking_queue_due_idx ON marking_queue (due_at);
