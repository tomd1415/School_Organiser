-- A fictitious "test pupil" so the teacher can exercise the pupil-facing worksheet experience for
-- ANY lesson at ANY time, without a real child's data and without the time-gate / DPIA access gate.
-- It is NOT a real pupil: excluded from the roster, redaction targets and marking reports.
ALTER TABLE pupils ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
