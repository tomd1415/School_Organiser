-- Phase 10.4 — the disclosure lane + register. A guard-matched pupil answer was stored as a normal
-- mark wearing the same generic "⚠ needs your eyes" badge as a benign low-confidence mark, so a real
-- disclosure could be lost in the noise. Tag it distinctly, and give the teacher one place to review
-- every flagged item (disclosure answers + safeguarding-flagged captured items + TA feedback) and
-- RECORD what was done — a record-of-handling, never a referral system, never sent to any AI.

-- The distinct flag (set by the content guard when it withholds an answer from the AI).
ALTER TABLE pupil_marks ADD COLUMN disclosure BOOLEAN NOT NULL DEFAULT false;

-- Status overlay on a flagged item. A flagged item with NO row here is implicitly 'new' (unreviewed);
-- the row is created lazily the first time the teacher records an action. source_id points at the
-- flagged row in its own table (pupil_answers.id / notes.id / ta_feedback.id).
CREATE TABLE safeguarding_review (
  source_type TEXT NOT NULL CHECK (source_type IN ('answer', 'captured', 'ta_feedback')),
  source_id   BIGINT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('recorded', 'actioned', 'referred')) DEFAULT 'recorded',
  action_note TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_type, source_id)
);
