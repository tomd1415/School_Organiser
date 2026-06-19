-- Session revocation (BUG-017): a pupil's session is self-contained (cookie), so a PIN reset / disable /
-- archive / disposal previously only affected the NEXT login. Bumping this epoch invalidates every live
-- session for that pupil immediately — the request hook compares the session's epoch to this one.
ALTER TABLE pupils ADD COLUMN IF NOT EXISTS session_epoch INTEGER NOT NULL DEFAULT 0;
