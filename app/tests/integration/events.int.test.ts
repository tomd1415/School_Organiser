import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createEvent, listUpcoming, setEventStatus, updateEventField } from '../../src/repos/events';

const created: number[] = [];

describe('events (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (created.length) await pool.query(`DELETE FROM events WHERE id = ANY($1)`, [created]);
    await pool.end();
  });

  it('creates, edits and completes an event', async () => {
    const id = await createEvent();
    created.push(id);
    expect((await listUpcoming()).some((e) => e.id === id)).toBe(true);

    await updateEventField(id, 'title', 'Y10 parents evening');
    await updateEventField(id, 'kind', 'parents_evening');
    await updateEventField(id, 'affects_availability', 'true');
    await updateEventField(id, 'lead_days', '5');

    const e = (await listUpcoming()).find((x) => x.id === id);
    expect(e?.title).toBe('Y10 parents evening');
    expect(e?.kind).toBe('parents_evening');
    expect(e?.affectsAvailability).toBe(true);
    expect(e?.leadDays).toBe(5);

    await setEventStatus(id, 'done');
    expect((await listUpcoming()).some((x) => x.id === id)).toBe(false);
  });

  it('rejects an invalid kind', async () => {
    const id = created[0]!;
    expect(await updateEventField(id, 'kind', 'nonsense')).toBe(false);
  });
});
