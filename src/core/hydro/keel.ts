/**
 * Keel + hull side force and the induced drag that pays for it.
 *
 * Lifting-line, one panel: the hull acts as a reflection plane, so the keel is
 * the half of a wing of span 2*s and area 2*A. Heel tips the fin over, and the
 * athwartships span that does the work goes as cos(heel).
 */
import type { BoatDefinition } from '../types';
import { RHO_WATER, knob } from '../internal';

const DEG = Math.PI / 180;

/**
 * Effective aspect ratio of the mirrored keel: AR = (2*s*cos(heel))^2 / (2*A).
 * The hull mirror doubles both span and area, so this reduces to 2*s^2/A
 * upright. prov: lifting line (image method).
 */
export function effectiveAspectRatio(boat: BoatDefinition, heelDeg: number): number {
  const span = boat.hull.keelSpanM * Math.cos(heelDeg * DEG);
  return (2 * span * span) / boat.hull.keelAreaM2;
}

/** Lift-curve slope per radian: CLa = 2*pi*AR / (AR + 2). prov: lifting line. */
export function liftSlopePerRad(ar: number): number {
  return (2 * Math.PI * ar) / (ar + 2);
}

/**
 * Hydrodynamic side force, N, positive to windward (opposing the aero side
 * force). Keel lift plus a fraction for the hull's own lift.
 */
export function sideForce(
  boat: BoatDefinition,
  vMs: number,
  heelDeg: number,
  leewayDeg: number,
): number {
  const ar = effectiveAspectRatio(boat, heelDeg);
  // prov: assumed. Multiplier on the lifting-line slope, fallback 1 = trust
  // the theory until the polar says otherwise.
  const slope = liftSlopePerRad(ar) * knob(boat, 'hydro.keelLiftSlope', 1);
  // prov: assumed. Canoe body carries ~30 % of the keel's side force at
  // upwind leeway angles; not separable from the keel without CFD.
  const hullFrac = knob(boat, 'hydro.hullLiftFrac', 0.3);
  const q = 0.5 * RHO_WATER * vMs * vMs;
  return q * boat.hull.keelAreaM2 * slope * (leewayDeg * DEG) * (1 + hullFrac);
}

/**
 * Induced drag, N: Ri = Fy^2 / (q * pi * AR_eff * A). With AR_eff = 2*s^2/A
 * this is Fy^2 / (2*q*pi*s^2), the standard half-wing-against-a-wall result.
 * prov: lifting line.
 */
export function inducedDrag(
  boat: BoatDefinition,
  vMs: number,
  heelDeg: number,
  fyN: number,
): number {
  const q = 0.5 * RHO_WATER * vMs * vMs;
  const denom = q * Math.PI * effectiveAspectRatio(boat, heelDeg) * boat.hull.keelAreaM2;
  if (!(denom > 0)) return 0;
  // prov: assumed. Fallback 1 = elliptic loading; a real fin is nearer 1.2.
  return (knob(boat, 'hydro.inducedDragK', 1) * (fyN * fyN)) / denom;
}
