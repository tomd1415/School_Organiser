import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { importKit } from '../../src/services/kitImport';
import { findEquipmentByName, listEquipment } from '../../src/repos/equipment';

const NAME = 'TEST-KIT micro:bit v2';

describe('kit CSV import (C3 — integration, needs the dev DB up)', () => {
  afterAll(async () => {
    await pool.query(`DELETE FROM equipment WHERE name LIKE 'TEST-KIT %'`);
    await pool.end();
  });

  it('creates items from a CSV, tolerant of column names', async () => {
    const csv = `name,category,total,working,location\n${NAME},physical-computing,16,14,cupboard B\nTEST-KIT Crumble,robotics,12,,trolley 2\n`;
    const r = await importKit(csv);
    expect(r.ok).toBe(true);
    expect(r.created).toBe(2);
    const id = await findEquipmentByName(NAME);
    expect(id).not.toBeNull();
    const mb = (await listEquipment(true)).find((e) => e.name === NAME)!;
    expect(mb.qtyTotal).toBe(16);
    expect(mb.qtyWorking).toBe(14);
    expect(mb.location).toBe('cupboard B');
  });

  it('is idempotent — re-importing matches by name and updates, never duplicates', async () => {
    const before = (await listEquipment(true)).filter((e) => e.name.startsWith('TEST-KIT')).length;
    const r = await importKit(`name,total,working\n${NAME},16,10\n`);
    expect(r.created).toBe(0);
    expect(r.updated).toBe(1);
    const after = (await listEquipment(true)).filter((e) => e.name.startsWith('TEST-KIT'));
    expect(after.length).toBe(before); // no new rows
    expect(after.find((e) => e.name === NAME)!.qtyWorking).toBe(10); // updated in place
  });

  it('rejects a CSV with no name column', async () => {
    const r = await importKit('colour,size\nred,big\n');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/name/i);
  });
});
