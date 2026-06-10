-- Free-text labels on a scheme of work (e.g. "Year 7", "Computer Skills") for organising and
-- finding schemes across courses. Comma-separated; rendered as chips.
ALTER TABLE schemes_of_work ADD COLUMN IF NOT EXISTS labels TEXT;
