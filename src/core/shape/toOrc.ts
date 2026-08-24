/**
 * Flying shape -> the two scalars the ORC sail model actually accepts
 * (flat, reef), the effective twist, and a set of deltas on the ORC
 * coefficients.
 *
 * INVENTED layer, not ORC; sign-correct, magnitude a calibration knob
 * (ADR 0006). ORC VPP Documentation 2023 §5.1.1 takes a sail as area, CE
 * height and a CLmax/CD0 envelope: it has no draft, no draft position and
 * no per-height twist input. `flat` and `reef` are the only tune channels
 * it defines, so everything the shape layer knows beyond those two numbers
 * is expressed as an additive delta on the coefficients and labelled as
 * this app's own invention (research finding 1).
 *
 * The datum is `shape/base.ts`: at the base dock rig and base race trim
 * every delta is exactly zero, so the deltas read as "relative to the
 * guide's base setup", which is the only claim the evidence supports.
 */
import type { BoatDefinition, RaceControls, SailId, SailSet, SailShape } from '../types';
import type { ShapeDeltas, ShapeToOrcResult } from '../internal';
import { knob } from '../internal';
import { referenceShapes } from './base';

/** prov: ORC VPP Documentation 2023 §5.1.3 — minimum flat is 0.42 from 2023. */
const FLAT_MIN = 0.42;
const FLAT_MAX = 1;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function meanDraft(shapes: Partial<Record<SailId, SailShape>>): number {
  const v: number[] = [];
  for (const s of Object.values(shapes))
    v.push(s.quarter.draft, s.half.draft, s.threeQuarter.draft);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

/** Effective twist: the mean half-height twist over the sails carried. */
function meanTwist(shapes: Partial<Record<SailId, SailShape>>): number {
  const v = Object.values(shapes).map((s) => s.half.twistDeg);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

export function shapeToOrc(
  boat: BoatDefinition,
  shapes: Partial<Record<SailId, SailShape>>,
  race: RaceControls,
  sailset: SailSet,
): ShapeToOrcResult {
  const carried = (Object.keys(shapes) as SailId[]).filter((s) => shapes[s]);
  const ref = referenceShapes(boat, carried);

  const draft = meanDraft(shapes);
  const refDraft = meanDraft(ref);
  const twistEffDeg = meanTwist(shapes);
  const refTwist = meanTwist(ref);

  // Relative draft deviation from the base setup. Negative = flatter.
  const d = refDraft > 0 ? (draft - refDraft) / refDraft : 0;
  const dTwistDeg = twistEffDeg - refTwist;

  // flat: 1 at base, falls as the sails flatten, floored at the ORC minimum.
  const flat = clamp(
    // prov: assumed gain, sized so that full depower (max backstay, max
    // outhaul, lead aft) approaches the ORC floor. Sign: flatter -> lower flat.
    1 + knob(boat, 'shape.flatK', 2.5) * d,
    FLAT_MIN,
    FLAT_MAX,
  );

  // reef: Epic 1 does not model reefing. The only state that reads as a
  // reef is everything-on: cunningham and backstay both at their stops.
  const maxed =
    race.cunningham >= boat.controls.cunningham.max && race.backstay >= boat.controls.backstay.max;
  const reef = maxed ? knob(boat, 'shape.reefAtMaxDepower', 0.95) : 1; // prov: assumed

  const deltas: ShapeDeltas = {
    // Quadratic in the draft deviation: both a rounder and a flatter section
    // than the base loses CLmax, rounder because the entry stalls early.
    dCLmax: -knob(boat, 'shape.dClmaxK', 0.35) * d * d, // prov: assumed
    dCD0:
      knob(boat, 'shape.dCd0DraftK', 0.02) * d * d + // prov: assumed, excess or deficient camber costs drag
      knob(boat, 'shape.dCd0TwistK', 0.0015) * Math.abs(dTwistDeg), // prov: assumed, twist mismatch costs drag
    // More twist lowers the centre of effort.
    dCEh: -knob(boat, 'shape.dCehPerDeg', 0.004) * dTwistDeg, // prov: assumed, fractional per degree
    dTwistDeg,
  };

  // sailset is part of the contract and picks which reference is carried by
  // the caller; nothing else here varies with it yet.
  void sailset;

  return { flat, reef, twistEffDeg, deltas };
}
