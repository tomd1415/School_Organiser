-- Phase 11 — auto-adapt a class's whole scheme once it has teaching context (decided 2026-06-14).
-- One-shot flag: the background scheme-adapt fires automatically the first time a class has BOTH a
-- scheme and some context, and never re-fires on its own (the teacher re-runs it by hand any time).
ALTER TABLE group_courses ADD COLUMN scheme_auto_adapted BOOLEAN NOT NULL DEFAULT false;
