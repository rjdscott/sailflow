/**
 * Named points of sail: the primary angle control on Race (ux-01 M-01).
 *
 * The three reaches are conventional fixed angles. Close-hauled and Run are
 * whatever the VPP says is fastest towards the mark at this wind speed, so
 * their `twaDeg` here is only the nominal band centre — the fallback shown
 * while the solve runs, and the angle the band matching uses.
 */
import type { SailSet } from '../../core/types';

export interface PointOfSail {
  id: string;
  label: string;
  sailset: SailSet;
  /** prov: assumed, conventional named angles. Nominal for the two optimal ones. */
  twaDeg: number;
  /** Set means `twaDeg` is nominal: the real angle comes from a VMG solve. */
  optimal?: 'upwind' | 'downwind';
}

export const POINTS_OF_SAIL: PointOfSail[] = [
  { id: 'close-hauled', label: 'Close-hauled', sailset: 'jib', twaDeg: 40, optimal: 'upwind' },
  { id: 'close-reach', label: 'Close reach', sailset: 'jib', twaDeg: 60 },
  { id: 'beam-reach', label: 'Beam reach', sailset: 'jib', twaDeg: 90 },
  { id: 'broad-reach', label: 'Broad reach', sailset: 'asym', twaDeg: 135 },
  { id: 'run', label: 'Run', sailset: 'asym', twaDeg: 165, optimal: 'downwind' },
];

/**
 * The chip a given TWA belongs to: nearest nominal angle, ties to the tighter
 * one. Bands are the midpoints — Close-hauled to 50, Close reach to 75, Beam
 * to 112, Broad to 150, Run beyond.
 */
export function nearestPointOfSail(twaDeg: number): string {
  const a = Math.abs(twaDeg);
  return POINTS_OF_SAIL.reduce((best, p) =>
    Math.abs(a - p.twaDeg) < Math.abs(a - best.twaDeg) ? p : best,
  ).id;
}

/**
 * Inside this angle nothing is a point of sail: the sails are luffing and the
 * boat is head to wind, not close-hauled. prov: assumed — a J/70 beats at
 * ~40° TWA and the VMG solve never answers below 35, so 30 is comfortably
 * inside "you are not sailing this angle".
 */
export const LUFFING_DEG = 30;

/**
 * The chip a TWA is *in*, or `null` when the angle is outside every band —
 * which is what deselects the row rather than leaving a chip lit under an
 * angle it does not describe (audit ux-04 M-02). Same midpoint bands as
 * `nearestPointOfSail`; the ends are the honest part, because head to wind and
 * past dead downwind are not points of sail.
 */
export function bandOf(twaDeg: number): string | null {
  const a = Math.abs(twaDeg);
  if (a < LUFFING_DEG || a > 180) return null;
  return nearestPointOfSail(a);
}
