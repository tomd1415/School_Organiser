-- Phase 4: the AI audit log.
--
-- ai_calls stores ONLY the redacted request. There is deliberately no column for a raw
-- (un-redacted) payload, so the table itself is evidence that no pupil name left the
-- building (SECURITY_AND_PRIVACY §"The pupil-name rule"). pupils(ai_token) and
-- settings(key,value) already exist from earlier phases — the redactor and config reuse them.

CREATE TABLE IF NOT EXISTS ai_calls (
  id               BIGSERIAL PRIMARY KEY,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  feature          TEXT NOT NULL,                 -- e.g. 'draft_lesson'
  provider         TEXT NOT NULL,
  model            TEXT NOT NULL,
  prompt_version   TEXT,
  request_redacted JSONB NOT NULL,                -- redacted payload only
  response         JSONB,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  cost_pence       NUMERIC(10,2),
  status           TEXT NOT NULL DEFAULT 'ok',    -- ok | error | blocked
  error            TEXT
);

CREATE INDEX IF NOT EXISTS ai_calls_created_idx ON ai_calls (created_at);

-- Default AI settings (idempotent; adjustable at runtime via the settings table).
INSERT INTO settings (key, value) VALUES
  ('ai_provider',        'anthropic'),
  ('ai_enabled',         'true'),
  ('ai_model_plan',      'claude-sonnet-4-6'),
  ('ai_model_design',    'claude-opus-4-8'),
  ('ai_model_cheap',     'claude-haiku-4-5'),
  ('ai_month_cap_pence', '5000')
ON CONFLICT (key) DO NOTHING;
