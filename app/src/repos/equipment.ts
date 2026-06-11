// Phase 5.8: SQL for the classroom kit list. Thin functions over pg, matching the house style.
import { pool } from '../db/pool';

export interface EquipmentRow {
  id: number;
  name: string;
  category: string;
  qtyTotal: number | null;
  qtyWorking: number | null;
  location: string | null;
  notes: string | null;
  tags: string | null;
  active: boolean;
  lastChecked: string | null;
}

const COLS = `id, name, category, qty_total AS "qtyTotal", qty_working AS "qtyWorking",
              location, notes, tags, active, to_char(last_checked, 'YYYY-MM-DD') AS "lastChecked"`;

export async function listEquipment(includeArchived = false): Promise<EquipmentRow[]> {
  const { rows } = await pool.query<EquipmentRow>(
    `SELECT ${COLS} FROM equipment ${includeArchived ? '' : 'WHERE active'} ORDER BY category, name, id`,
  );
  return rows;
}

export async function listActiveEquipment(): Promise<EquipmentRow[]> {
  return listEquipment(false);
}

export async function createEquipment(name: string, category = 'other'): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO equipment (name, category) VALUES ($1, $2) RETURNING id`,
    [name.slice(0, 200), category.slice(0, 50)],
  );
  return rows[0]!.id;
}

const FIELDS: Record<string, string> = {
  name: 'name',
  category: 'category',
  qty_total: 'qty_total',
  qty_working: 'qty_working',
  location: 'location',
  notes: 'notes',
  tags: 'tags',
};

/** Autosave one field (whitelisted). Numeric fields coerce '' → NULL. */
export async function updateEquipmentField(id: number, field: string, value: string | null): Promise<boolean> {
  const col = FIELDS[field];
  if (!col) return false;
  let v: string | number | null = value && value.trim() !== '' ? value.trim() : null;
  if ((col === 'qty_total' || col === 'qty_working') && v !== null) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return false;
    v = Math.floor(n);
  }
  await pool.query(`UPDATE equipment SET ${col} = $2, updated_at = now() WHERE id = $1`, [id, v]);
  return true;
}

export async function setEquipmentActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE equipment SET active = $2, updated_at = now() WHERE id = $1`, [id, active]);
}

/** The one-click stock-take stamp. */
export async function markEquipmentChecked(id: number, isoDate: string): Promise<void> {
  await pool.query(`UPDATE equipment SET last_checked = $2, updated_at = now() WHERE id = $1`, [id, isoDate]);
}
