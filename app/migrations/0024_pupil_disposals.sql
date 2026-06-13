-- Phase 10.2 — the disposal audit. Pupil erasure / leaver anonymisation is "a deliberate, audited
-- retention action" (DATA_MODEL §, DPIA §7); this records THAT it happened and what it removed,
-- WITHOUT re-storing the identity that was just removed. The stable ai_token ("PUPIL_7") is kept —
-- it isn't identifying on its own — so the audit reads "PUPIL_7 erased on <date>, removed N answers".
CREATE TABLE pupil_disposals (
  id         BIGSERIAL PRIMARY KEY,
  ai_token   TEXT NOT NULL,                                  -- the kept, non-identifying token
  action     TEXT NOT NULL CHECK (action IN ('anonymise', 'erase')),
  detail     JSONB NOT NULL DEFAULT '{}',                    -- per-table counts removed/detached
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pupil_disposals_created_idx ON pupil_disposals (created_at DESC);
