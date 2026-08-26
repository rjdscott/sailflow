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

/**
 * Apparent wind angles bounding the offwind sail's wing-to-parachute
 * changeover. Both are knots of ORC Table 5.7 itself, picked because the
 * table's own lift share of drive falls from 75 % at 115° to 14 % at 150°
 * (docs/research/2026-08-25-spinnaker/01-asymmetric-aerodynamics.md §2.3,
 * which puts the changeover "around 140°" — the midpoint of this ramp).
 * prov: ORC VPP 2023 Table 5.7 tabulated AWA knots
 */
export const PARACHUTE_AWA_LO = 115; // prov: ORC VPP 2023 Table 5.7, tabulated AWA knot
export const PARACHUTE_AWA_HI = 150; // prov: ORC VPP 2023 Table 5.7, tabulated AWA knot

/**
 * INVENTED — not ORC. Bluff-body drag multiplier on the offwind sail's CD0,
 * ramped in across the wing-to-parachute changeover.
 *
 * Why this exists. Above about AWA 140 the asymmetric makes essentially all of
 * its drive as drag (lift's share of drive is 14 % at 150° and 1 % at 170°;
 * research doc 01 §2.3). The only non-ORC handle the model had on the offwind
 * sail was `aero.asymClMul`, a multiplier on CLmax — and CLmax is 0.10 at
 * AWA 150 and 0.02 at 170, so that knob has no authority at all over exactly
 * the rows the ORC Speed Guide's deep-running polar is made of. Calibration
 * could not close the deep-running gap because it had nothing to turn.
 *
 * This is the missing companion knob. Below `PARACHUTE_AWA_LO` it is
 * identically 1 (ORC unmodified, and the reaching rows the model already
 * reproduces are untouched); above `PARACHUTE_AWA_HI` it is the full
 * `deepMul`; in between it ramps linearly. ORC's own declining CD tail past
 * the changeover is kept — flattening it into a constant bluff-body plateau
 * was tried and drives the optimum to the 178° bracket edge at every wind
 * speed (ADR 0018, option C).
 *
 * Confidence: the value is fitted, not measured — see ADR 0018 and the
 * `ASSUMPTIONS.md` row. What the evidence does say is that the fitted
 * magnitude lands inside the published wind-tunnel band once the reference-area
 * conventions are reconciled (Souppez & Viola 2024, research doc 01 §3.1, §7.2).
 *
 * ponytail: linear ramp between two table knots. A shaped curve is the upgrade
 * path if a residual ever asks for one; today one number fits AWA 142 and 164
 * to within 6 % of each other, so a curve would be fitting noise.
 */
export function parachuteCdMul(awaDeg: number, deepMul: number): number {
  const a = Math.abs(awaDeg);
  if (a <= PARACHUTE_AWA_LO) return 1;
  if (a >= PARACHUTE_AWA_HI) return deepMul;
  return 1 + (deepMul - 1) * ((a - PARACHUTE_AWA_LO) / (PARACHUTE_AWA_HI - PARACHUTE_AWA_LO));
}
