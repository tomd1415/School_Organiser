import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// TEST-LAB-GUARD tripwire. The Test Lab isolation (migration 0062) relies on EVERY SQL read that SCANS the
// occurrence tables by group/slot/date excluding test runs with `AND NOT o.is_test`. Reads scoped to a
// single occurrence / occurrence_course id are safe without it. This DB-free test scans the source for any
// query that reads lesson_occurrences / occurrence_courses, is NOT a single-id lookup, and lacks the
// guard — so a future query can't silently leak a Test Lab run into real marking / planner / history / AI
// context. If you add a genuinely-safe scan, add it to ALLOW with a reason.

const SRC = join(__dirname, '..', 'src');

// repos/testLab.ts IS the teardown — it is SUPPOSED to operate on is_test occurrences.
const EXCLUDE_FILES = new Set(['testLab.ts']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith('.ts') && !EXCLUDE_FILES.has(name) ? [p] : [];
  });
}

// SQL string literals (backtick templates).
function templates(code: string): string[] {
  return code.match(/`[^`]*`/gs) ?? [];
}

const READS_OCC = /(FROM|JOIN)\s+(lesson_occurrences|occurrence_courses)\b/i;
// Scoped to one occurrence/oc id (or a count of marks for one) ⇒ a test row can't be reached by id.
const BY_SINGLE_ID = /\b(oc|o|lo)\.id\s*=\s*\$|\boccurrence_id\s*=\s*\$|\boccurrence_course_id\s*=\s*\$|\bid\s*=\s*\$/i;

// Genuinely-safe scans that don't fit the "by single id" shape. Keep tiny + justified.
const ALLOW: Array<{ file: string; includes: string; why: string }> = [
  {
    file: 'marking.ts',
    includes: 'DELETE FROM marking_queue WHERE occurrence_course_id IN',
    why: 'reconcile DELETE on course deactivation — clearing a test run\'s queued job too is harmless (it is wiped regardless), and it writes nothing real.',
  },
];

describe('Test Lab guard — no unguarded occurrence scan', () => {
  it('every occurrence-scanning query excludes is_test (or is a single-id lookup)', () => {
    const offenders: Array<{ file: string; snippet: string }> = [];
    for (const file of walk(SRC)) {
      const code = readFileSync(file, 'utf8');
      for (const t of templates(code)) {
        if (!READS_OCC.test(t)) continue;
        if (/is_test/i.test(t)) continue; // guarded
        if (BY_SINGLE_ID.test(t)) continue; // scoped to one occurrence/oc
        const rel = file.slice(SRC.length);
        if (ALLOW.some((a) => rel.endsWith(a.file) && t.includes(a.includes))) continue;
        offenders.push({ file: rel, snippet: t.replace(/\s+/g, ' ').trim().slice(0, 140) });
      }
    }
    expect(offenders, `unguarded occurrence scan(s) — add "AND NOT o.is_test" or ALLOW:\n${JSON.stringify(offenders, null, 2)}`).toHaveLength(0);
  });
});
