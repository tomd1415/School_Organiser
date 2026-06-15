-- Reliability (review #21) — idempotent email intake. The poller writes the task/event BEFORE it sets
-- the IMAP \Seen flag; if that flag-set fails (a dropped connection), the message stays UNSEEN and the
-- next poll re-imports it — a duplicate task/event. This records a per-message dedup key (the email's
-- Message-ID, or a content hash when absent) so a re-seen message is skipped. Reference/log data only.
CREATE TABLE processed_emails (
  dedup_key    TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
