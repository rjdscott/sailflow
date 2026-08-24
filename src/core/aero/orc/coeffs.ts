/**
 * Interpolation into the ORC coefficient tables.
 *
 * Source: ORC VPP Documentation 2023,
 * https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf
 *
 * ORC does not state an interpolation scheme for the tabulated coefficients;
 * linear in apparent wind angle between tabulated knots is the conventional
 * reading and is what the published figures (5.6, 5.9, 5.10) look like.
 * SIMPLIFIED — assumption, not a quoted rule.
 */
import {
  FCOEF,
  SET_HIGH,
  SET_LOW,
  SET_MEDIUM,
  TABLES,
  type CoeffSet,
  type OrcSail,
} from './tables';

/** Piecewise-linear interpolation, clamped flat outside the knot range. */
export function lerpTable(xs: readonly number[], ys: readonly number[], x: number): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 1;
  while (i < n - 1 && xs[i] < x) i++;
  const x0 = xs[i - 1];
  const x1 = xs[i];
  if (x === x1) return ys[i]; // exact at knots, no rounding through the ratio
  const t = (x - x0) / (x1 - x0);
  return ys[i - 1] + t * (ys[i] - ys[i - 1]);
}

/**
 * Fractionality coefficient, controlling how strongly a backstay (without
 * runners) can bend the mast.
 *
 *   fcoef = sqrt( sin( (pi/0.6) * min(0.3, max(0, 1/fractionality - 1)) ) )
 *
 * prov: ORC VPP 2023 §5.2.1, eq (5.5)
 */
export function fcoefOf(fractionality: number): number {
  const inner = Math.min(FCOEF.cap, Math.max(0, 1 / fractionality - 1));
  return Math.sqrt(Math.sin((Math.PI / FCOEF.period) * inner));
}

/**
 * Blend the low and high sets into the medium set.
 *
 * The two sails use *different* published blend formulas, and they are not
 * equivalent. Both are transcribed as written:
 *   mainsail: Cmedium = Clow * (1 - fcoef/2) + Chigh * (fcoef/2)
 *             prov: ORC VPP 2023 §5.2.1, eq (5.6)
 *   jib:      Cmedium = Clow * fcoef + Chigh * (1 - fcoef)
 *             prov: ORC VPP 2023 §5.2.2, eq (5.9)
 */
function medium(sail: OrcSail, low: number, high: number, fcoef: number): number {
  if (sail === 'main') return low * (1 - fcoef / 2) + high * (fcoef / 2);
  return low * fcoef + high * (1 - fcoef);
}

export interface SailCoeffs {
  /** Maximum lift coefficient at this AWA. */
  clMax: number;
  /** Parasitic (viscous) drag coefficient at this AWA. */
  cd0: number;
  /** Two-dimensional quadratic viscous drag coefficient (kpm/kpj/kpasc). */
  kp: number;
}

/**
 * Two-dimensional coefficients for one sail at one apparent wind angle.
 *
 * @param sail  which coefficient table: Table 5.1 / 5.4 / 5.7
 * @param awaDeg apparent wind angle, degrees, 0..180 (sign is the caller's job)
 * @param set   0 = low, 1 = medium, 2 = high (§5.1.2, Tables 5.2 and 5.5)
 * @param fcoef fractionality coefficient from `fcoefOf`; only used for set 1.
 *              Defaults to 0.5, the midpoint, so the function is callable
 *              without rig geometry; `aeroForces` always passes the real value.
 */
export function sailCoeffs(sail: OrcSail, awaDeg: number, set: CoeffSet, fcoef = 0.5): SailCoeffs {
  const t = TABLES[sail];
  const a = Math.abs(awaDeg);
  const clLow = lerpTable(t.awaDeg, t.clLow, a);
  const clHigh = lerpTable(t.awaDeg, t.clHigh, a);
  const cdLow = lerpTable(t.awaDeg, t.cdLow, a);
  const cdHigh = lerpTable(t.awaDeg, t.cdHigh, a);
  if (set === SET_LOW) return { clMax: clLow, cd0: cdLow, kp: t.kp };
  if (set === SET_HIGH) return { clMax: clHigh, cd0: cdHigh, kp: t.kp };
  return {
    clMax: medium(sail, clLow, clHigh, fcoef),
    cd0: medium(sail, cdLow, cdHigh, fcoef),
    kp: t.kp,
  };
}

export { SET_LOW, SET_MEDIUM, SET_HIGH };
export type { CoeffSet, OrcSail };
