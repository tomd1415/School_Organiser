import { describe, it, expect } from 'vitest';
import { parseEmail } from '../src/services/emailIntake';
import { screenEmailForSafeguarding } from '../src/services/emailPoll';

describe('screenEmailForSafeguarding (10.5 — pre-egress safeguarding screen)', () => {
  it('trips on a disclosure in the body so it is never sent to the AI', () => {
    expect(screenEmailForSafeguarding('Worried about a pupil', 'She told me she is not safe at home.')).toBe('not safe');
  });
  it('trips on a disclosure in the subject too', () => {
    expect(screenEmailForSafeguarding('A pupil said they want to hurt myself', 'see attached')).toBe('hurt myself');
  });
  it('passes an ordinary admin email through to normal triage', () => {
    expect(screenEmailForSafeguarding('Y10 trip consent', 'Please collect the forms by Friday.')).toBeNull();
  });
});

describe('parseEmail', () => {
  it('uses the Subject line as the title and the rest as detail', () => {
    const p = parseEmail('From: head@school\nSubject: Y10 trip consent\n\nPlease collect forms by Friday.');
    expect(p.subject).toBe('Y10 trip consent');
    expect(p.title).toBe('Y10 trip consent');
    expect(p.from).toBe('head@school');
    expect(p.detail).toContain('collect forms');
  });

  it('falls back to the first line when there is no Subject', () => {
    const p = parseEmail('Reply to parent about homework\nThey emailed twice.');
    expect(p.title).toBe('Reply to parent about homework');
    expect(p.detail).toBe('They emailed twice.');
  });

  it('handles a single line', () => {
    const p = parseEmail('Print 8 worksheets for Y10');
    expect(p.title).toBe('Print 8 worksheets for Y10');
    expect(p.detail).toBe('');
  });

  it('never returns an empty title', () => {
    expect(parseEmail('').title).toBe('Email task');
    expect(parseEmail('   \n  ').title).toBe('Email task');
  });
});
