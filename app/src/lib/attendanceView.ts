// Phase 17 — the in-lesson attendance register (noted_bugs2 #4). A quick-mark roster inside the lesson
// cockpit: each pupil → [Present][Absent][Left early][Ext. leave]; left-early reveals a minutes+reason
// field, extended-leave a reason+return-date field. Pure data → HTML; the route owns the data. PRIVACY:
// leave_reason is shown here in the register only and is NEVER sent to any AI service (see CLAUDE.md).
import { esc } from './html';
import { paths } from './paths';
import type { AttendanceRow, AttendanceStatus } from '../repos/attendance';

export interface RosterPupil {
  pupilId: number;
  displayName: string;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '✓ Present',
  absent: '✕ Absent',
  left_early: '⏱ Left early',
  extended_leave: '🗓 Ext. leave',
};

/** One pupil's row — the four status buttons (current one highlighted) plus, for left-early / extended-
 * leave, an inline detail form. The wrapper sets hx-target/hx-swap so each button swaps just this row. */
export function renderAttendanceRow(oc: number, pupil: RosterPupil, row: AttendanceRow | null): string {
  const pid = pupil.pupilId;
  const status = row?.status ?? null;
  const id = `att-row-${oc}-${pid}`;
  const btn = (s: AttendanceStatus): string =>
    `<button type="button" class="att-btn att-${s}${status === s ? ' is-on' : ''}" hx-post="${paths.occPupilAttendance(oc, pid)}" hx-vals='${esc(JSON.stringify({ status: s }))}'>${STATUS_LABEL[s]}</button>`;

  let detail = '';
  if (status === 'left_early') {
    detail = `<form class="att-detail" hx-post="${paths.occPupilAttendance(oc, pid)}">
        <input type="hidden" name="status" value="left_early">
        <label>Minutes <input type="number" name="leftEarlyMinutes" min="0" max="600" value="${esc(String(row?.leftEarlyMinutes ?? ''))}"></label>
        <label>Reason <input name="leaveReason" maxlength="200" placeholder="e.g. medical appointment" value="${esc(row?.leaveReason ?? '')}"></label>
        <button type="submit" class="att-save">Save</button>
      </form>`;
  } else if (status === 'extended_leave') {
    detail = `<form class="att-detail" hx-post="${paths.occPupilAttendance(oc, pid)}">
        <input type="hidden" name="status" value="extended_leave">
        <label>Reason <input name="leaveReason" maxlength="200" placeholder="e.g. authorised leave" value="${esc(row?.leaveReason ?? '')}"></label>
        <label>Expected return <input type="date" name="expectedReturn" value="${esc(row?.expectedReturn ?? '')}"></label>
        <button type="submit" class="att-save">Save</button>
      </form>`;
  }

  return `<div class="att-row" id="${id}" hx-target="#${id}" hx-swap="outerHTML">
    <span class="att-name">${esc(pupil.displayName)}</span>
    <div class="att-btns">${btn('present')}${btn('absent')}${btn('left_early')}${btn('extended_leave')}</div>
    ${detail}
  </div>`;
}

/** The whole register card. "Mark all present" swaps the whole card (so its summary refreshes); a single
 * status change swaps just that pupil's row (so the summary count may lag until the next full render). */
export function renderAttendanceCard(oc: number, roster: RosterPupil[], attendance: Map<number, AttendanceRow>): string {
  const rows = roster.map((p) => renderAttendanceRow(oc, p, attendance.get(p.pupilId) ?? null)).join('');
  const marked = roster.filter((p) => attendance.has(p.pupilId)).length;
  return `<div class="att-card" id="att-card-${oc}">
    <div class="card-head">
      <div><p class="eyebrow">Register</p><h2>Attendance</h2></div>
      ${roster.length ? `<button type="button" class="button small" hx-post="${paths.occAttendanceAllPresent(oc)}" hx-target="#att-card-${oc}" hx-swap="outerHTML">Mark all present</button>` : ''}
    </div>
    <p class="muted att-summary">${marked}/${roster.length} marked</p>
    <div class="att-list">${rows || '<p class="muted">No pupils enrolled in this class yet.</p>'}</div>
  </div>`;
}
