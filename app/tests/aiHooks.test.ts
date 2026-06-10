import { describe, expect, it } from 'vitest';
import { taskBreakdownSchema } from '../src/llm/schemas/taskBreakdown';
import { generateResourceSchema } from '../src/llm/schemas/generateResource';

describe('4.6 / 4.7 AI schemas', () => {
  it('task-breakdown parses an array of steps', () => {
    expect(taskBreakdownSchema.safeParse({ steps: ['gather slides', 'photocopy', 'print labels'] }).success).toBe(true);
    expect(taskBreakdownSchema.safeParse({ steps: 'not-an-array' }).success).toBe(false);
  });

  it('generate-resource parses title / filename / content', () => {
    expect(generateResourceSchema.safeParse({ title: 'Binary worksheet', filename: 'binary-ws', content: '# Binary\n...' }).success).toBe(true);
    expect(generateResourceSchema.safeParse({ title: 'x' }).success).toBe(false);
  });
});
