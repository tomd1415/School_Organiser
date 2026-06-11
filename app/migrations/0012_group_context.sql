-- Phase 5.9: optional per-group teaching-context. The per-course context (0008) stays the cohort
-- default; a group_courses-level note adds what is specific to THIS class (7ARO ≠ 7JMI), and is
-- injected alongside the course context when adapting/improving for that group.
ALTER TABLE group_courses ADD COLUMN IF NOT EXISTS teaching_context TEXT;
