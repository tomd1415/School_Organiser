import { describe, it, expect } from 'vitest';
import { noteItems, noteRouteInstruction, NOTE_ROUTE_VERSION } from '../src/llm/prompts/noteRoute';
import { noteRouteSchema } from '../src/llm/schemas/noteRoute';

const dest = { kind: 'task', title: 't', summary: 's', urgency: null, eventKind: null, dateIso: null, category: null, groupName: null };

describe('note_route prompt + schema (idea 12)', () => {
  it('noteItems wraps the text as one context item', () => {
    expect(noteItems('call home about 8PFA')).toEqual([{ text: 'NOTE TO FILE:\ncall home about 8PFA' }]);
  });

  it('instruction carries the date and the class names', () => {
    const s = noteRouteInstruction('2026-06-14', ['8PFA', '9X']);
    expect(s).toContain('2026-06-14');
    expect(s).toContain('8PFA, 9X');
  });

  it('schema accepts 1–3 destinations and rejects empty or >3', () => {
    expect(noteRouteSchema.safeParse({ destinations: [dest], reason: 'x' }).success).toBe(true);
    expect(noteRouteSchema.safeParse({ destinations: [], reason: 'x' }).success).toBe(false);
    expect(noteRouteSchema.safeParse({ destinations: [dest, dest, dest, dest], reason: 'x' }).success).toBe(false);
  });

  it('version tag is note_route@1', () => {
    expect(NOTE_ROUTE_VERSION).toBe('note_route@1');
  });
});
