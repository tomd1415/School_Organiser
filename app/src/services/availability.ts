// AvailabilityService — the real work windows for a day. Pure: keep free periods
// + before/after school (never coffee, break, lunch, teaching, clubs), then carve
// out the after-school commitments (+ buffer) and availability-affecting events.
import { AFTER_SCHOOL_COMMITMENTS, TIDY_BUFFER_MIN, type Commitment } from '../lib/commitments';

export interface AvailSlot {
  slotType: string;
  label: string;
  startMin: number;
  endMin: number;
  purpose: string | null; // the self lesson's purpose, or null when no lesson sits here
}

export interface BlockInterval {
  startMin: number;
  endMin: number;
}

export interface Window {
  startMin: number;
  endMin: number;
  label: string;
  minutes: number;
}

export interface AvailCtx {
  weekday: number;
  isSchoolDay: boolean;
  slots: AvailSlot[];
  blockingEvents: BlockInterval[];
  fortnightActive: boolean;
  commitments?: Commitment[];
  bufferMin?: number;
}

/** Free sub-intervals of [s, e) after removing the blocked intervals. */
function subtract(s: number, e: number, blocked: Array<[number, number]>): Array<[number, number]> {
  const clipped = blocked
    .filter(([bs, be]) => be > s && bs < e)
    .map(([bs, be]) => [Math.max(bs, s), Math.min(be, e)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  let cur = s;
  for (const [bs, be] of clipped) {
    if (bs > cur) out.push([cur, bs]);
    cur = Math.max(cur, be);
  }
  if (cur < e) out.push([cur, e]);
  return out;
}

function isWorkWindow(slot: AvailSlot): boolean {
  if (slot.purpose === 'free') return true; // a protected free period
  return (slot.slotType === 'before_school' || slot.slotType === 'after_school') && slot.label !== 'Coffee';
}

export function computeWindows(ctx: AvailCtx): Window[] {
  if (!ctx.isSchoolDay) return [];
  const buffer = ctx.bufferMin ?? TIDY_BUFFER_MIN;
  const commitments = ctx.commitments ?? AFTER_SCHOOL_COMMITMENTS;

  const blocked: Array<[number, number]> = [];
  for (const c of commitments) {
    if (c.weekday !== ctx.weekday) continue;
    if (c.fortnightly && !ctx.fortnightActive) continue;
    blocked.push([c.startMin, c.endMin + buffer]);
  }
  for (const ev of ctx.blockingEvents) blocked.push([ev.startMin, ev.endMin + buffer]);

  const windows: Window[] = [];
  for (const slot of ctx.slots) {
    if (!isWorkWindow(slot)) continue;
    for (const [s, e] of subtract(slot.startMin, slot.endMin, blocked)) {
      if (e - s >= 5) windows.push({ startMin: s, endMin: e, label: slot.label, minutes: e - s });
    }
  }
  return windows.sort((a, b) => a.startMin - b.startMin);
}
