-- Phase 11 idea 9 — official course documents (spec, examiners' reports, past papers). The uploaded
-- file's extracted text is stored here and referenced when the AI authors schemes/lessons for the
-- course. Reference/curriculum data only — never pupil data. The text is teacher-previewed/editable
-- (extraction can be rough), and only a capped slice is ever sent to the model.
CREATE TABLE course_documents (
  id         BIGSERIAL PRIMARY KEY,
  course_id  BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('spec', 'examiners_report', 'past_paper', 'reference')),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  char_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX course_documents_course_idx ON course_documents (course_id);
