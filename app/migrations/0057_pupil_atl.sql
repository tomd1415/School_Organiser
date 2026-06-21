-- ATL (attitude to learning): a 1–4 score per pupil per lesson (occurrence_course). Set while marking
-- work OR live during the lesson. One row per (pupil, occurrence_course); the CHECK bounds it to 1–4.
CREATE TABLE IF NOT EXISTS pupil_atl (
  pupil_id             BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  occurrence_course_id BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE,
  score                SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 4),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pupil_id, occurrence_course_id)
);
