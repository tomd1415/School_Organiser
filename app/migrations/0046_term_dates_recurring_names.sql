-- Term-date names recur within a year — schools have several INSET days, and an autumn/spring/summer
-- "Half term" — so UNIQUE (year, name) was wrong: it rejected legitimate entries with a page error.
-- Allow a repeated name on different dates; only an exact (name + start date) duplicate is blocked.
ALTER TABLE term_dates DROP CONSTRAINT IF EXISTS term_dates_academic_year_id_name_key;
ALTER TABLE term_dates
  ADD CONSTRAINT term_dates_year_name_date_key UNIQUE (academic_year_id, name, start_date);
