/**
 * Added resistance in waves, ORC VPP Documentation 2023 section 6.8.
 *
 * prov: ORC VPP Documentation 2023, eq. 6.62-6.70 and Figure 6.13
 * (https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf, retrieved
 * 2026-08-25):
 *
 *   RAW = fs * 2*rho*g*L * f(Vt) * 0.55 * f(betaT) * f(L30)
 *         * [0.00146 + f(Fn) + f(kYY) + f(L/B) + f(B/T)]
 *
 *   f(Fn)   = 0.00191 * (Fn - 0.325)
 *   f(kYY)  = 0.010395 * (GYR - 0.25)
 *   f(L/B)  = (5.23^(-L/B) - 5.23^(-3.327)) / 8.494
 *   f(B/T)  = 0.000166 * (B/Tc - 4.443)
 *   f(L30)  = 0.5059 * log10(L/30) + 1
 *   f(betaT)= cos(betaT) / cos(40 deg)
 *
 * fs = 0.64 (sea energy coefficient), 0.55 is the wave-direction factor. The
 * f(LCB - LCF) term was removed by ORC in 2017 and is not implemented.
 *
 * Substitutions this module makes, all documented rather than hidden:
 *  - L: ORC's L = 0.3194*(2*LSM1 + LSM4) needs IMS sectional lengths we do not
 *    have. `hull.lwlM` stands in. prov: assumed.
 *  - GYR: pitch gyradius comes from an ORC inclining-style test. Held at the
 *    base value 0.25, so f(kYY) = 0. prov: ORC base value (Table 6.2).
 *  - betaT: `HydroInput` carries no TWA, so the base 40 deg wave heading is
 *    used and f(betaT) = 1. prov: assumed (upwind case).
 *  - Tc: canoe-body draft is not in the boat file; derived from displacement
 *    with an assumed block coefficient. prov: assumed.
 *  - f(Vt): ORC drives wave energy off true wind speed. `HydroInput` carries a
 *    SeaState instead, so the sea state indexes the 25 ft baseline curve.
 *    prov: assumed mapping onto published values.
 *
 * The J/70 is well outside the parametric range this regression was fitted
 * over (L below the shortest 25 ft baseline; L^3/disp ~ 380 against a series
 * range of 103-156). Applied as published it returns more added resistance
 * than the hull's entire calm-water resistance, so `hydro.wavesK` scales it
 * and its fallback is a placeholder for a real fit, exactly like the
 * residuary multipliers (ADR 0007).
 */
import type { BoatDefinition, SeaState } from '../types';
import { G, RHO_WATER, knob } from '../internal';
import { froude } from './resistance';

/**
 * Significant wave height by sea state, m, for the report. prov: assumed.
 * 0 flat, 1 ripple, 2 chop, 3 short steep chop, 4 waves.
 */
export const HS_BY_SEA_STATE = [0, 0.15, 0.35, 0.6, 1.0] as const;

export function significantHeightM(seaState: SeaState): number {
  return HS_BY_SEA_STATE[seaState] ?? 0;
}

/**
 * ORC sea-state factor f(Vt), 25 ft baseline (shortest published; ORC says to
 * use the baseline curve for lengths below the minimum). Sea states 1-4 are
 * read off that curve at TWS 8/12/16/20 kt. prov: ORC VPP 2023 Figure 6.13
 * table f(Vt)_25; the sea-state-to-TWS mapping is assumed. Sea state 0 is
 * forced to exactly 0: flat water means no added resistance.
 */
export const SEA_STATE_ENERGY = [0, 2.866, 9.975, 15.981, 20.0] as const;

export function seaStateFactor(seaState: SeaState): number {
  return SEA_STATE_ENERGY[seaState] ?? 0;
}

/** Canoe-body draft, m. prov: assumed (block coefficient 0.40). */
function canoeBodyDraftM(boat: BoatDefinition): number {
  const cb = 0.4;
  return boat.hull.dispKg / (RHO_WATER * cb * boat.hull.lwlM * boat.hull.bwlM);
}

/** Added resistance in waves, N. Zero at sea state 0 and at rest. */
export function addedResistanceWaves(
  boat: BoatDefinition,
  vMs: number,
  seaState: SeaState,
): number {
  const energy = seaStateFactor(seaState);
  if (energy <= 0) return 0;

  const l = boat.hull.lwlM;
  const b = boat.hull.beamM;
  const fn = froude(boat, vMs);

  const fFn = 0.00191 * (fn - 0.325);
  const fLB = (5.23 ** (-l / b) - 5.23 ** -3.327) / 8.494;
  const fBT = 0.000166 * (b / canoeBodyDraftM(boat) - 4.443);
  const fL30 = 0.5059 * Math.log10(l / 30) + 1;
  const bracket = 0.00146 + fFn + fLB + fBT;

  const raw = 0.64 * 2 * RHO_WATER * G * l * energy * 0.55 * fL30 * bracket;

  // ORC evaluates RAW only over its VPP speed range and the bracket stays
  // positive as Fn -> 0, which would leave a stationary boat with drag. Ramp
  // it in below Fn 0.1 so resistance is continuous and zero at rest.
  // prov: assumed.
  const ramp = Math.min(1, Math.max(0, fn / 0.1));
  // prov: assumed. Out-of-range correction on the ORC form, NOT part of it.
  // At 1.0 the published regression returns ~1150 N for this hull at 6 kt in
  // sea state 2, against ~330 N of total hull resistance: the boat would not
  // sail. 0.06 puts added resistance at roughly a fifth of total resistance
  // upwind in chop, which is the order the class polar implies. This is a
  // placeholder for a real fit, exactly like the residuary multipliers.
  return Math.max(0, raw * ramp * knob(boat, 'hydro.wavesK', 0.06));
}
