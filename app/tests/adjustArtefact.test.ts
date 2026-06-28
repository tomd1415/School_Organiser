import { describe, it, expect } from 'vitest';
import { isValidArtefact } from '../src/services/adjustArtefact';
import { ADJUST_SYSTEM, adjustContext, adjustInstruction } from '../src/llm/prompts/adjustArtefact';

// docs/ADJUST_WITH_AI_PLAN.md #6. The privacy-critical guarantee is structural: inputs travel via
// context[]/instruction (which the wrapper redacts + audits), NEVER the static system string. And a
// returned artefact is validated before it can be applied.

describe('adjust with AI — validation gate (#6)', () => {
  it('a worksheet with answerable fields is valid; empty / prose-only is not', () => {
    expect(isValidArtefact('worksheet', '| Q | Type your answer here |\n|---|---|\n| Why? | |\n')).toBe(true);
    expect(isValidArtefact('worksheet', '')).toBe(false);
    expect(isValidArtefact('worksheet', 'just some prose with no questions at all')).toBe(false);
  });
  it('a slide deck needs a "# title" and at least one "## slide"', () => {
    expect(isValidArtefact('slides', '# Deck\n\n## Slide one\n- a point\n')).toBe(true);
    expect(isValidArtefact('slides', '## a slide but no deck title\n')).toBe(false);
    expect(isValidArtefact('slides', '')).toBe(false);
  });
});

describe('adjust with AI — privacy-safe request shape (#6)', () => {
  it('the system prompt is STATIC — no artefact/instruction baked in', () => {
    expect(ADJUST_SYSTEM).toContain('TEACHING CONTEXT');
    expect(ADJUST_SYSTEM).toContain('NEVER name or describe an individual pupil');
    expect(ADJUST_SYSTEM).not.toContain('What is RAM?'); // proves no input content lives in system
  });
  it('the artefact + cohort context go in context[]; the teacher request goes in the instruction', () => {
    const artefact = '| Q | Type your answer here |\n|---|---|\n| What is RAM? | |\n';
    const ctx = adjustContext(artefact, 'Year 9, mixed ability');
    expect(ctx[0]!.text).toContain('What is RAM?');                 // artefact → context (redacted by the wrapper)
    expect(ctx.some((c) => c.text.includes('Year 9'))).toBe(true); // cohort context → context
    const instr = adjustInstruction('worksheet', 'make the Support level easier');
    expect(instr).toContain('make the Support level easier');       // teacher request → instruction (also redacted)
    expect(instr.toLowerCase()).toContain('worksheet');
  });
});
