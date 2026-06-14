-- Phase 10.24 — a one-tap per-unit progress traffic-light per pupil (Spec 5.7 C: behind /
-- on-track / exceeding). Teacher-only signal; never AI-bound. One row per (pupil, unit).
CREATE TABLE pupil_unit_signal (
  pupil_id   BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  unit_id    BIGINT NOT NULL REFERENCES units(id)  ON DELETE CASCADE,
  signal     TEXT NOT NULL CHECK (signal IN ('behind', 'on_track', 'exceeding')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pupil_id, unit_id)
);
