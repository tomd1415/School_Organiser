-- Phase 8 fix: the teacher must be able to PRINT each pupil's PIN on their login card and read it
-- out to them, so the PIN has to be retrievable — a scrypt hash alone can't be shown. We keep the
-- hash for verification (the auth path is unchanged) and additionally store the PIN value so the
-- teacher-only login-cards view and the Pupils admin can display it.
--
-- Trade-off (documented in SECURITY_AND_PRIVACY / DPIA): a 4–6 digit classroom PIN is low-entropy
-- and not a real secret in this setting — pupils share classroom machines, the login is LAN-only,
-- rate-limited and lockout-protected, and classmates already know each other. The PIN is never
-- sent to any AI service and is only ever shown on teacher-authenticated surfaces.

ALTER TABLE pupil_credentials ADD COLUMN pin TEXT;
