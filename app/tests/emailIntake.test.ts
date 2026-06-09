import { describe, it, expect } from 'vitest';
import { parseEmail } from '../src/services/emailIntake';

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
