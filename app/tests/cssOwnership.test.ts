import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Phase 4 (docs/UI_SEPARATION_PLAN.md): the 3 sheets are layered base → theme on purpose, so a general
// "class defined in two sheets" check is meaningless here (the overlap is the light-structure / dark-theme
// pairing). What IS worth guarding is the one thing Phase 4 centralised: the WIDTH-INTENT system must stay
// single-source so page width can't drift back to a per-component-class lottery.
const PUB = join(__dirname, '..', 'public');
const styles = readFileSync(join(PUB, 'styles.css'), 'utf8');
const widgets = readFileSync(join(PUB, 'styles-base-widgets.css'), 'utf8');
const base = readFileSync(join(PUB, 'styles-base.css'), 'utf8');

describe('CSS width-intent ownership', () => {
  it('defines all four width-intent tiers, in styles.css only', () => {
    for (const tier of ['reading', 'working', 'wide', 'full']) {
      expect(styles, `cockpit-w-${tier} must be defined in styles.css`).toContain(`cockpit-w-${tier} >`);
    }
  });

  it('does not re-define the width-intent classes in the base/widget sheets (single source)', () => {
    expect(widgets).not.toContain('cockpit-w-');
    expect(base).not.toContain('cockpit-w-');
  });

  it('keeps the width values single-source (one max-width per tier in the intent block)', () => {
    const count = (re: RegExp) => (styles.match(re) ?? []).length;
    expect(count(/cockpit-w-reading > \* \{ max-width: 800px/g)).toBe(1);
    expect(count(/cockpit-w-working > \* \{ max-width: 1180px/g)).toBe(1);
    expect(count(/cockpit-w-wide > \* +\{ max-width: 1540px/g)).toBe(1);
    expect(count(/cockpit-w-full > \* +\{ max-width: none/g)).toBe(1);
  });
});
