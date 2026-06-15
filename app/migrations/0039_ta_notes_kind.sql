-- Worksheets v2: a SEPARATE TA-notes document per lesson (how to support each level, misconceptions,
-- what good looks like, the answers). Generated apart from the pupil worksheet so it is NEVER shown to
-- a pupil (the pupil surface only ever resolves kind='worksheet'/'slides'). Add the kind to the CHECK.
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_kind_check;
ALTER TABLE resources ADD CONSTRAINT resources_kind_check
  CHECK (kind IN ('document', 'slides', 'worksheet', 'quiz', 'image', 'link', 'note', 'ta_notes'));
