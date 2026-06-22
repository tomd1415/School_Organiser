// HTML-escaping leaf module. Lives on its own (not in html.ts) so nav.ts can use it without an
// html.ts ↔ nav.ts import cycle (html.ts imports from nav.ts). html.ts re-exports `esc` so the many
// `import { esc } from '../lib/html'` call sites keep working.
const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a value for safe interpolation into HTML. */
export function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}
