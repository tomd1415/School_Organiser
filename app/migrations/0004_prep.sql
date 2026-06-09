-- Phase 2.8: the start/end-of-day daily checklist. (Per-lesson prep uses the
-- prep_templates / occurrence_prep tables from 0003.)
CREATE TABLE day_checklist (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE NOT NULL,
  part          TEXT NOT NULL CHECK (part IN ('start', 'end')),
  text          TEXT NOT NULL,
  done          BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_day_checklist_date ON day_checklist (date);
