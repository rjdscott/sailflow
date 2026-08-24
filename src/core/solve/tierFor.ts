import type { SailSet, Tier, Tiered } from '../types';
import type { ShapeDeltas } from '../internal';

export type Quantity = 'bs' | 'vmg' | 'heel' | 'leeway' | 'dockRegret';

/**
 * Confidence tier for a quantity (ADR 0006). One function so the rule is
 * auditable: upwind jib speed/VMG come from the polar-calibrated core (A);
 * heel and leeway lean on an assumed righting/keel model (B); anything under
 * asymmetric is a coarser model (B for speed, C for the rest); and any output
 * that depends heavily on the invented shape layer is demoted one tier.
 */
export function tierFor(
  q: Quantity,
  ctx: { sailset: SailSet; twsKt: number; deltas?: ShapeDeltas },
): Tier {
  let t: Tier;
  if (ctx.sailset === 'jib') t = q === 'bs' || q === 'vmg' ? 'A' : 'B';
  else t = q === 'bs' || q === 'vmg' ? 'B' : 'C';
  if (q === 'dockRegret') t = ctx.twsKt > POLAR_MAX_TWS ? 'C' : ctx.sailset === 'jib' ? 'A' : 'B';
  if (ctx.twsKt > POLAR_MAX_TWS || ctx.twsKt < POLAR_MIN_TWS) t = demote(t);
  if (ctx.deltas && shapeInfluence(ctx.deltas) > SHAPE_DEMOTE_THRESHOLD) t = demote(t);
  return t;
}

/** Wrap a value with its tier and, for B, a band of ±`bandFrac`. */
// prov: assumed, default ±5% uncertainty band for tier B outputs
export function tiered(value: number, tier: Tier, bandFrac = 0.05, sign?: -1 | 0 | 1): Tiered {
  if (tier === 'A') return { value, tier };
  if (tier === 'B')
    return {
      value,
      tier,
      band: [value - Math.abs(value) * bandFrac, value + Math.abs(value) * bandFrac],
    };
  return { value, tier, sign: sign ?? (value > 0 ? 1 : value < 0 ? -1 : 0) };
}

export function shapeInfluence(d: ShapeDeltas): number {
  return Math.abs(d.dCLmax) + Math.abs(d.dCD0) * 5 + Math.abs(d.dCEh) + Math.abs(d.dTwistDeg) / 20; // prov: assumed weighting (dCD0 x5, dTwistDeg /20)
}

function demote(t: Tier): Tier {
  return t === 'A' ? 'B' : 'C';
}

export const POLAR_MIN_TWS = 6; // prov: ORC Speed Guide J/70 lowest printed TWS
export const POLAR_MAX_TWS = 20; // prov: ORC Speed Guide J/70 highest printed TWS
/** Shape-layer influence above which an output loses one tier. prov: assumed */
export const SHAPE_DEMOTE_THRESHOLD = 0.08;
