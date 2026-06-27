// 15.2a — the planner's gesture→operation resolution, extracted out of the inline DRAG_SCRIPT into a
// PURE, unit-tested module. The page script (routes/planner.ts) injects these functions' source via
// `.toString()` and becomes a thin adapter: read the DOM into a plain state object, call resolve, POST
// the result. Authoring the branching once — and testing every gesture in node — means the drag logic
// is no longer untested client-only code. Written in deliberately plain JS (no `?.`/`??`, no TS-only
// syntax) so the emitted `.toString()` is valid browser JS whatever the compile target.

export interface PlannerDragState {
  dragPlan: string | null; // a lesson plan id being dragged (tray lesson OR a placed lesson)
  dragUnit: string | null; // a whole-unit drag (the unit header)
  fromDate: string | null; // set only when the drag SOURCE is a placed lesson (a move)
  fromTll: string | null;
}

export interface PlannerTarget {
  date: string | null; // the target cell's date
  tll: string | null; // the target cell's weekly-slot id
  isNone: boolean; // a `.pl-none` cell (no lesson that week) — never a drop target
}

export interface PlannerOp {
  op: string;
  params: Record<string, string>;
}

/**
 * Resolve a DROP onto a planner cell into the /planner/place op + params, or null for a no-op.
 *  - whole-unit drag onto a slot           → { op:'unit',   unit, date, tll }
 *  - placed lesson dragged to another slot  → { op:'move',   plan, date, tll, fromDate, fromTll }
 *  - tray lesson dropped onto a slot        → { op:'insert', plan, date, tll }   (cascade is server-side)
 *  - drop onto a `.pl-none`/invalid cell, or with no drag payload → null (no-op)
 */
export function resolvePlannerDrop(drag: PlannerDragState, target: PlannerTarget): PlannerOp | null {
  if (target == null || target.isNone || target.date == null || target.tll == null) return null;
  if (drag.dragUnit != null && drag.dragUnit !== '') {
    return { op: 'unit', params: { unit: drag.dragUnit, date: target.date, tll: target.tll } };
  }
  if (drag.dragPlan != null && drag.dragPlan !== '') {
    if (drag.fromDate != null && drag.fromDate !== '') {
      return {
        op: 'move',
        params: {
          plan: drag.dragPlan,
          date: target.date,
          tll: target.tll,
          fromDate: drag.fromDate,
          fromTll: drag.fromTll == null ? '' : drag.fromTll,
        },
      };
    }
    return { op: 'insert', params: { plan: drag.dragPlan, date: target.date, tll: target.tll } };
  }
  return null;
}

/**
 * Resolve an in-cell ACTION button (✕ pull / 🔓 lock / 🔒 unlock) into its op + params, or null when the
 * cell has no date/slot. The action keyword comes straight from the button's `data-pl-act`.
 */
export function resolvePlannerAct(act: string | null, cell: { date: string | null; tll: string | null }): PlannerOp | null {
  if (act !== 'pull' && act !== 'lock' && act !== 'unlock') return null;
  if (cell == null || cell.date == null || cell.tll == null) return null;
  return { op: act, params: { date: cell.date, tll: cell.tll } };
}
