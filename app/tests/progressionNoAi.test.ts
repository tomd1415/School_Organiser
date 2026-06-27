import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 16A.6 — progression is a pupil-data category that must NEVER reach an AI service. The roll-up,
// repos and routes read only in-app data and render teacher-only PII; none of them call the LLM
// wrapper. This static guard locks that: a future edit that wires the progression paths to AI
// (the one egress chokepoint is llm/client.ts) trips here. (The auto-suggest in 16A.4 likewise
// reads already-computed spec-point results — it sends nothing new to AI.)
const SRC = join(__dirname, '..', 'src');
const FILES = [
  'services/progression.ts',
  'services/progressionParse.ts',
  'services/baseline.ts',
  'repos/progression.ts',
  'repos/baseline.ts',
  'routes/progression.ts',
  'lib/progressionView.ts',
];

describe('progression paths never touch AI', () => {
  it.each(FILES)('%s does not import or call the LLM wrapper', (rel) => {
    const code = readFileSync(join(SRC, rel), 'utf8');
    expect(code).not.toMatch(/llm\/client|callLLM|anthropic|@anthropic/i);
  });
});
