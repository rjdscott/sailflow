/**
 * INVENTED — not ORC. Sheeting angle and angle-of-attack efficiency. ADR 0006.
 *
 * The ORC aero model assumes ideal trim: it has no sheeting-angle input, so a
 * sheet eased to nothing and a boom pinned on the centreline on a run both
 * read as "perfect". Race mode needs the difference. This layer turns the
 * sheet controls into a sheeting angle, compares it to the apparent wind, and
 * derates lift when the sail is eased past its luffing band or over-trimmed
 * past its stall band (stall also adds drag). VPP mode never calls it.
 *
 * Tier B: sign-correct, magnitudes are calibration knobs. Every number is a
 * `prov: assumed`. The drawing code in `src/ui/race/boat.ts` carries the same
 * two angle formulas; keep them identical.
 */
import type { BoatDefinition, SailId } from '../types';
import { knob } from '../internal';

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Boom angle off the centreline, degrees. Traveller + = up to windward. */
export function boomAngle(mainsheet: number, traveller: number): number {
  // prov: assumed. Quadratic so 70 % sheet is ~12° (a beat) and 0 % reaches 90° (a run).
  const eased = 100 - mainsheet;
  return clamp(6 + 0.0085 * eased * eased - traveller * 0.08, 2, 90);
}

/** Jib clew sheeting angle off the centreline, degrees. */
export function jibSheetAngle(jibLead: number, jibSheet: number): number {
  // prov: assumed. Quadratic so 70 % sheet is ~10° and 0 % is ~50° (a beam reach).
  const eased = 100 - jibSheet;
  return clamp(4 + jibLead * 0.35 + 0.0045 * eased * eased, 2, 90);
}

/**
 * Fraction of the head's twist that reaches the mid-height station the angle
 * of attack is measured at. Exported so the leech-stall instrument can turn a
 * deviation in angle of attack back into the twist that would remove it,
 * rather than keeping its own copy of the number.
 */
export const TWIST_TO_AOA = 0.25; // prov: assumed, linear twist distribution up the leech

export interface Sheeting {
  /** Sheeting angle of the sail's foot off the centreline, degrees. */
  sheetDeg: number;
  /** Geometric twist at the head, degrees; a quarter of it reaches mid-height. */
  twistDeg: number;
}

export interface SheetingEffect {
  /** Multiplier on the sail's CLmax, (0, 1]. */
  clMul: number;
  /** Additive parasitic drag from a stalled sail. */
  dCd0: number;
}

export const IDEAL_SHEETING: SheetingEffect = { clMul: 1, dCd0: 0 };

/** Everything `sheetingEffect` decides from, exposed so the instruments can reuse it. */
export interface SheetingDeviation {
  /** Mid-height angle of attack minus the ideal, degrees. + over-trimmed, − eased. */
  devDeg: number;
  /** Half-width of the "in the groove" band, degrees. */
  bandDeg: number;
  luffScaleDeg: number;
  stallScaleDeg: number;
  stallDragPerDeg: number;
}

/**
 * How far this sail sits from its ideal angle of attack, and the scales the
 * penalties are measured on. Split out of `sheetingEffect` unchanged so
 * `solve/instruments.ts` reads the same deviation the forces do rather than
 * keeping a second copy of the two angle formulas.
 */
export function sheetingDeviation(
  boat: BoatDefinition,
  sail: 'main' | 'jib',
  awaDeg: number,
  s: Sheeting,
): SheetingDeviation {
  const opt =
    sail === 'main'
      ? knob(boat, 'aero.sheet.optAoaMain', 16) // prov: assumed, ideal mid-height AoA for the main
      : knob(boat, 'aero.sheet.optAoaJib', 13); // prov: assumed, ideal mid-height AoA for the jib
  const bandDeg = knob(boat, 'aero.sheet.bandDeg', 4); // prov: assumed, half-width of the "in the groove" band
  // Exponential decays, not linear-to-a-floor: a plateau gives the trim
  // optimiser no gradient to climb back out of a badly eased or pinned sail.
  const luffScaleDeg = knob(boat, 'aero.sheet.luffScaleDeg', 20); // prov: assumed, e-fold of lift lost per degree eased past the band
  const stallScaleDeg = knob(boat, 'aero.sheet.stallScaleDeg', 30); // prov: assumed, e-fold of lift lost per degree over-trimmed past the band
  const stallDragPerDeg = knob(boat, 'aero.sheet.stallDragPerDeg', 0.004); // prov: assumed, CD0 added per degree over-trimmed past the band
  const aoa = awaDeg - s.sheetDeg - TWIST_TO_AOA * Math.max(0, s.twistDeg);
  // Ideal AoA is unreachable when the boom cannot go out far enough (deep
  // running); that is real, not a penalty for good trim, so cap the ideal at
  // what a 90° boom can give.
  const target = Math.max(opt, awaDeg - 90); // prov: geometry, a boom cannot pass 90° off the centreline
  return { devDeg: aoa - target, bandDeg, luffScaleDeg, stallScaleDeg, stallDragPerDeg };
}

/**
 * Lift and drag penalty for a sail sheeted away from its ideal angle of attack.
 * Angle of attack at mid-height = AWA − sheeting angle − twist/4.
 */
export function sheetingEffect(
  boat: BoatDefinition,
  sail: SailId,
  awaDeg: number,
  s: Sheeting,
): SheetingEffect {
  if (sail === 'asym') return IDEAL_SHEETING; // ponytail: kite sheet is a DownControl, C-tier, not modelled here
  const {
    devDeg: dev, // + over-trimmed, − eased
    bandDeg: band,
    luffScaleDeg,
    stallScaleDeg,
    stallDragPerDeg,
  } = sheetingDeviation(boat, sail, awaDeg, s);
  if (dev < -band) {
    const excess = -dev - band;
    return { clMul: 0.2 + 0.8 * Math.exp(-excess / luffScaleDeg), dCd0: 0 }; // prov: assumed floor 0.2, a flogging sail still drags the boat along
  }
  if (dev > band) {
    const excess = dev - band;
    return {
      clMul: 0.45 + 0.55 * Math.exp(-excess / stallScaleDeg), // prov: assumed floor 0.45, a stalled sail keeps roughly half its lift
      // Past 90° AWA drag is drive, so extra stall drag would reward pinning
      // the boom on a run; only the lift loss applies there.
      dCd0: awaDeg < 90 ? Math.min(0.4, stallDragPerDeg * excess) : 0, // prov: assumed cap
    };
  }
  return IDEAL_SHEETING;
}
