import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Phase 2 guard (docs/UI_SEPARATION_PLAN.md): the view layer must reference back-end route URLs through
// paths.ts, not raw literals. As each view file is migrated, move it from PARTIAL → FULLY_MIGRATED.
const SRC = join(__dirname, '..', 'src');

// Fully migrated: NO raw route-URL literal (a `/path`) may appear in an href / hx-* / action attribute.
const FULLY_MIGRATED = ['lib/lessonView.ts'];

// Partially migrated: only these route-prefix families have been moved onto paths.ts so far.
const PARTIAL: Array<{ file: string; prefixes: string[] }> = [];

const RAW_ROUTE = /(?:hx-(?:post|get|put|delete|patch)|href|action)=["'`]\/[a-z]/g;

describe('paths.ts migration guard', () => {
  for (const file of FULLY_MIGRATED) {
    it(`${file} is fully migrated to paths.ts (no raw route-URL literals)`, () => {
      const raw = readFileSync(join(SRC, file), 'utf8').match(RAW_ROUTE) ?? [];
      expect(raw, `raw route URLs found (use paths.ts): ${raw.join(', ')}`).toEqual([]);
    });
  }

  for (const { file, prefixes } of PARTIAL) {
    it(`${file} uses paths.ts for its migrated families`, () => {
      const code = readFileSync(join(SRC, file), 'utf8');
      const offenders = prefixes.filter((p) => new RegExp(`["'\`]${p.replace(/\//g, '\\/')}`).test(code));
      expect(offenders, `use paths.ts for: ${offenders.join(', ')}`).toEqual([]);
    });
  }
});
