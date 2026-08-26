/**
 * The class's reference polar, as a lookup.
 *
 * The table is the one the model is calibrated and gated against (ADR 0007).
 * `validation/` reads it from disk; the solver needs the same numbers at
 * runtime to report speed as a percentage of target, so it rides on the boat
 * as `boat.polar`, attached at load time (`src/lib/boat.ts`). Nothing in
 * `src/core` names a class or reaches for a file by path.
 *
 * Pure and deterministic: the interpolation grid is built once per table and
 * memoised against the table object itself, and every lookup is linear
 * interpolation over it. No DOM, no clock.
 *
 * The table is read per sail. A Speed Guide prints a jib and an asymmetric row
 * at every angle from 60° out, and they differ by more than a knot at some of
 * them; comparing a boat under its jib to the kite's number would report a
 * trim fault that is really a sail choice.
 */
import type { BoatDefinition, PolarTable, SailSet } from '../types';
import { interp1 } from '../math';

interface Curve {
  /** Strictly increasing TWA grid, degrees. */
  twaDeg: number[];
  bsKt: number[];
}

interface Grid {
  twsKt: number[];
  curves: Record<SailSet, Curve[]>;
}

/**
 * Built grids, keyed by the table object. A `WeakMap` rather than a module
 * `let`: two boats can be solved in one process (the validation harness does
 * exactly that), and a single cached grid would hand one boat the other's
 * polar. Keying on the object also means no cache invalidation to get wrong.
 */
const GRIDS = new WeakMap<PolarTable, Grid>();

function buildCurve(table: PolarTable, twsKt: number, sail: SailSet): Curve {
  const best = new Map<number, number>();
  for (const r of table.rows) {
    if (r.twsKt !== twsKt || r.sail !== sail) continue;
    best.set(r.twaDeg, Math.max(best.get(r.twaDeg) ?? 0, r.bsKt));
  }
  const twaDeg = [...best.keys()].sort((a, b) => a - b);
  return { twaDeg, bsKt: twaDeg.map((t) => best.get(t)!) };
}

function gridFor(table: PolarTable): Grid {
  const hit = GRIDS.get(table);
  if (hit) return hit;
  const twsKt = table.twsKt;
  const grid: Grid = {
    twsKt,
    curves: {
      jib: twsKt.map((t) => buildCurve(table, t, 'jib')),
      asym: twsKt.map((t) => buildCurve(table, t, 'asym')),
    },
  };
  GRIDS.set(table, grid);
  return grid;
}

/** The TWS columns this boat's guide prints, ascending. Empty when it has no polar. */
export function polarTws(boat: BoatDefinition): readonly number[] {
  return boat.polar?.twsKt ?? [];
}

/** Provenance for anything that quotes a number out of this boat's table. */
export function polarSource(boat: BoatDefinition): PolarTable['source'] | undefined {
  return boat.polar?.source;
}

export interface PolarTarget {
  /** Target boat speed, knots. Zero when the boat has no committed polar. */
  bsKt: number;
  /**
   * True when both TWS and TWA fall inside the printed grid. Outside it the
   * value is the clamped edge of the table, which is an extrapolation and is
   * tiered down accordingly. Always false when there is no polar at all —
   * there is nothing to be inside of.
   */
  inGrid: boolean;
}

/**
 * Target boat speed at a true wind speed and angle, knots.
 *
 * TWA is unsigned: the polar is symmetric about the centreline. Both axes
 * clamp at the edge of the table rather than extrapolating off it; `inGrid`
 * says which side of that line the answer came from. Upwind under the jib
 * that line is the guide's own VMG angle, so pinching past it reads tier C —
 * which is right: the polar says nothing about angles it does not print.
 *
 * A boat with no committed polar returns `{ bsKt: 0, inGrid: false }`. The
 * caller must not draw a percentage from it; `instrumentsFor` reads the zero
 * and reports 0 % at tier C rather than a fabricated target.
 */
export function polarTarget(
  boat: BoatDefinition,
  twsKt: number,
  twaDeg: number,
  sailset: SailSet,
): PolarTarget {
  if (!boat.polar) return { bsKt: 0, inGrid: false };
  const { twsKt: tws, curves } = gridFor(boat.polar);
  if (tws.length === 0) return { bsKt: 0, inGrid: false };
  const twa = Math.abs(twaDeg);
  const c = curves[sailset];
  const perTws = c.map((k) => interp1(k.twaDeg, k.bsKt, twa));
  const bsKt = interp1(tws, perTws, twsKt);
  const lo = interp1(
    tws,
    c.map((k) => k.twaDeg[0]),
    twsKt,
  );
  const hi = interp1(
    tws,
    c.map((k) => k.twaDeg[k.twaDeg.length - 1]),
    twsKt,
  );
  const inGrid = twsKt >= tws[0] && twsKt <= tws[tws.length - 1] && twa >= lo && twa <= hi;
  return { bsKt, inGrid };
}
