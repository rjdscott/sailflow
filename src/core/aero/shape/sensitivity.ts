/**
 * INVENTED — not ORC. Sign-correct only. ADR 0006.
 *
 * The ORC sail model has no rig-tune and no flying-shape input: a sail is an
 * area, a CE height, and a CLmax/CD0-versus-AWA envelope, with tune entering
 * only through flat, reef, and the discrete Low/Medium/High coefficient set.
 * There is therefore no documented interface between a parametric flying shape
 * (draft depth, draft position, entry/exit angle, twist) and §5.1.1.
 *
 * This file is that missing interface, and it is ours, not ORC's. It does one
 * thing: apply already-computed deltas to the ORC baseline. It invents no
 * magnitudes of its own — the magnitudes come from `shape/toOrc.ts`, which is
 * likewise a calibrated guess. The only reason this layer exists as a named
 * module is so that every departure from ORC passes through one function that
 * can be grepped, tested, and switched off.
 *
 * Confidence tier C: direction only. Never quote a number that came through
 * here without the tier.
 *
 * Source of the "not implementable as written" finding:
 * docs/research/2026-08-25-sailing-sim-landscape/01-adversarial-review.md #1.
 */
import type { ShapeDeltas } from '../../internal';

export interface OrcBaseline {
  /** Aggregate sailset maximum lift coefficient. */
  clMax: number;
  /** Aggregate sailset parasitic drag coefficient. */
  cd0: number;
  /** Sailset centre of effort height above the water plane, m. */
  ceH: number;
  /** Effective twist, degrees. */
  twist: number;
}

export const ZERO_DELTAS: ShapeDeltas = { dCLmax: 0, dCD0: 0, dCEh: 0, dTwistDeg: 0 };

/**
 * Apply the shape layer's deltas to the ORC baseline.
 *
 * dCLmax and dCD0 are additive on the coefficients; dCEh is *fractional* on the
 * CE height (-0.03 = CE 3% lower); dTwistDeg is additive on the twist angle.
 * Everything is clamped to physically meaningful ranges: coefficients cannot go
 * negative and the CE cannot leave the boat.
 */
export function applyShapeDeltas(base: OrcBaseline, deltas: ShapeDeltas): OrcBaseline {
  return {
    clMax: Math.max(0, base.clMax + deltas.dCLmax),
    cd0: Math.max(0, base.cd0 + deltas.dCD0),
    ceH: Math.max(0, base.ceH * (1 + deltas.dCEh)),
    twist: base.twist + deltas.dTwistDeg,
  };
}

/**
 * INVENTED — not ORC. Effective-twist knob on CE height.
 *
 * ORC's own twist function (§5.4.4) is driven by flat and fractionality and
 * knows nothing about a leech twist angle. `OrcTune.twistEffDeg` is our
 * additional handle on the same physics: more twist spills the top of the sail
 * and drops the centre of effort. A linear reduction with a calibratable gain
 * is the least we can write that is sign-correct; the magnitude is a fit
 * parameter, not a measurement.
 *
 * Knob: `aero.twistCeGain`, fractional CE drop per degree of effective twist.
 * ponytail: linear is the ceiling here; if the calibration residual asks for
 * curvature, make it a table like ORC's own figures rather than a polynomial.
 */
export function twistCeFactorInvented(twistEffDeg: number, gainPerDeg: number): number {
  return Math.max(0.5, Math.min(1, 1 - gainPerDeg * Math.max(0, twistEffDeg)));
}
