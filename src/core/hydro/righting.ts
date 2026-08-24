/**
 * Righting moment: hull form stability plus legally-hiking crew.
 *
 * The hull term is anchored on the certificate's measured inclining-test
 * slope (`hull.rmMeasuredKgMPerDeg`, 18.5 kg.m/deg for the J/70), not on the
 * assumed GM, because that number is published and GM is not.
 *
 * Crew are assumed to be hiking as hard as the class rules allow, at every
 * heel angle. This is the steady-state upwind case the trainer is built
 * around; there is no `hikeFraction` input and none is wanted, since adding
 * one would make every solve depend on a number the user cannot observe.
 * Downwind and light-air crew placement is a separate problem.
 */
import type { BoatDefinition } from '../types';
import { G, knob } from '../internal';

const DEG = Math.PI / 180;

/**
 * The ORC certificate's measured righting moment, kg.m per degree of heel at
 * small angles. Not in `HullDef` yet, so read defensively; falls back to the
 * assumed GM (RM/deg = disp * GM * pi/180). prov: orc-cert (published).
 */
function rmPerDegKgM(boat: BoatDefinition): number {
  const v = boat.hull.rmMeasuredKgMPerDeg;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  return boat.hull.dispKg * boat.hull.gmM * DEG;
}

/**
 * Hull righting moment, N.m. Linear on the measured slope up to the knee,
 * then the angle is replaced by knee + sin(phi - knee): a sin(phi)/phi-style
 * taper that is value- and slope-continuous at the knee and keeps rising to
 * ~115 deg. The wall-sided assumption behind the linear term stops holding
 * once the flared topsides immerse, which for this hull is around 25 deg.
 */
export function hullRighting(boat: BoatDefinition, heelDeg: number): number {
  // prov: assumed. Knee angle in degrees; 25 is where a beamy sportboat's
  // GZ curve visibly departs from the inclining-test line.
  const kneeDeg = knob(boat, 'hydro.rmKnee', 25);
  const phi = Math.abs(heelDeg) * DEG;
  const knee = kneeDeg * DEG;
  const eff = phi <= knee ? phi : knee + Math.sin(phi - knee);
  const magnitude = rmPerDegKgM(boat) * G * (eff / DEG);
  return heelDeg < 0 ? -magnitude : magnitude;
}

/**
 * Crew righting arm, m: the athwartships offset of the crew CG.
 *
 * Class rules C.3.3 / C.9.5: base of the spine on the deck, no part of the
 * torso outboard of a vertical from the lifeline, and not more than
 * `crew.maxLegsOut` crew with legs outboard of the sheerline. So the hardest
 * legal crew CG is at the lifeline, i.e. beam/2; the hiking crew are placed
 * just inboard of it and the rest sit at 0.6 * beam/2. The result can never
 * exceed beam/2 whatever the knob says.
 */
export function crewArmM(boat: BoatDefinition): number {
  const half = boat.hull.beamM / 2;
  // prov: assumed. 0.95 keeps the torso inside the lifeline vertical rather
  // than exactly on it; 0.6 is a non-hiking crew sitting on the rail-ish.
  const armHike = knob(boat, 'hydro.crewArmMul', 1) * Math.min(half, 0.95 * half);
  const armRest = 0.6 * half;
  const count = Math.max(1, boat.crew.minCount);
  const frac = Math.min(boat.crew.maxLegsOut, count) / count;
  return Math.min(half, frac * armHike + (1 - frac) * armRest);
}

/** Crew righting moment, N.m: m * g * arm * cos(heel). */
export function crewRighting(boat: BoatDefinition, crewKg: number, heelDeg: number): number {
  return crewKg * G * crewArmM(boat) * Math.cos(heelDeg * DEG);
}
