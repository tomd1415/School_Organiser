import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  createWorkBlock,
  deleteWorkBlock,
  getDaySlots,
  getLeaveMinutes,
  getWorkBlock,
  listWorkBlocks,
  setWorkBlockStatus,
  updateWorkBlockField,
} from '../../src/repos/workBlocks';

const created: number[] = [];
const DATE = '2099-04-04';

describe('work blocks + day slots (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    for (const id of created) await deleteWorkBlock(id);
    await pool.end();
  });

  it('reads the day slots (incl. coffee + after-school) and the leave time', async () => {
    const slots = await getDaySlots(4); // Thursday
    expect(slots.length).toBe(13);
    expect(slots.some((s) => s.slotType === 'after_school')).toBe(true);
    expect(slots.some((s) => s.label === 'Coffee')).toBe(true);
    expect(await getLeaveMinutes()).toBeGreaterThan(0);
  });

  it('logs a block, edits planned/actual, and diverts it', async () => {
    const id = await createWorkBlock(DATE);
    created.push(id);
    await updateWorkBlockField(id, 'planned_note', 'Mark Y10 assessment');
    await updateWorkBlockField(id, 'actual_note', 'Pupil pastoral, did not mark');
    await setWorkBlockStatus(id, 'diverted');
    const b = await getWorkBlock(id);
    expect(b?.plannedNote).toBe('Mark Y10 assessment');
    expect(b?.actualNote).toContain('pastoral');
    expect(b?.status).toBe('diverted');
    expect((await listWorkBlocks(DATE)).some((x) => x.id === id)).toBe(true);
  });
});
