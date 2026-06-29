import { describe, it, expect } from 'vitest';
import { renderAttendanceRow, renderAttendanceCard } from '../src/lib/attendanceView';
import type { AttendanceRow } from '../src/repos/attendance';

const pupil = { pupilId: 30, displayName: 'A. Pupil' };

describe('attendanceView', () => {
  it('renders the four status buttons wired to the per-pupil endpoint, none active when unmarked', () => {
    const html = renderAttendanceRow(20, pupil, null);
    expect(html).toContain('id="att-row-20-30"');
    expect(html).toContain('hx-post="/lesson/oc/20/pupil/30/attendance"');
    expect(html).toContain('hx-target="#att-row-20-30"');
    expect(html).toContain('✓ Present');
    expect(html).toContain('✕ Absent');
    expect(html).not.toContain('is-on');
    expect(html).not.toContain('att-detail'); // no detail form until a leave status is chosen
  });

  it('highlights the active status and reveals the minutes+reason form for left-early', () => {
    const row: AttendanceRow = { pupilId: 30, status: 'left_early', leftEarlyMinutes: 15, leaveReason: 'dentist', expectedReturn: null };
    const html = renderAttendanceRow(20, pupil, row);
    expect(html).toContain('att-left_early is-on');
    expect(html).toContain('name="leftEarlyMinutes"');
    expect(html).toContain('value="15"');
    expect(html).toContain('value="dentist"');
    expect(html).not.toContain('name="expectedReturn"');
  });

  it('reveals the reason+return-date form for extended-leave', () => {
    const row: AttendanceRow = { pupilId: 30, status: 'extended_leave', leftEarlyMinutes: null, leaveReason: 'authorised', expectedReturn: '2026-07-10' };
    const html = renderAttendanceRow(20, pupil, row);
    expect(html).toContain('att-extended_leave is-on');
    expect(html).toContain('name="expectedReturn"');
    expect(html).toContain('value="2026-07-10"');
    expect(html).not.toContain('name="leftEarlyMinutes"');
  });

  it('escapes pupil names and leave reasons', () => {
    const row: AttendanceRow = { pupilId: 30, status: 'left_early', leftEarlyMinutes: null, leaveReason: '<b>x</b>', expectedReturn: null };
    const html = renderAttendanceRow(20, { pupilId: 30, displayName: '<script>y</script>' }, row);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>y');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('card summarises how many are marked and wires Mark-all-present', () => {
    const att = new Map<number, AttendanceRow>([
      [30, { pupilId: 30, status: 'present', leftEarlyMinutes: null, leaveReason: null, expectedReturn: null }],
    ]);
    const html = renderAttendanceCard(20, [pupil, { pupilId: 31, displayName: 'B. Pupil' }], att);
    expect(html).toContain('1/2 marked');
    expect(html).toContain('hx-post="/lesson/oc/20/attendance/all-present"');
    expect(html).toContain('id="att-card-20"');
  });

  it('card with no roster shows the empty note and hides Mark-all-present', () => {
    const html = renderAttendanceCard(20, [], new Map());
    expect(html).toContain('No pupils enrolled');
    expect(html).not.toContain('all-present');
  });
});
