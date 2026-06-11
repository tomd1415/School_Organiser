// Phase 5.8: the kit list as a planning input. One context item summarising the active inventory,
// added to every AI planning feature so practical work is planned within the kit we actually own.
// Travels via context[] like all inputs (audited; name-scanned by the standard boundary).
import type { EquipmentRow } from '../../repos/equipment';
import type { RedactableItem } from '../../services/redact';

function qty(e: EquipmentRow): string {
  if (e.qtyTotal == null && e.qtyWorking == null) return 'class set, uncounted';
  if (e.qtyWorking != null && e.qtyTotal != null && e.qtyWorking < e.qtyTotal) {
    return `${e.qtyTotal}× (${e.qtyWorking} working)`;
  }
  return `${e.qtyWorking ?? e.qtyTotal}×`;
}

/** 0 or 1 items: empty inventory injects nothing, so prompts are unchanged until kit is entered. */
export function equipmentItem(rows: EquipmentRow[]): RedactableItem[] {
  const active = rows.filter((r) => r.active);
  if (active.length === 0) return [];
  const lines = active.map((e) => {
    const extras = [e.location, e.notes].filter(Boolean).join('; ');
    return `- ${e.name} — ${qty(e)}${extras ? ` (${extras})` : ''}`;
  });
  return [
    {
      text:
        'EQUIPMENT AVAILABLE IN THE ROOM — plan any practical work within this list; if a lesson ' +
        'would need something not listed, say so explicitly instead of assuming it:\n' +
        lines.join('\n'),
    },
  ];
}
