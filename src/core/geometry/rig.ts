/**
 * Rig geometry: where the mast, spreaders, chainplates, forestay and
 * backstay are, and what angles they pull at. Pure trigonometry on the
 * boat JSON — no loads, no stiffness. `rig/beam.ts` and `rig/state.ts`
 * consume it.
 *
 * Frame: origin at the mast heel on deck (the partners). x positive
 * forward, y positive to starboard, z positive up. Angles are reported in
 * degrees from the mast axis, which is what the load resolution needs.
 */
import type { BoatDefinition } from '../types';
import { knob } from '../internal';

/** Number of mast stations reported, partners (0) to tip (last). */
export const MAST_STATIONS = 11; // prov: assumed, rig bend curve reporting resolution

const DEG = 180 / Math.PI;

/** Mast length above the partners, m. */
export function mastAboveDeckM(boat: BoatDefinition): number {
  return knob(boat, 'geom.mastAboveDeckM', boat.rig.mastLenM);
}

/** Heights of the 11 mast stations above the partners, m, evenly spaced. */
export function mastStations(boat: BoatDefinition): number[] {
  const L = mastAboveDeckM(boat);
  return Array.from({ length: MAST_STATIONS }, (_, i) => (L * i) / (MAST_STATIONS - 1));
}

export interface SpreaderGeometry {
  /** Height above the partners, m. */
  zM: number;
  lenM: number;
  sweepDeg: number;
  /** Athwartship reach of the tip, m. */
  tipYM: number;
  /** Aft reach of the tip, m (positive aft). */
  tipAftM: number;
  /** Fractional height of the spreader on the mast, 0 at partners, 1 at tip. */
  fraction: number;
}

export function spreaderGeometry(boat: BoatDefinition): SpreaderGeometry {
  const { spreaderZM, spreaderLenM, sweepDeg } = boat.rig;
  const s = sweepDeg / DEG;
  return {
    zM: spreaderZM,
    lenM: spreaderLenM,
    sweepDeg,
    tipYM: spreaderLenM * Math.cos(s),
    tipAftM: spreaderLenM * Math.sin(s),
    fraction: spreaderZM / mastAboveDeckM(boat),
  };
}

export interface ShroudGeometry {
  /** Athwartship offset of the chainplate from centreline, m. */
  yM: number;
  /** Straight-line length from chainplate to the shroud's mast attachment, m. */
  lengthM: number;
  /** Angle of the shroud from the mast axis, degrees. */
  angleFromMastDeg: number;
}

/** Upper shroud: chainplate to masthead, via the swept spreader tip. */
export function upperGeometry(boat: BoatDefinition): ShroudGeometry {
  const y = boat.rig.chainplateYM;
  const z = mastAboveDeckM(boat);
  return { yM: y, lengthM: Math.hypot(y, z), angleFromMastDeg: Math.atan2(y, z) * DEG };
}

/** Lower shroud: chainplate to the spreader root. */
export function lowerGeometry(boat: BoatDefinition): ShroudGeometry {
  const y = boat.rig.chainplateYM;
  const z = boat.rig.spreaderZM;
  return { yM: y, lengthM: Math.hypot(y, z), angleFromMastDeg: Math.atan2(y, z) * DEG };
}

export interface ForestayGeometry {
  /** Forestay length for the requested adjustment, m. */
  lengthM: number;
  /** Length at the guide base setting (forestayMm = 0), m. */
  baseLengthM: number;
  /** Mast rake angle aft from vertical, degrees. Zero at the base setting. */
  rakeDeg: number;
  /** Aft displacement of the mast tip relative to the base setting, mm. */
  rakeMm: number;
  /** Angle of the forestay from the mast axis, degrees. */
  angleFromMastDeg: number;
}

/**
 * Forestay geometry for a length change of `forestayMm` from the base.
 *
 * The mast is treated as rigid and pivoting at the partners. With the
 * forestay attachment at height I on the mast and its deck base J forward
 * of the mast, L² = I² + J² + 2·I·J·sin(theta), so a longer forestay is a
 * larger rake angle. Rake is reported at the mast tip, which is what a
 * tape down the mainsail luff measures.
 */
export function forestayGeometry(boat: BoatDefinition, forestayMm: number): ForestayGeometry {
  const I = boat.rig.iM;
  const J = boat.rig.jM;
  const baseLengthM = Math.hypot(I, J);
  const lengthM = baseLengthM + forestayMm / 1000;
  const sinTheta = Math.min(1, Math.max(-1, (lengthM ** 2 - I * I - J * J) / (2 * I * J)));
  const rakeDeg = Math.asin(sinTheta) * DEG;
  return {
    lengthM,
    baseLengthM,
    rakeDeg,
    rakeMm: mastAboveDeckM(boat) * sinTheta * 1000,
    // Angle the forestay makes with the mast, at the raked attitude.
    angleFromMastDeg: Math.atan2(J + I * sinTheta, I * Math.sqrt(1 - sinTheta ** 2)) * DEG,
  };
}

export interface BackstayGeometry {
  /** Distance of the backstay chainplate aft of the mast heel, m. */
  baseAftM: number;
  /** Masthead attachment height above the partners, m. */
  topZM: number;
  /** Angle of the backstay from the mast axis, degrees. */
  angleFromMastDeg: number;
}

export function backstayGeometry(boat: BoatDefinition): BackstayGeometry {
  // prov: derived. Plumb-bow hull, so the forestay base is close to the stem
  // and the transom sits (LOA − J) aft of the mast heel.
  const baseAftM = knob(boat, 'geom.backstayBaseAftM', boat.hull.loaM - boat.rig.jM);
  const topZM = mastAboveDeckM(boat);
  return { baseAftM, topZM, angleFromMastDeg: Math.atan2(baseAftM, topZM) * DEG };
}
