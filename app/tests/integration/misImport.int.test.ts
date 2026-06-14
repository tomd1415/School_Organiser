import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { importRoster } from '../../src/services/misImport';

// Phase 10.26 — MIS CSV import against the dev DB. Creates pupils/classes/enrolments, idempotent on
// re-import. ZZI-prefixed test data, cleaned up.
async function purge(): Promise<void> {
  await pool.query(`DELETE FROM enrolments WHERE group_id IN (SELECT id FROM groups WHERE name = 'ZZIGRP')`);
  await pool.query(`DELETE FROM enrolments WHERE pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZI %')`);
  await pool.query(`DELETE FROM pupils WHERE display_name LIKE 'ZZI %'`);
  await pool.query(`DELETE FROM groups WHERE name = 'ZZIGRP'`);
}

beforeAll(purge);
afterAll(async () => {
  await purge();
  await pool.end();
});

describe('MIS roster import (integration)', () => {
  const CSV = 'Forename,Surname,Class\nZZI,Alpha,ZZIGRP\nZZI,Beta,ZZIGRP\n';

  it('creates pupils, the class and enrolments from a Forename/Surname/Class export', async () => {
    const r = await importRoster(CSV);
    expect(r.ok).toBe(true);
    expect(r.pupilsCreated).toBe(2);
    expect(r.groupsCreated).toBe(1);
    expect(r.enrolments).toBe(2);
    const enrolled = await pool.query(`SELECT 1 FROM enrolments e JOIN groups g ON g.id = e.group_id WHERE g.name = 'ZZIGRP' AND e.active`);
    expect(enrolled.rowCount).toBe(2);
  });

  it('is idempotent — re-importing matches by name, no duplicates', async () => {
    const r = await importRoster(CSV);
    expect(r.pupilsCreated).toBe(0);
    expect(r.pupilsMatched).toBe(2);
    expect(r.groupsCreated).toBe(0);
    expect((await pool.query(`SELECT count(*)::int n FROM pupils WHERE display_name LIKE 'ZZI %'`)).rows[0]!.n).toBe(2);
  });

  it('rejects a CSV missing the required columns', async () => {
    const r = await importRoster('Foo,Bar\nx,y\n');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/name column|class\/group/i);
  });
});
