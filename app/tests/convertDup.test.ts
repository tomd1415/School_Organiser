import { describe, it, expect } from 'vitest';
import { renderConvertDup } from '../src/lib/schemeView';

describe('renderConvertDup (C3 convert de-dup warning)', () => {
  it('names the existing unit(s) and offers a confirmed "convert again" + cancel', () => {
    const html = renderConvertDup(3, 'year_7/Networks', '12:5', '2026-09-08', ['Networks (adapted)']);
    expect(html).toContain('already converted');
    expect(html).toContain('year_7/Networks');
    expect(html).toContain('Networks (adapted)'); // the existing unit is named
    // the convert-again form re-submits to the same route WITH confirm=1, preserving the chosen slot/date
    expect(html).toContain('hx-post="/schemes/course/3/convert"');
    expect(html).toContain('name="confirm" value="1"');
    expect(html).toContain('name="assign_slot" value="12:5"');
    expect(html).toContain('name="assign_start" value="2026-09-08"');
    // cancel returns to the normal panel
    expect(html).toContain('hx-get="/schemes/course/3/convert-panel"');
  });
});
