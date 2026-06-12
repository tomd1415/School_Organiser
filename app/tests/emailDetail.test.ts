import { describe, expect, it } from 'vitest';
import { renderEmailDetail } from '../src/lib/taskView';

describe('renderEmailDetail (scannable email summaries)', () => {
  const detail = [
    'Y8 trip is Thursday 9 July. Forms and £8 due by Friday 26 June.',
    '• deadline: Fri 26 June',
    '• money: £8',
    '• who: 8PFA — 5 outstanding',
    '(Teacher must chase forms · from office@school.org)',
  ].join('\n');

  it('fact lines become labelled chips', () => {
    const html = renderEmailDetail(detail);
    expect(html).toContain('fact-deadline');
    expect(html).toContain('fact-money');
    expect(html).toContain('8PFA — 5 outstanding');
    expect((html.match(/class="fact /g) ?? []).length).toBe(3);
  });

  it('dates and amounts in the prose are highlighted', () => {
    const html = renderEmailDetail(detail);
    expect(html).toContain('<mark class="hl">Thursday 9 July</mark>');
    expect(html).toContain('<mark class="hl">£8</mark>');
  });

  it('provenance renders muted, not as prose', () => {
    const html = renderEmailDetail(detail);
    expect(html).toContain('task-detail-prov');
    expect(html).toContain('office@school.org');
  });

  it('plain prose (manual tasks) renders unchanged and escaped', () => {
    const html = renderEmailDetail('Just a note with <b>html</b>');
    expect(html).not.toContain('fact-row');
    expect(html).toContain('&lt;b&gt;');
  });
});
