-- Phase 0: minimal schema to prove the app boots, connects and migrates.
-- Requires the pgvector image (docker-compose uses pgvector/pgvector:pg16).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
  ('app_name', 'School Organiser'),
  ('schema_phase', '0')
ON CONFLICT (key) DO NOTHING;
