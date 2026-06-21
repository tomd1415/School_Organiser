import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(join(__dirname, '..', 'public', 'styles.css'), 'utf8');
const CLASSIC_CSS = CSS;

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

  it('renders lesson objectives as a readable dark semantic surface', () => {
    expect(CSS).toMatch(
      /body\[data-shell="next"\] \.oc-block\.oc-objectives,[\s\S]{0,220}background: var\(--green-soft\) !important;[\s\S]{0,120}color: var\(--text\) !important;/,
    );
  });

  it('lets the redesigned board own the full viewport', () => {
    expect(CSS).toMatch(/body\[data-shell="next"\] \.presentation \{[\s\S]{0,260}position: fixed !important;[\s\S]{0,260}width: 100vw !important;[\s\S]{0,120}height: 100vh !important;/);
    expect(CSS).toMatch(/body\[data-shell="next"\] \.present-slide \{[\s\S]{0,180}width: 100% !important;[\s\S]{0,100}max-width: none !important;/);
  });

  it('keeps the standalone projector presenter full-screen and dark', () => {
    expect(CLASSIC_CSS).toMatch(/body\.deck \{[\s\S]{0,180}background: #080b12;/);
    expect(CLASSIC_CSS).toMatch(/\.deck-slide \{[\s\S]{0,220}width: 100vw;[\s\S]{0,80}height: 100vh;/);
    expect(CLASSIC_CSS).toContain('.deck-slide.deck-current { display: grid; }');
    expect(CLASSIC_CSS).not.toMatch(/\.deck-slide \{[^}]*background:\s*#fff/);
  });

  it.each(['email', 'number', 'date', 'time', 'datetime-local', 'url', 'tel'])(
    'themes %s controls',
    (type) => {
      expect(CSS).toContain(`body[data-shell="next"] input[type="${type}"]`);
      expect(CSS).toContain(`body[data-shell="next"] input[type="${type}"]:focus`);
    },
  );
});
