import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Regression: in the dark "next" shell, the blanket `button[type="submit"]` primary rule force-sets
// `color: #0b1320 !important` (dark ink, for contrast against the teal fill). A secondary/ghost submit
// button (`<button type="submit" class="btn-secondary">`, used in ~15 views) then has its FILL reset to
// transparent — but if its colour isn't also reset it keeps the dark ink and renders invisible
// (dark-on-dark). The visible symptom was the worksheet/resource action buttons (Upload, Generate, etc.)
// and the Schemes convert/lay-down/author/import buttons. Guard the cascade fix.
const styles = readFileSync(join(__dirname, '..', 'public', 'styles.css'), 'utf8');

describe('dark-shell secondary/ghost buttons stay readable', () => {
  // The override block that resets the fill to transparent for secondary/ghost/link buttons. We pin on the
  // whole rule so the test breaks if someone re-adds the transparent reset without the colour reset.
  const secondaryRule =
    styles.match(
      /body\[data-shell="next"\] \.button\.ghost,[\s\S]*?body\[data-shell="next"\] button\.link \{[\s\S]*?\}/,
    )?.[0] ?? '';

  it('finds the secondary/ghost transparent-fill rule', () => {
    expect(secondaryRule, 'the .btn-secondary/.button.ghost transparent-fill rule must exist').toContain(
      'background: transparent !important',
    );
  });

  it('resets the inherited dark submit-button ink to readable light text', () => {
    // Must NOT leave the dark #0b1320 ink in force (that is the invisible-on-dark bug); must set a
    // readable foreground via the theme token.
    expect(secondaryRule).toContain('color: var(--text) !important');
  });

  it('drops the inherited teal primary border so the button reads as secondary, not a CTA', () => {
    // button[type="submit"] also forces border-color:var(--teal); a secondary button must reset it.
    expect(secondaryRule).toContain('border-color: var(--line-strong) !important');
  });

  it('keeps the hover neutral (the primary submit :hover would otherwise force teal fill)', () => {
    expect(styles).toMatch(
      /body\[data-shell="next"\] \.btn-secondary:hover[\s\S]*?background: var\(--surface-2\) !important/,
    );
  });

  it('keeps link-styled buttons flat on the teal accent (like <a class="link">), no box', () => {
    const linkRule =
      styles.match(
        /body\[data-shell="next"\] button\.link,\s*body\[data-shell="next"\] button\.link:hover \{[\s\S]*?\}/,
      )?.[0] ?? '';
    expect(linkRule).toContain('color: var(--accent) !important');
    expect(linkRule).toContain('border-color: transparent !important');
  });
});
