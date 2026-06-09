// PrepService defaults. Per-lesson prep uses prep_templates → occurrence_prep
// (materialised when an occurrence is opened). The start/end-of-day checklist uses
// day_checklist, materialised per date from these defaults. Editable later (Phase 5).

export const PREP_TEMPLATE_DEFAULTS = ['Assign resources to MS Teams', 'Resources ready', 'Starter set'];

export const DAY_CHECKLIST_DEFAULTS: Record<'start' | 'end', string[]> = {
  start: ['Make coffee', 'Read the briefing notes', 'Set up the room', "Check today's resources are ready"],
  end: ['Tidy the room', 'Log what I actually did', "Set tomorrow's starters", 'Reply to any urgent emails', 'Pack up — go home'],
};
