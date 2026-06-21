import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(join(__dirname, '..', 'public', 'styles-overhaul.css'), 'utf8');

describe('next-shell dark theme compatibility', () => {
  it('defines the aliases used by incrementally migrated views', () => {
    for (const declaration of [
      '--card-bg: var(--surface)',
      '--bg-color: var(--bg-soft)',
      '--text-color: var(--text)',
      '--text-muted: var(--muted)',
      '--border-color: var(--line)',
    ]) {
      expect(CSS).toContain(declaration);
    }
  });

  it('keeps contrast and legacy compatibility rules scoped to the next shell', () => {
    expect(CSS).toContain(':root[data-theme="contrast"]:has(body[data-shell="next"])');
    expect(CSS).toContain('body[data-shell="next"] .search-panel');
    expect(CSS).toContain('body[data-shell="next"] .ped-card');
    expect(CSS).toContain('body[data-shell="next"] .ws-input');
  });

  it.each(['email', 'number', 'date', 'time', 'datetime-local', 'url', 'tel'])(
    'themes %s controls',
    (type) => {
      expect(CSS).toContain(`body[data-shell="next"] input[type="${type}"]`);
      expect(CSS).toContain(`body[data-shell="next"] input[type="${type}"]:focus`);
    },
  );
});
