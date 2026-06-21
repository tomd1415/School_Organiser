-- BUG-054: the new dark "next" shell is now the product default. Backfill the `ui_shell` setting to
-- 'next' for any database that has not explicitly chosen a shell, so a fresh or restored install
-- launches the new UI instead of the retired classic one. An explicit prior choice is left untouched
-- (the Settings toggle still works during the migration checkpoint).
INSERT INTO settings (key, value) VALUES ('ui_shell', 'next')
ON CONFLICT (key) DO NOTHING;
