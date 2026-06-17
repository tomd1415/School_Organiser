// Phase 12 C3 — import the classroom kit list from a CSV (e.g. a spreadsheet stock-take). Tolerant of
// column order/names; idempotent (re-importing matches existing items by name and updates them, never
// duplicates); LAN-only, no AI. Reuses the dependency-free CSV parser and the whitelisted field setter.
import { parseCsv } from '../lib/csv';
import { createEquipment, findEquipmentByName, updateEquipmentField } from '../repos/equipment';

export interface KitImportResult {
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  skipped: number;
}

const find = (header: string[], re: RegExp): number => header.findIndex((h) => re.test(h.trim()));

export async function importKit(text: string): Promise<KitImportResult> {
  const empty: KitImportResult = { ok: false, message: '', created: 0, updated: 0, skipped: 0 };
  const rows = parseCsv(text);
  if (rows.length < 2) return { ...empty, message: 'Paste a CSV with a header row and at least one item row.' };
  if (rows.length > 1001) return { ...empty, message: 'That looks too large — import up to 1000 items at a time.' };

  const header = rows[0]!;
  const nameIdx = find(header, /^(name|item|equipment|kit)$/i);
  if (nameIdx < 0) {
    return { ...empty, message: 'Could not find a "name" column. Got: ' + header.map((h) => h.trim()).filter(Boolean).join(', ') };
  }
  const catIdx = find(header, /^categ/i);
  const totIdx = find(header, /total|quantity|qty|count|owned|have/i);
  const workIdx = find(header, /work|usable|functioning/i);
  const locIdx = find(header, /location|where|store|cupboard|room/i);
  const notesIdx = find(header, /note|comment|detail/i);
  const tagsIdx = find(header, /tag|label/i);
  const cell = (r: string[], i: number): string => (i >= 0 ? (r[i] ?? '').trim() : '');

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const name = cell(r, nameIdx);
    if (!name) {
      skipped++;
      continue;
    }
    let id = await findEquipmentByName(name);
    if (id == null) {
      id = await createEquipment(name, cell(r, catIdx) || 'other');
      created++;
    } else {
      updated++;
      if (cell(r, catIdx)) await updateEquipmentField(id, 'category', cell(r, catIdx));
    }
    const setIf = async (idx: number, field: string): Promise<void> => {
      const v = cell(r, idx);
      if (idx >= 0 && v !== '') await updateEquipmentField(id as number, field, v);
    };
    await setIf(totIdx, 'qty_total');
    await setIf(workIdx, 'qty_working');
    await setIf(locIdx, 'location');
    await setIf(notesIdx, 'notes');
    await setIf(tagsIdx, 'tags');
  }
  return {
    ok: created + updated > 0,
    message:
      created + updated > 0
        ? `Imported ✓ — ${created} added, ${updated} updated${skipped ? `, ${skipped} skipped (no name)` : ''}.`
        : 'Nothing imported — every row was missing a name.',
    created,
    updated,
    skipped,
  };
}
