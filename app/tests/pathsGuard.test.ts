import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Phase 2 guard (docs/UI_SEPARATION_PLAN.md): the view layer references back-end route URLs through
// paths.ts, never as raw literals. EVERY `src/lib/*View.ts` is now fully migrated, so the guard auto-covers
// all of them — a new view file must use paths.ts (or be added to the exceptions below with a reason).
const LIB = join(__dirname, '..', 'src', 'lib');
const VIEW_FILES = readdirSync(LIB)
  .filter((f) => f.endsWith('View.ts'))
  .map((f) => `lib/${f}`);

// Files exempted from the guard (none today). Add with a one-line reason if a view legitimately needs a raw
// literal — prefer adding a builder to paths.ts instead.
const EXCEPT = new Set<string>([]);
const FULLY_MIGRATED = VIEW_FILES.filter((f) => !EXCEPT.has(f));

// (1) No raw route URL DIRECTLY in an attribute value.
const RAW_ROUTE_ATTR = /(?:hx-(?:post|get|put|delete|patch)|href|action)=["'`]\/[a-z]/g;

// (2) No route-URL string literal ANYWHERE — also catches INDIRECTED uses the attribute check misses:
// `const href = \`/lesson?…\``, a URL passed as an argument (`renderPrepList(prep, '/prep', …)`), or a
// ternary. A quoted string that starts with `/<lowercase-word>` is a back-end route; relative imports
// start with `.` (not `/`) and asset paths are filtered out below.
const ROUTE_LITERAL = /["'`]\/[a-z][a-zA-Z0-9-]*(?:[/?][^"'`]*)?["'`]/g;
const ASSET = /\.(css|js|mjs|svg|png|ico|woff2?|map)["'`]$/;

describe('paths.ts migration guard', () => {
  for (const file of FULLY_MIGRATED) {
    const code = readFileSync(join(LIB, '..', file), 'utf8');

    it(`${file}: no raw route URL in an attribute`, () => {
      const raw = code.match(RAW_ROUTE_ATTR) ?? [];
      expect(raw, `use paths.ts: ${raw.join(', ')}`).toEqual([]);
    });

    it(`${file}: no route-URL string literal (incl. indirected / arg-passed)`, () => {
      const hits = (code.match(ROUTE_LITERAL) ?? []).filter((m) => !ASSET.test(m));
      expect(hits, `route URL literal(s) — add a paths.ts builder: ${hits.join(', ')}`).toEqual([]);
    });
  }

  it('covers every src/lib/*View.ts (sanity: the glob found files)', () => {
    expect(VIEW_FILES.length).toBeGreaterThan(20);
  });
});
