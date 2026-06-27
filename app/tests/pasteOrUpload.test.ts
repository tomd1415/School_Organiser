import { describe, expect, it } from 'vitest';
import { PASTE_OR_UPLOAD_SCRIPT, renderPasteOrUpload } from '../src/lib/pasteOrUpload';

// 17.6 — the reusable paste-or-upload component contract.
describe('renderPasteOrUpload', () => {
  it('renders a focusable drop zone with a named file input', () => {
    const html = renderPasteOrUpload({ name: 'archive', accept: '.zip,.docx', label: 'Drop a unit' });
    expect(html).toContain('class="paste-or-upload"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('type="file" name="archive"');
    expect(html).toContain('accept=".zip,.docx"');
    expect(html).toContain('Drop a unit');
    expect(html).toContain('aria-live="polite"'); // status region
  });

  it('adds a textarea only when textName is given', () => {
    expect(renderPasteOrUpload({}).includes('pou-text')).toBe(false);
    expect(renderPasteOrUpload({ textName: 'email', textPlaceholder: 'paste the email' })).toContain('name="email"');
  });

  it('supports multiple + escapes its inputs', () => {
    const html = renderPasteOrUpload({ multiple: true, label: '<x>' });
    expect(html).toContain(' multiple');
    expect(html).toContain('&lt;x&gt;');
  });

  it('the shared client script is valid JS and wires the class', () => {
    expect(() => new Function(PASTE_OR_UPLOAD_SCRIPT)).not.toThrow();
    expect(PASTE_OR_UPLOAD_SCRIPT).toContain('.paste-or-upload');
    expect(PASTE_OR_UPLOAD_SCRIPT).toContain('DataTransfer');
  });
});
