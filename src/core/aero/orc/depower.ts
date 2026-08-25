/**
 * ORC de-powering: the flat and reef (RED) parameters.
 *
 * Source: ORC VPP Documentation 2023,
 * https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf
 * §5.1.3 (optimisation and de-powering, Figures 5.3 and 5.4) and §5.4.3
 * (eq 5.47/5.48, fcdmult).
 *
 * This module does not run ORC's optimiser: the caller supplies flat and reef
 * and this module applies them exactly as the documented routine does.
 */
import type { SailSet } from '../../types';
import { FCDMULT_FLAT, FCDMULT_VALUE, FLAT_MIN_BASE, FLAT_MIN_SPINNAKER } from './tables';
import { lerpTable } from './coeffs';

/**
 * FlatMIN = baseline * Flat8, where Flat8 is the flat value used with jib
 * upwind at TWS 8 kt and TWA 52 deg. The re-modulation exists so that a boat
 * already de-powering in light airs gets the same *relative* reduction.
 *
 * The baseline is sailset-dependent: 0.42 upwind, but 0.53 with a spinnaker
 * or a headsail set flying, so the asymmetric floors 26 % higher than the jib.
 * prov: ORC VPP 2023 §5.1.3, step 1 (0.42 baseline set in 2023); ORC VPP 2026
 * §5.1, footnote 3 (0.53 offwind baseline, changed in 2024)
 */
export function flatMin(flat8 = 1, sailset: SailSet = 'jib'): number {
  return (sailset === 'asym' ? FLAT_MIN_SPINNAKER : FLAT_MIN_BASE) * flat8;
}

/** Clamp flat into [FlatMIN, 1]. prov: ORC VPP 2023 §5.1.3 */
export function clampFlat(flat: number, flat8 = 1, sailset: SailSet = 'jib'): number {
  return Math.min(1, Math.max(flatMin(flat8, sailset), flat));
}

/**
 * fcdmult, the non-linear correction applied to the sailplan drag coefficient
 * as a function of flat. Note fcdmult(1.0) = 1.06: the published curve rises
 * again at full power.
 * prov: ORC VPP 2023 §5.4.3, table under Figure 5.15
 */
export function fcdmult(flat: number): number {
  return lerpTable(FCDMULT_FLAT, FCDMULT_VALUE, flat);
}

export interface Reduction {
  /** Jib foot parameter: 1 = full size jib, 0 = minimum jib. */
  ftj: number;
  /** Main reduction factor: 1 = full main, 0 = no main. */
  rfm: number;
  /** Area multiplier for the mainsail. */
  mainAreaScale: number;
  /** Area multiplier for the headsail (jib) or offwind sail. */
  foreAreaScale: number;
}

/**
 * Decompose the reef parameter into ORC's ftj / rfm pair and the resulting
 * area scalings.
 *
 *   RED = reef * 2,  ftj = max(RED - 1, 0),  rfm = min(RED, 1)
 *   Amain_r = Amain * rfm^2
 *
 * prov: ORC VPP 2023 §5.1.3 and Figure 5.4
 *
 * SIMPLIFIED for the jib: ORC reduces LPG (and, below 105% LPG, the luff too)
 * and re-integrates the girths to get Ajib_r. Without the full girth set in
 * the reduced state this uses Ajib_r = Ajib * ftj, which is the leading-order
 * behaviour of that integration (area is close to linear in LPG). Documented
 * as a deviation rather than silently fudged.
 *
 * Offwind (asymmetric): ORC applies REEF directly to the spinnaker, with a
 * floor of 0.85 * SpinArea / DefaultSpinArea (§5.2.3). The floor needs the
 * default-area formulas (eqs 5.15-5.17), which need ISP; not modelled here, so
 * the scaling is linear in reef with no floor.
 */
export function reduction(reef: number, sailset: 'jib' | 'asym'): Reduction {
  const red = reef * 2;
  const ftj = Math.max(red - 1, 0);
  const rfm = Math.min(Math.max(red, 0), 1);
  return {
    ftj,
    rfm,
    mainAreaScale: rfm * rfm, // prov: ORC VPP 2023 Figure 5.4, Amain_r = Amain*rfm^2
    foreAreaScale: sailset === 'jib' ? ftj : Math.max(0, Math.min(1, reef)),
  };
}

/**
 * Sailset lift coefficient. CLsailset = FLAT * CLmax.
 * prov: ORC VPP 2023 §5.4.3, eq (5.48)
 */
export function sailsetCl(clMax: number, flat: number): number {
  return flat * clMax;
}

/**
 * Sailset drag coefficient.
 *
 *   CD = CD0max * [FLAT*fcdmult*fcdj + (1 - fcdj)]
 *      + CE * CLmax^2 * FLAT^2 * fcdmult
 *
 * where CE = KPP + Aref/(pi*heff^2) is the efficiency coefficient (eq 5.46)
 * and fcdj is the fraction of parasitic drag due to the jib.
 * prov: ORC VPP 2023 §5.4.3, eq (5.47)
 */
export function sailsetCd(
  cd0Max: number,
  clMax: number,
  flat: number,
  fcdj: number,
  ceEff: number,
): number {
  const m = fcdmult(flat);
  const parasite = cd0Max * (flat * m * fcdj + (1 - fcdj));
  const induced = ceEff * clMax * clMax * flat * flat * m;
  return parasite + induced;
}

/**
 * Efficiency coefficient CE = KPP + Aref / (pi * heff^2).
 * prov: ORC VPP 2023 §5.4.3, eq (5.46)
 */
export function efficiencyCoeff(kpp: number, arefM2: number, heffM: number): number {
  return kpp + arefM2 / (Math.PI * heffM * heffM);
}

/**
 * Induced-drag-only part, exposed for reporting and tests.
 * CDI = CL^2 * Aref / (pi * heff^2). prov: ORC VPP 2023 §5.4, eq (5.34)
 */
export function inducedDrag(cl: number, arefM2: number, heffM: number): number {
  return (cl * cl * arefM2) / (Math.PI * heffM * heffM);
}
