import { describe, it, expect } from 'vitest';
import { statusesFor, resolveDueRule, beforeNextBell, type BellTask, type GroupSlot } from '../src/services/task';
import { renderNewTaskButton, renderTaskItem } from '../src/lib/taskView';
import type { TermDate } from '../src/services/clock';

const TZ = 'Europe/London';
const terms: TermDate[] = [{ startDate: '2026-09-01', endDate: '2026-12-18', kind: 'term', name: 'Autumn' }];
// Group 7 is taught Mon slot 5 (09:10) and Wed slot 8 (11:05).
const groupSlots = new Map<number, GroupSlot[]>([
  [7, [
    { weekday: 1, slotOrder: 5, startMin: 9 * 60 + 10 },
    { weekday: 3, slotOrder: 8, startMin: 11 * 60 + 5 },
  ]],
]);
const at = (iso: string) => new Date(iso);

describe('statusesFor', () => {
  it('buckets statuses', () => {
    expect(statusesFor('inbox')).toEqual(['inbox']);
    expect(statusesFor('open')).toContain('in_progress');
    expect(statusesFor('done')).toEqual(['done', 'dropped']);
  });
});

describe('resolveDueRule', () => {
  it("finds the group's next lesson later today", () => {
    const due = resolveDueRule('before_next_lesson:7', at('2026-09-09T08:00:00+01:00'), groupSlots, terms, TZ);
    expect(due).toEqual({ date: '2026-09-09', startMin: 11 * 60 + 5 }); // Wed L3
  });

  it('rolls to the next school day when not taught again today', () => {
    const due = resolveDueRule('before_next_lesson:7', at('2026-09-09T12:00:00+01:00'), groupSlots, terms, TZ);
    expect(due).toEqual({ date: '2026-09-14', startMin: 9 * 60 + 10 }); // next Mon L1
  });

  it('returns null for an unknown group or a bad rule', () => {
    expect(resolveDueRule('before_next_lesson:999', at('2026-09-09T08:00:00+01:00'), groupSlots, terms, TZ)).toBeNull();
    expect(resolveDueRule('nonsense', at('2026-09-09T08:00:00+01:00'), groupSlots, terms, TZ)).toBeNull();
  });
});

describe('beforeNextBell', () => {
  const now = at('2026-09-09T08:00:00+01:00');
  const nextBell = { date: '2026-09-09', startMin: 11 * 60 + 5 };
  const mk = (over: Partial<BellTask>): BellTask => ({ id: 1, title: 't', urgency: 'this_week', dueAt: null, dueRule: null, groupId: null, ...over });

  it('always includes urgent_today and by_next_lesson; never someday', () => {
    const got = beforeNextBell(
      [mk({ id: 1, urgency: 'urgent_today' }), mk({ id: 2, urgency: 'by_next_lesson' }), mk({ id: 3, urgency: 'someday' })],
      nextBell,
      now,
      groupSlots,
      terms,
      TZ,
    );
    expect(got.map((t) => t.id)).toEqual([1, 2]);
  });

  it('includes a this_week task whose due_rule resolves before the bell', () => {
    const got = beforeNextBell([mk({ id: 5, dueRule: 'before_next_lesson:7' })], nextBell, now, groupSlots, terms, TZ);
    expect(got.map((t) => t.id)).toEqual([5]);
  });

  it('excludes one whose due_rule resolves after the bell', () => {
    const earlyBell = { date: '2026-09-09', startMin: 9 * 60 }; // before L3, so the L3 due is later
    const got = beforeNextBell([mk({ id: 6, dueRule: 'before_next_lesson:7' })], earlyBell, now, groupSlots, terms, TZ);
    expect(got).toEqual([]);
  });
});

describe('taskView', () => {
  it('renders an editable item with autosave + triage, escaping the title', () => {
    const html = renderTaskItem(
      { id: 9, title: '<b>x</b>', urgency: 'this_week', estimateMin: 30, cognitiveLoad: 'high', groupId: null, context: null, status: 'inbox' },
      [{ id: 1, name: '8PFA' }],
    );
    expect(html).toContain('id="task-9"');
    expect(html).toContain('hx-post="/tasks/9"');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('/tasks/9/triage');
    expect(html).toContain('8PFA');
  });

  it('new-task button posts to /tasks', () => {
    expect(renderNewTaskButton('tasks-list-inbox')).toContain('hx-post="/tasks"');
  });
});
