/**
 * Mast as a single-EI Euler-Bernoulli beam, pinned at the partners and at
 * the masthead, carrying one lumped fore-aft load at the spreader panel.
 *
 * DIRECTION-RIGHT, MM-WRONG. This is a shape model, not a structural one.
 * The real mast is a tapered section with a spreader-height stiffness step,
 * a compression load that amplifies the deflection (P-delta) and a partners
 * restraint somewhere between pinned and fixed. None of that is published
 * for the J/70 rig. What this file guarantees is that the reported bend
 * curve is zero at both ends, single-humped, peaks near the spreaders, and
 * is linear in the applied load and inverse in EI — so every sign and every
 * ordering is right and only the millimetres are a calibration knob
 * (`rig.EI`, ADR 0006).
 *
 * Sign convention: positive bend = mast middle FORWARD of the straight line
 * joining the partners to the tip, which is what a halyard pulled down the
 * mast track measures and what sailors call prebend.
 */
import type { BoatDefinition } from '../types';
import { knob } from '../internal';
import { mastAboveDeckM, mastStations } from '../geometry/rig';

/**
 * Deflection of a pin-pin beam of span L under a point load at `a`,
 * measured relative to the chord (which is the line through both pins).
 * Standard result; symmetric about the load by the reciprocal theorem.
 */
export function pinPinDeflection(
  spanM: number,
  loadAtM: number,
  eiNm2: number,
  forceN: number,
  zM: number,
): number {
  const L = spanM;
  const a = loadAtM;
  const b = L - a;
  if (!(L > 0) || !(eiNm2 > 0) || a <= 0 || b <= 0) return 0;
  // Mirror so the closed form for z <= a covers the whole span.
  const [z, far] = zM <= a ? [zM, b] : [L - zM, a];
  if (z <= 0) return 0;
  return (forceN * far * z * (L * L - far * far - z * z)) / (6 * L * eiNm2);
}

/** Peak (spreader-station) deflection of that beam, m. */
export function pinPinPeak(spanM: number, loadAtM: number, eiNm2: number, forceN: number): number {
  return pinPinDeflection(spanM, loadAtM, eiNm2, forceN, loadAtM);
}

/** Bending stiffness used for the mast, N·m². */
export function mastEI(boat: BoatDefinition): number {
  // prov: assumed. Chosen so that a full-on backstay (rig.backstayMaxN, its
  // fore-aft component resolved at the spreader panel) bends the mast ~40 mm,
  // the top of the range a J/70 crew sees. Not a measured section property.
  return knob(boat, 'rig.EI', 6.0e5);
}

/**
 * Normalised bend mode shape at the 11 mast stations: 0 at the partners,
 * 0 at the tip, 1 at the spreader panel. Depends only on geometry.
 */
export function bendShape(boat: BoatDefinition): number[] {
  const L = mastAboveDeckM(boat);
  const a = boat.rig.spreaderZM;
  const peak = pinPinPeak(L, a, 1, 1);
  if (!(peak > 0)) return mastStations(boat).map(() => 0);
  return mastStations(boat).map((z) => pinPinDeflection(L, a, 1, 1, z) / peak);
}

/**
 * Peak bend, mm, produced by a fore-aft force lumped at the spreader panel.
 * Positive force = forward at the spreader = positive (forward) bend.
 */
export function beamPeakMm(boat: BoatDefinition, forceN: number): number {
  return pinPinPeak(mastAboveDeckM(boat), boat.rig.spreaderZM, mastEI(boat), forceN) * 1000;
}

/** Bend curve at the 11 stations, mm, scaled to the given peak. */
export function bendCurveMm(boat: BoatDefinition, peakMm: number): number[] {
  return bendShape(boat).map((s) => s * peakMm);
}
