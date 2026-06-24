// Shared UI components for the Rail & Stage rebuild (docs/new-ui). Pure `data → HTML` helpers for the
// recurring component vocabulary the SPEC reuses across screens, so each pattern is built once. Most of
// that vocabulary already exists as CSS classes (.badge/.chip/.card/.ws-tab/.tt-dot/.stats-grid); this
// module holds the genuinely-new bits + thin helpers. Route URLs (if any) come from paths.ts.
import { esc } from './esc';

/**
 * A pill+knob on/off switch (SPEC §0 / §3 Settings). Renders a real, keyboard-accessible
 * `<input type="checkbox">` visually styled as a 46×26 pill with a 20px sliding knob (green when on).
 * The checkbox keeps native semantics — the wrapping `<label>` associates the text, clicking the row
 * toggles it, and the caller's `inputAttrs` (e.g. an `hx-post` on `change`) fire exactly as before. This
 * is a re-skin, not a behaviour change.
 *
 * @param label      visible + accessible label text (escaped)
 * @param checked    initial on/off
 * @param inputAttrs extra raw attributes for the `<input>` (hx-*, name, value…). Trusted/internal only.
 * @param labelHtml  optional pre-built rich label HTML used instead of `label` (already escaped/trusted)
 */
export function renderToggle(opts: { label: string; checked: boolean; inputAttrs?: string; labelHtml?: string }): string {
  const { label, checked, inputAttrs = '', labelHtml } = opts;
  return `<label class="toggle-row">
    <span class="toggle-switch">
      <input type="checkbox"${checked ? ' checked' : ''}${inputAttrs ? ' ' + inputAttrs : ''}>
      <span class="toggle-knob" aria-hidden="true"></span>
    </span>
    <span class="toggle-label">${labelHtml ?? esc(label)}</span>
  </label>`;
}
