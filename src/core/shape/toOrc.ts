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

/**
 * The draft depth the breeze wants, as a fraction of the base setup's.
 *
 * `flat` keeps the base setup as its datum: that is what flat *means* in ORC
 * §5.1.3 — 1 is full power, measured from the trimmer's own reference — and it
 * only ever falls. The CLmax and CD0 penalties cannot share that datum. A
 * section is too flat or too full only relative to what the wind wants, and
 * the base trim is one wind band, not all of them. Measured from one fixed
 * datum the penalty is a symmetric well that flattening always climbs *down*
 * into, so backstay is free-to-favourable at every TWS and the model's own
 * optimum inverts both tuning guides at both ends of the range (audit ux-02
 * H-04: backstay 80 % wanted at 6 kt flat water, 15 % at 20 kt survival).
 *
 * Direction — full in light air, flat in breeze — is the whole claim.
 * prov: assumed magnitudes; direction from `data/tuning/quantum-j70.json`,
 * which publishes backstay 25 % at and below 12 kt, 50 % at 12-14, 75 % at
 * 14-18, 90 % at 20-23, and from `data/tuning/north-j70.json`, whose light
 * bands pair a loose outhaul and no vang with its 12 kt+ bands' 100 % of both.
 * ORC's own optimiser produces the same trend through flat (invariant 6).
 *
 * ponytail: linear in TWS with a clamp. A table like the guides' own bands is
 * the upgrade path if a residual ever asks for the shape of the curve.
 */
export function targetDraftMul(boat: BoatDefinition, twsKt: number): number {
  const refKt = knob(boat, 'shape.draftTargetRefKt', 12); // prov: assumed, the wind band baseRace() is the app's reading of
  const perKt = knob(boat, 'shape.draftTargetPerKt', 0.025); // prov: assumed, fraction of base draft per kt from that band
  const span = knob(boat, 'shape.draftTargetSpan', 0.25); // prov: assumed clamp, keeps the target inside the range soft sails fly in
  return clamp(1 + perKt * (refKt - twsKt), 1 - span, 1 + span);
}

export function shapeToOrc(
  boat: BoatDefinition,
  shapes: Partial<Record<SailId, SailShape>>,
  race: RaceControls,
  sailset: SailSet,
  /** Omitted = score the shape against the base band, i.e. no wind trend. */
  twsKt?: number,
): ShapeToOrcResult {
  const carried = (Object.keys(shapes) as SailId[]).filter((s) => shapes[s]);
  const ref = referenceShapes(boat, carried, sailset);

  const draft = meanDraft(shapes);
  const refDraft = meanDraft(ref);
  const twistEffDeg = meanTwist(shapes);
  const refTwist = meanTwist(ref);

  // Relative draft deviation from the base setup. Negative = flatter.
  const d = refDraft > 0 ? (draft - refDraft) / refDraft : 0;
  // Deviation from the depth *this breeze* wants, which is what the CLmax and
  // CD0 penalties below are measured on. Equals `d` at the reference band.
  const targetDraft = refDraft * (twsKt === undefined ? 1 : targetDraftMul(boat, twsKt));
  const dOpt = targetDraft > 0 ? (draft - targetDraft) / targetDraft : 0;
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
    // Quadratic in the deviation from the depth the breeze wants: both a
    // rounder and a flatter section than that loses CLmax, rounder because the
    // entry stalls early, flatter because there is less camber to lift with.
    dCLmax: -knob(boat, 'shape.dClmaxK', 0.35) * dOpt * dOpt, // prov: assumed
    dCD0:
      knob(boat, 'shape.dCd0DraftK', 0.02) * dOpt * dOpt + // prov: assumed, excess or deficient camber costs drag
      knob(boat, 'shape.dCd0TwistK', 0.0015) * Math.abs(dTwistDeg), // prov: assumed, twist mismatch costs drag
    // More twist lowers the centre of effort.
    dCEh: -knob(boat, 'shape.dCehPerDeg', 0.004) * dTwistDeg, // prov: assumed, fractional per degree
    dTwistDeg,
  };

  return { flat, reef, twistEffDeg, deltas };
}
