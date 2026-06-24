import { describe, it, expect } from 'vitest';
import { renderLesson, readinessDots } from '../src/lib/timetableView';
import { NO_EXCEPTION, type ExceptionEffect } from '../src/services/exceptions';
import type { GridLesson } from '../src/services/timetable';

const FREE_EX: ExceptionEffect = { mode: 'free', label: 'Free', detail: 'class away', roomName: null };

function lesson(over: Partial<GridLesson> = {}): GridLesson {
  return { lessonId: 7, purpose: 'teaching', isSelf: true, staffName: 'Me', groupName: '9X', courses: [{ name: 'Computing', colour: '#0af' }], ...over };
}

describe('readinessDots', () => {
  it('renders a dot per raised signal, with the flashing class on purple', () => {
    const html = readinessDots({ noScheme: true, noPlan: true, needsEdit: true });
    expect(html).toContain('tt-dot-red');
    expect(html).toContain('tt-dot-purple');
    expect(html).toContain('tt-dot-blue');
    expect(html).toContain('tt-dots');
  });

  it('renders nothing when all clear or undefined', () => {
    expect(readinessDots({ noScheme: false, noPlan: false, needsEdit: false })).toBe('');
    expect(readinessDots(undefined)).toBe('');
  });

  it('renders only the signals that are set', () => {
    const html = readinessDots({ noScheme: false, noPlan: true, needsEdit: false });
    expect(html).toContain('tt-dot-purple');
    expect(html).not.toContain('tt-dot-red');
    expect(html).not.toContain('tt-dot-blue');
  });
});

describe('renderLesson free routing + dots', () => {
  it('a teaching lesson links to /lesson and shows readiness dots', () => {
    const html = renderLesson(lesson(), '2026-03-03', NO_EXCEPTION, { noScheme: false, noPlan: true, needsEdit: false });
    // URL now built via paths.lessonOpen → HTML-attribute form (&amp; joiner; browser-identical).
    expect(html).toContain('href="/lesson?lesson=7&amp;date=2026-03-03"');
    expect(html).toContain('tt-dot-purple'); // dots show on own teaching lessons
  });

  it('a permanent free slot opens the free-period workspace, not the lesson', () => {
    const html = renderLesson(lesson({ purpose: 'free', groupName: null }), '2026-03-03', NO_EXCEPTION);
    expect(html).toContain('href="/free?lesson=7&amp;date=2026-03-03"');
    expect(html).toContain('tt-is-free');
    expect(html).not.toContain('/lesson?');
  });

  it('a teaching lesson freed for THIS date by an exception also opens /free', () => {
    const html = renderLesson(lesson(), '2026-03-03', FREE_EX);
    expect(html).toContain('href="/free?lesson=7&amp;date=2026-03-03"');
  });

  it('does NOT show readiness dots on a lesson I only oversee', () => {
    const html = renderLesson(lesson({ isSelf: false }), '2026-03-03', NO_EXCEPTION, { noScheme: true, noPlan: true, needsEdit: true });
    expect(html).not.toContain('tt-dot');
    expect(html).toContain('⚑'); // the oversee flag is still shown
  });

  it('does NOT show readiness dots on a free period (only teaching)', () => {
    const html = renderLesson(lesson({ purpose: 'free' }), '2026-03-03', NO_EXCEPTION, { noScheme: true, noPlan: true, needsEdit: true });
    expect(html).not.toContain('tt-dot');
  });
});
