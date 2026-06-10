-- Phase 4: per-course "teaching context" — cohort + pedagogy guidance that the AI layer
-- auto-prepends to every lesson/scheme request for that course, so the teacher stops retyping it.
-- Cohort-level, non-identifying prose ONLY (never a named or described individual pupil).

ALTER TABLE courses ADD COLUMN IF NOT EXISTS teaching_context TEXT;

-- Seed a school-wide SEND default for every existing course (editable per course afterwards —
-- e.g. the VI-pupils course or a GCSE class will want different wording).
UPDATE courses SET teaching_context =
'This is a UK special-education secondary setting. Design for autistic and ADHD learners as the norm, across a very wide ability range, in classes of about 12 taught by a specialist teacher plus one non-specialist TA. Use a low-arousal, low-cognitive-load approach: a predictable, identical lesson routine; plain, literal language; no flashing, animation or sound; explicit chunked instruction (I-do / we-do / you-do) with worked examples and models before independent work; strong visual supports; and minimal writing (prefer drag, click, choose, match, order, label, screenshot or verbal-to-TA answers, with word banks and sentence starters where typing is the point). Build in regulation/movement breaks as fixed routine, not rewards. Provide genuine Support / Core / Challenge differentiation on the SAME task, with a low floor and high ceiling, so no screen looks "less done". Make every task concrete, high-interest and success-oriented, with a real kept artefact and frequent achievable wins; let pupils choose the theme while the skill stays fixed. Make everything usable by a non-specialist TA: plain-English "what the TA does" notes, key vocabulary defined, the likely pupil errors and the exact fix-words, and "prompt, do not do it for them". Re-teach core routines every lesson. Never name, invent or describe individual pupils.'
WHERE teaching_context IS NULL;
