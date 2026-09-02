/**
 * Keel + hull side force and the induced drag that pays for it.
 *
 * Lifting-line, one panel: the hull acts as a reflection plane, so the keel is
 * the half of a wing of span 2*s and area 2*A. Heel tips the fin over, and the
 * athwartships span that does the work falls off as a power of cos(heel).
 */
import type { BoatDefinition } from '../types';
import { RHO_WATER, knob } from '../internal';

const DEG = Math.PI / 180;

/**
 * Effective aspect ratio of the mirrored keel:
 * AR = (2*s*cos(heel)^n)^2 / (2*A). The hull mirror doubles both span and
 * area, so this reduces to 2*s^2/A upright. prov: lifting line (image method).
 *
 * The exponent is `hydro.effDraftHeelExp` and nothing fits it. Plain
 * geometric projection (n = 1) is what this function used to do and it is the
 * one value both published effective-draft treatments reject: the DSYHS
 * polynomial (Keuning & Sonnenberg 1998, Teff/T as a function of heel and Fn
 * with hull-form terms) and ORC's pre-2013 effective-draft treatment both
 * fall off faster than the projection, between cos^1.2 and cos^2.9,
 * steepening with beam/draft (ADR 0022 option D, ADR 0025). Neither closed
 * form can be used: the DSYHS one needs a scale factor whose order of
 * magnitude the transcriptions contradict (see `resistance.ts`), and the ORC
 * chart is from an edition ORC superseded in 2013. So the published thing is
 * the *band*, and nothing published places a given hull inside it — fitted
 * there, the two classes in this repo went to opposite bounds at essentially
 * the same beam/draft (J/70 Bwl/Tc 9.26 -> 2.9, Melges 24 9.16 -> 1.2), which
 * is not a hull-form law, it is a knob. It therefore holds the band's shallow
 * end as a constant: stronger than the projection both sources reject, weaker
 * than anything the evidence cannot carry.
 *
 * For the record, since the DSYHS form would need it: the J/70's canoe-body
 * draft is Tc = T - keel span = 1.383 - 1.176 = 0.207 m (prov: derived from
 * `hull.draftM` and `hull.keelSpanM`), giving Bwl/Tc = 9.3 against the DSYHS
 * B/Tc range of 2.46-19.4 quoted in `resistance.ts`. The reduced form here
 * does not read it.
 *
 * Past 30 deg of heel the law is held constant rather than extrapolated, the
 * same convention `resistance.ts` uses at the ends of every other table here:
 * the DSYHS heeled tests run at 0, 10, 20 and 30 deg and 30 is the last
 * station, and an out-of-range regression is a confident wrong answer. No row
 * of either class's polar heels past 30 deg at a VPP trim, so this changes no
 * fitted or gated number; it matters in race mode, where the controls are the
 * sailor's and the boat can sit at full power in 20 kt heeled to 35.
 */
const EFF_DRAFT_HEEL_MAX_DEG = 30; // prov: DSYHS heeled test stations 0/10/20/30 deg, the last one

export function effectiveAspectRatio(boat: BoatDefinition, heelDeg: number): number {
  // prov: derived, see the docstring. 1.2 is the shallow end of the published
  // cos^1.2-cos^2.9 band, the weakest knockdown either source supports. Read
  // through `knob()` so a class can override it from its boat file; no
  // calibration stage fits it (ADR 0025).
  const exp = knob(boat, 'hydro.effDraftHeelExp', 1.2);
  const phi = Math.min(Math.abs(heelDeg), EFF_DRAFT_HEEL_MAX_DEG);
  const span = boat.hull.keelSpanM * Math.cos(phi * DEG) ** exp;
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
