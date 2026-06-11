import { describe, expect, it } from 'vitest';
import { equipmentItem } from '../src/llm/prompts/equipment';
import type { EquipmentRow } from '../src/repos/equipment';

const row = (over: Partial<EquipmentRow>): EquipmentRow => ({
  id: 1,
  name: 'micro:bit v2',
  category: 'physical-computing',
  qtyTotal: null,
  qtyWorking: null,
  location: null,
  notes: null,
  tags: null,
  active: true,
  lastChecked: null,
  ...over,
});

describe('equipmentItem (5.8 — the kit list as a planning input)', () => {
  it('empty inventory injects nothing (prompts unchanged)', () => {
    expect(equipmentItem([])).toEqual([]);
  });

  it('archived items are excluded; one combined item is produced', () => {
    const items = equipmentItem([row({}), row({ id: 2, name: 'OHP', active: false })]);
    expect(items.length).toBe(1);
    expect(items[0]!.text).toContain('micro:bit v2');
    expect(items[0]!.text).not.toContain('OHP');
  });

  it('shows broken counts as "N× (M working)"', () => {
    const items = equipmentItem([row({ qtyTotal: 16, qtyWorking: 14 })]);
    expect(items[0]!.text).toContain('16× (14 working)');
  });

  it('uncounted kit reads as a class set; location and notes ride along', () => {
    const items = equipmentItem([row({ location: 'cupboard B', notes: 'needs 2xAAA' })]);
    expect(items[0]!.text).toContain('class set, uncounted');
    expect(items[0]!.text).toContain('cupboard B; needs 2xAAA');
  });

  it('tells the model to flag missing kit rather than assume it', () => {
    const items = equipmentItem([row({})]);
    expect(items[0]!.text).toContain('say so explicitly');
  });
});
