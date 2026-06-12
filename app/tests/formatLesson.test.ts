import { describe, expect, it } from 'vitest';
import { formatObjectives, formatOutline } from '../src/lib/formatLesson';

describe('formatOutline (readable lesson steps)', () => {
  it('numbered lines become an ordered list with timing badges', () => {
    const html = formatOutline('1. Arrival routine (5 min) — slide on screen\n2. Starter card sort (10 min)\n3. Main task');
    expect(html).toContain('<ol class="outline-steps">');
    expect(html).toContain('<span class="step-min">5 min</span>');
    expect(html).toContain('Starter card sort');
    expect((html.match(/<li>/g) ?? []).length).toBe(3);
    expect(html).not.toContain('1.'); // numbering comes from the list, not the text
  });

  it('handles "Step 1)" and dash separators and minute ranges', () => {
    const html = formatOutline('Step 1) Demo (5-10 min)\nStep 2 — pupils try');
    expect(html).toContain('step-min');
    expect(html).toContain('5-10 min');
    expect(html).toContain('pupils try');
  });

  it('bullet lines become an unordered list; prose stays paragraphs', () => {
    const html = formatOutline('Remember the seating plan\n- spare laptops charged\n- handouts on desks');
    expect(html).toContain('<p class="outline-p">Remember the seating plan</p>');
    expect(html).toContain('outline-bullets');
    expect((html.match(/<li>/g) ?? []).length).toBe(2);
  });

  it('escapes HTML and returns empty for empty input', () => {
    expect(formatOutline('1. Use <b>bold</b>')).toContain('&lt;b&gt;');
    expect(formatOutline('')).toBe('');
    expect(formatOutline(null)).toBe('');
  });
});

describe('formatObjectives', () => {
  it('one objective per line, bullets/numbers stripped', () => {
    const html = formatObjectives('- identify inputs\n2. write a SUM formula\nexplain cell references');
    expect((html.match(/<li>/g) ?? []).length).toBe(3);
    expect(html).toContain('identify inputs');
    expect(html).not.toContain('2.');
  });

  it('empty → empty string', () => {
    expect(formatObjectives('  ')).toBe('');
  });
});

import { outlineSteps } from '../src/lib/formatLesson';

describe('flat-block rescue (older AI drafts)', () => {
  it('splits inline numbered steps with no newlines', () => {
    const html = formatOutline('1. Arrival (5 min) — settle. 2. Demo =SUM (10 min) — model it. 3. Practice (20 min) — pupils total sheets.');
    expect((html.match(/<li>/g) ?? []).length).toBe(3);
    expect(html).toContain('step-min');
  });

  it('splits CAPS section headers and treats them as steps', () => {
    const html = formatOutline('STARTER (10 min) — same slide routine. MAIN ACTIVITY (25 min) — levelled tasks. PLENARY (10 min) — whiteboards.');
    expect((html.match(/<li>/g) ?? []).length).toBe(3);
    expect(html).toContain('STARTER');
  });

  it('outlineSteps sees the rescued steps (tracker works on old drafts)', () => {
    const steps = outlineSteps('STARTER (10 min) — routine. MAIN (20 min) — tasks. PLENARY (5 min) — check.');
    expect(steps.length).toBe(3);
  });

  it('normal prose with one number is not mangled', () => {
    const html = formatOutline('Recap lesson 3. Pupils continue their posters from last week.');
    expect(html).toContain('<p class="outline-p">');
    expect(html).not.toContain('<ol');
  });
});
