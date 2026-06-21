// Pure display helpers that turn dated lesson exceptions into what the Now screen / timetable should
// say for a slot. Kept free of DB access so it unit-tests without a database (type-only import below).
import type { ExceptionRow } from '../repos/exceptions';

export interface DayExceptions {
  /** an off-timetable exception with no specific lesson — applies to the whole day (trip/exam/snow) */
  wholeDay: ExceptionRow | null;
  /** lessonId → its exception for the day (last one wins) */
  byLesson: Map<number, ExceptionRow>;
}

export function indexDayExceptions(rows: ExceptionRow[]): DayExceptions {
  let wholeDay: ExceptionRow | null = null;
  const byLesson = new Map<number, ExceptionRow>();
  for (const e of rows) {
    if (e.timetabledLessonId == null) {
      if (e.kind === 'off_timetable') wholeDay = e;
    } else {
      byLesson.set(e.timetabledLessonId, e);
    }
  }
  return { wholeDay, byLesson };
}

/** The exception in force for one lesson on the day: a whole-day off-timetable beats a per-lesson one. */
export function exceptionForLesson(dx: DayExceptions, lessonId: number | null | undefined): ExceptionRow | null {
  if (dx.wholeDay) return dx.wholeDay;
  if (lessonId == null) return null;
  return dx.byLesson.get(lessonId) ?? null;
}

export type ExceptionMode = 'free' | 'cover' | 'room' | 'none';

export interface ExceptionEffect {
  mode: ExceptionMode;
  /** short headline, e.g. "Free", "On cover", "Room change" */
  label: string;
  /** supporting detail, e.g. "Y9 on trip", "covering for Mr X", "→ U2" */
  detail: string;
  /** for room_change: the new room name (else null) */
  roomName: string | null;
}

export const NO_EXCEPTION: ExceptionEffect = { mode: 'none', label: '', detail: '', roomName: null };

/** Map a raw exception to how a slot should read. cancelled/free/off_timetable ⇒ free time; cover ⇒ on cover. */
export function describeException(ex: ExceptionRow | null): ExceptionEffect {
  if (!ex) return NO_EXCEPTION;
  const note = ex.note?.trim() || '';
  const join = (...parts: string[]) => parts.filter(Boolean).join(' · ');
  switch (ex.kind) {
    case 'cover':
      return { mode: 'cover', label: 'On cover', detail: join(ex.staffName ? `covering for ${ex.staffName}` : 'on cover', note), roomName: ex.roomName ?? null };
    case 'room_change':
      return { mode: 'room', label: 'Room change', detail: join(ex.roomName ? `→ ${ex.roomName}` : '', note), roomName: ex.roomName ?? null };
    case 'free':
      return { mode: 'free', label: 'Free', detail: note || 'class away', roomName: null };
    case 'cancelled':
      return { mode: 'free', label: 'Free', detail: note || 'lesson cancelled', roomName: null };
    case 'off_timetable':
      return { mode: 'free', label: 'Free', detail: note || 'off timetable', roomName: null };
    default:
      return NO_EXCEPTION;
  }
}

/** The room a slot actually runs in once any exception is applied: a room-change — or a cover that names
 *  a relocated room — overrides the timetabled room; anything else keeps it. Pure, so it unit-tests
 *  without a DB. The render surfaces (TA view, daily print) use this so cover/room never misdirect
 *  (BUG-012 / BUG-047). Staff is deliberately NOT substituted — a cover row only records who is being
 *  covered FOR, not the substitute's name, so we surface cover status rather than invent a teacher. */
export function effectiveRoom(effect: ExceptionEffect, timetabledRoom: string | null | undefined): string | null {
  if ((effect.mode === 'room' || effect.mode === 'cover') && effect.roomName) return effect.roomName;
  return timetabledRoom ?? null;
}
