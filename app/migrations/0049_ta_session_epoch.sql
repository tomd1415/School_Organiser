-- Session revocation for named TA accounts (BUG-016), symmetric to the pupil epoch (0048). Disabling,
-- deleting or re-passwording a TA account bumps this epoch; the request hook compares it to the session's
-- epoch and re-checks active, so a revocation takes effect immediately, not just at next login.
ALTER TABLE ta_accounts ADD COLUMN IF NOT EXISTS session_epoch INTEGER NOT NULL DEFAULT 0;
