import { describe, it, expect } from 'vitest';
import { indexDayExceptions, exceptionForLesson, describeException, effectiveRoom, NO_EXCEPTION } from '../src/services/exceptions';
import type { ExceptionRow } from '../src/repos/exceptions';

const row = (over: Partial<ExceptionRow>): ExceptionRow => ({
  id: 1,
  date: '2026-06-18',
  timetabledLessonId: null,
  kind: 'cancelled',
  roomName: null,
  staffName: null,
  note: null,
  ...over,
});

describe('exception display helpers', () => {
  it('separates whole-day from per-lesson exceptions', () => {
    const dx = indexDayExceptions([
      row({ id: 1, timetabledLessonId: 10, kind: 'cover', staffName: 'Mr X' }),
      row({ id: 2, timetabledLessonId: null, kind: 'off_timetable', note: 'Snow day' }),
    ]);
    expect(dx.wholeDay?.id).toBe(2);
    expect(dx.byLesson.get(10)?.kind).toBe('cover');
  });

  it('lets a whole-day off-timetable beat a per-lesson exception', () => {
    const dx = indexDayExceptions([
      row({ id: 1, timetabledLessonId: 10, kind: 'cover', staffName: 'Mr X' }),
      row({ id: 2, timetabledLessonId: null, kind: 'off_timetable', note: 'Trip' }),
    ]);
    expect(exceptionForLesson(dx, 10)?.kind).toBe('off_timetable');
  });

  it('falls back to the per-lesson exception, else null', () => {
    const dx = indexDayExceptions([row({ id: 1, timetabledLessonId: 10, kind: 'free', note: 'Y9 trip' })]);
    expect(exceptionForLesson(dx, 10)?.note).toBe('Y9 trip');
    expect(exceptionForLesson(dx, 999)).toBeNull();
    expect(exceptionForLesson(dx, null)).toBeNull();
  });

  it('describes free / cover / room effects', () => {
    expect(describeException(row({ kind: 'free', note: 'Y9 on trip' }))).toMatchObject({ mode: 'free', label: 'Free', detail: 'Y9 on trip' });
    expect(describeException(row({ kind: 'cancelled' }))).toMatchObject({ mode: 'free', detail: 'lesson cancelled' });
    expect(describeException(row({ kind: 'off_timetable', note: 'Snow' }))).toMatchObject({ mode: 'free', detail: 'Snow' });
    expect(describeException(row({ kind: 'cover', staffName: 'Mr X', note: '8B' }))).toMatchObject({ mode: 'cover', label: 'On cover', detail: 'covering for Mr X · 8B' });
    expect(describeException(row({ kind: 'room_change', roomName: 'U2' }))).toMatchObject({ mode: 'room', roomName: 'U2' });
    expect(describeException(null)).toMatchObject({ mode: 'none' });
  });
});

// BUG-012 / BUG-047: the room a slot actually runs in once an exception applies — the TA view and the
// daily print consume this so a cover/room change never sends anyone to the wrong place.
describe('effectiveRoom — which room the lesson actually runs in', () => {
  it('keeps the timetabled room when there is no exception (or a free/none effect)', () => {
    expect(effectiveRoom(NO_EXCEPTION, 'U1')).toBe('U1');
    expect(effectiveRoom(describeException(row({ kind: 'free' })), 'U1')).toBe('U1');
    expect(effectiveRoom(NO_EXCEPTION, null)).toBeNull();
  });

  it('substitutes the new room on a room-change', () => {
    expect(effectiveRoom(describeException(row({ kind: 'room_change', roomName: 'U2' })), 'U1')).toBe('U2');
  });

  it('uses a cover-named relocated room, but keeps the timetabled room if cover names none', () => {
    expect(effectiveRoom(describeException(row({ kind: 'cover', staffName: 'Mr X', roomName: 'Hall' })), 'U1')).toBe('Hall');
    expect(effectiveRoom(describeException(row({ kind: 'cover', staffName: 'Mr X' })), 'U1')).toBe('U1');
  });
});
