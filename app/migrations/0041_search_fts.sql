-- Phase 12 D3 — ranked full-text search for the global search box. Postgres FTS (tsvector) gives
-- stemming (teach/teaching/taught match), relevance ranking and multi-word AND, a big upgrade on the
-- substring (ILIKE) search. Pure local SQL — nothing leaves the building, no AI, so the no-name-to-AI
-- invariant is untouched (true vector/embedding search would need an embeddings provider + a DPIA
-- change, so it's deliberately not done here). GIN indexes on the SAME expressions the queries use.
CREATE INDEX IF NOT EXISTS idx_notes_fts ON notes USING gin (to_tsvector('english', body));
CREATE INDEX IF NOT EXISTS idx_tasks_fts ON tasks USING gin (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_events_fts ON events USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(detail, '')));
CREATE INDEX IF NOT EXISTS idx_plans_fts ON lesson_plans USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(objectives, '') || ' ' || coalesce(outline, '')));
CREATE INDEX IF NOT EXISTS idx_resources_fts ON resources USING gin (to_tsvector('english', title));
