/**
 * The committed ORC Speed Guide polar, as a lookup.
 *
 * `data/polar/orc-j70.json` is the reference table the model is calibrated
 * and gated against (ADR 0007). `validation/` reads it from disk; the solver
 * needs the same numbers at runtime to report speed as a percentage of
 * target, so it is imported here as data.
 *
 * Pure and deterministic: the table is built once from the committed file,
 * and every lookup is linear interpolation over it. No DOM, no clock.
 *
 * The table is read per sail. The guide prints a jib and an asymmetric row at
 * every angle from 60° out, and they differ by more than a knot at some of
 * them; comparing a boat under its jib to the kite's number would report a
 * trim fault that is really a sail choice.
 */
import polarJson from '../../../data/polar/orc-j70.json';
import type { SailSet } from '../types';
import { interp1 } from '../math';

interface RawRow {
  twsKt: number;
  sail: SailSet;
  twaDeg: number;
  bsKt: number;
}

interface Curve {
  /** Strictly increasing TWA grid, degrees. */
  twaDeg: number[];
  bsKt: number[];
}

/** The TWS columns the guide prints, ascending. */
export const POLAR_TWS: readonly number[] = polarJson.twsKt;

/** Provenance for anything that quotes a number out of this table. */
export const POLAR_SOURCE = polarJson.source;

function buildCurve(twsKt: number, sail: SailSet): Curve {
  const best = new Map<number, number>();
  for (const r of polarJson.rows as RawRow[]) {
    if (r.twsKt !== twsKt || r.sail !== sail) continue;
    best.set(r.twaDeg, Math.max(best.get(r.twaDeg) ?? 0, r.bsKt));
  }
  const twaDeg = [...best.keys()].sort((a, b) => a - b);
  return { twaDeg, bsKt: twaDeg.map((t) => best.get(t)!) };
}

const CURVES: Record<SailSet, Curve[]> = {
  jib: POLAR_TWS.map((t) => buildCurve(t, 'jib')),
  asym: POLAR_TWS.map((t) => buildCurve(t, 'asym')),
};

export interface PolarTarget {
  /** Target boat speed, knots. */
  bsKt: number;
  /**
   * True when both TWS and TWA fall inside the printed grid. Outside it the
   * value is the clamped edge of the table, which is an extrapolation and is
   * tiered down accordingly.
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
 */
export function polarTarget(twsKt: number, twaDeg: number, sailset: SailSet): PolarTarget {
  const twa = Math.abs(twaDeg);
  const curves = CURVES[sailset];
  const perTws = curves.map((c) => interp1(c.twaDeg, c.bsKt, twa));
  const bsKt = interp1(POLAR_TWS as number[], perTws, twsKt);
  const lo = interp1(
    POLAR_TWS as number[],
    curves.map((c) => c.twaDeg[0]),
    twsKt,
  );
  const hi = interp1(
    POLAR_TWS as number[],
    curves.map((c) => c.twaDeg[c.twaDeg.length - 1]),
    twsKt,
  );
  const inGrid =
    twsKt >= POLAR_TWS[0] && twsKt <= POLAR_TWS[POLAR_TWS.length - 1] && twa >= lo && twa <= hi;
  return { bsKt, inGrid };
}
