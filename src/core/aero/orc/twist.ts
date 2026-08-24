/**
 * ORC twist function: how de-powering lowers the centre of effort.
 *
 * Source: ORC VPP Documentation 2023 §5.4.4, eq (5.49),
 * https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf
 *
 * Note what this is *not*: ORC has no twist-angle input. Twist enters the
 * model only as a function of the flat parameter and rig fractionality, and
 * only moves the centre of effort height. It does not change lift. Anything
 * that maps a measured leech twist angle onto the model is invented and lives
 * in `../shape/sensitivity.ts`.
 */
import { JIB_TWIST_CEH_FRACTION_OF_IG, TWIST_K_FLAT, TWIST_K_FRAC } from './tables';

/**
 * Multiplier on ZCE|flat=1.
 *
 *   ZCE = ZCE|flat=1 * [1 - 0.406*(1-flat) - 0.902*(1-flat)*(1-frac)]
 *
 * The amount of CE lowering was doubled in 2023 alongside the rest of the
 * de-powering overhaul.
 * prov: ORC VPP 2023 §5.4.4, eq (5.49)
 */
export function twistCeFactor(flat: number, fractionality: number): number {
  const d = 1 - flat;
  return 1 - TWIST_K_FLAT * d - TWIST_K_FRAC * d * (1 - fractionality);
}

/**
 * Jib-twist CE reduction, a separate effect driven by the *reef* parameter
 * rather than flat: Zce is lowered by up to 5% of IG as the jib foot goes from
 * full size (ftj = 1) to minimum (ftj = 0).
 *
 *   delta_CEH = (1 - ftj) * 0.05 * IG
 *
 * prov: ORC VPP 2023 §5.4.2, eqs (5.39) and (5.40)
 */
export function jibTwistCeDropM(ftj: number, igM: number): number {
  const f = Math.min(1, Math.max(0, ftj));
  return (1 - f) * JIB_TWIST_CEH_FRACTION_OF_IG * igM;
}
