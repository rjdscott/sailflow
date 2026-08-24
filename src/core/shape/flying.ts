/**
 * Rig state + race controls -> flying shape (draft depth, draft position,
 * twist, entry and exit angle) at the quarter, half and three-quarter
 * height of each sail.
 *
 * INVENTED layer, not ORC. Research finding 2: there is no public
 * bend-to-flying-shape data for the J/70, and the ORC sail model has no
 * shape input at all. Every gain below is a calibration knob with a
 * documented sign; only the signs and the orderings are claimed correct
 * (ADR 0006). Outputs downstream of this file are tier B or C.
 *
 * Signs, all tested:
 *   main  bend up        -> draft down, twist up
 *         outhaul up     -> lower-section draft down
 *         mainsheet ease -> twist up
 *         vang up        -> twist down
 *         traveller up   -> twist down (small)
 *         cunningham /
 *         main halyard up-> draft position forward
 *   jib   forestay sag up-> draft up (and a rounder entry, via draft)
 *         jib halyard up -> draft position forward
 *         jib lead aft   -> twist up, foot depth down
 *         inhauler up    -> entry angle shifted narrower
 *   asym  coarse constants; DownControls are not part of FlyingShapeFn's
 *         input, so the kite shape does not respond to kite trim yet.
 */
import type {
  BoatDefinition,
  RaceControls,
  RigState,
  SailId,
  SailShape,
  SectionShape,
} from '../types';
import { knob } from '../internal';
import { peakBendMm } from '../rig/state';

const DEG = 180 / Math.PI;

/** Physical clamps. prov: assumed, the range soft sails actually fly in. */
const DRAFT_MIN = 0.05;
const DRAFT_MAX = 0.25;
const DRAFT_POS_MIN = 0.3;
const DRAFT_POS_MAX = 0.6;
const TWIST_MIN = 0;
const TWIST_MAX = 30;

/** The three reported heights, as fractions of the luff. */
const HEIGHTS = [0.25, 0.5, 0.75] as const;

/** Per-height multipliers. prov: assumed; sails flatten and twist toward the head. */
const MAIN_DRAFT_F = [1.0, 0.95, 0.8];
const MAIN_OUTHAUL_F = [1.0, 0.4, 0.1];
const JIB_DRAFT_F = [1.0, 0.95, 0.75];
const JIB_LEAD_F = [1.0, 0.3, 0.0];
const TWIST_F = [0.3, 0.65, 1.0];
const ASYM_DRAFT_F = [1.0, 1.0, 0.85];
const ASYM_TWIST_F = [0.5, 0.8, 1.0];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Entry and exit half-angles of a circular-arc camber line with the given
 * depth and chordwise position of maximum depth, degrees.
 */
function angles(draft: number, draftPos: number): { entryDeg: number; exitDeg: number } {
  return {
    entryDeg: Math.atan((2 * draft) / draftPos) * DEG,
    exitDeg: Math.atan((2 * draft) / (1 - draftPos)) * DEG,
  };
}

function section(
  draft: number,
  draftPos: number,
  twistDeg: number,
  entryShiftDeg = 0,
): SectionShape {
  const d = clamp(draft, DRAFT_MIN, DRAFT_MAX);
  const p = clamp(draftPos, DRAFT_POS_MIN, DRAFT_POS_MAX);
  const a = angles(d, p);
  return {
    draft: d,
    draftPos: p,
    twistDeg: clamp(twistDeg, TWIST_MIN, TWIST_MAX),
    entryDeg: a.entryDeg + entryShiftDeg,
    exitDeg: a.exitDeg,
  };
}

function shapeOf(sections: SectionShape[]): SailShape {
  return { quarter: sections[0], half: sections[1], threeQuarter: sections[2] };
}

function mainShape(boat: BoatDefinition, rig: RigState, race: RaceControls): SailShape {
  const bendM = peakBendMm(rig) / 1000;
  const draftBase = knob(boat, 'shape.mainDraftBase', 0.12); // prov: assumed, unbent mainsail camber
  const bendToDraft = knob(boat, 'shape.bendToDraft', 0.45); // prov: assumed, per metre of bend; sign: bend flattens
  const outhaulToDraft = knob(boat, 'shape.outhaulToDraft', 0.035); // prov: assumed, full outhaul at the foot
  const posBase = knob(boat, 'shape.mainDraftPosBase', 0.45); // prov: assumed
  const cunToPos = knob(boat, 'shape.cunninghamToDraftPos', 0.06); // prov: assumed; sign: luff tension pulls draft forward
  const halToPos = knob(boat, 'shape.halyardToDraftPos', 0.04); // prov: assumed, same mechanism, weaker
  const twistBase = knob(boat, 'shape.mainTwistBase', 8); // prov: assumed, degrees at the three-quarter height
  const sheetToTwist = knob(boat, 'shape.sheetToTwist', 0.12); // prov: assumed, deg per % of sheet ease
  const vangToTwist = knob(boat, 'shape.vangToTwist', 0.05); // prov: assumed, deg per % vang; sign: vang closes the leech
  const travToTwist = knob(boat, 'shape.travellerToTwist', 0.008); // prov: assumed, deg per % traveller; small by design
  const bendToTwist = knob(boat, 'shape.bendToTwist', 40); // prov: assumed, deg per metre of bend; bend opens the leech

  const draftPos =
    posBase - (cunToPos * race.cunningham) / 100 - (halToPos * race.mainHalyard) / 100;
  const twistTop =
    twistBase +
    sheetToTwist * (100 - race.mainsheet) -
    vangToTwist * race.vang -
    travToTwist * race.traveller +
    bendToTwist * bendM;

  return shapeOf(
    HEIGHTS.map((_, i) =>
      section(
        draftBase * MAIN_DRAFT_F[i] -
          bendToDraft * bendM -
          ((outhaulToDraft * race.outhaul) / 100) * MAIN_OUTHAUL_F[i],
        draftPos,
        twistTop * TWIST_F[i],
      ),
    ),
  );
}

function jibShape(boat: BoatDefinition, rig: RigState, race: RaceControls): SailShape {
  const draftBase = knob(boat, 'shape.jibDraftBase', 0.1); // prov: assumed, jib camber on a straight forestay
  const sagToDraft = knob(boat, 'shape.sagToDraft', 0.0006); // prov: assumed, per mm of sag; sign: sag adds camber
  const leadToFoot = knob(boat, 'shape.leadToFootDraft', 0.004); // prov: assumed, per hole; sign: aft lead flattens the foot
  const posBase = knob(boat, 'shape.jibDraftPosBase', 0.4); // prov: assumed
  const halToPos = knob(boat, 'shape.jibHalyardToDraftPos', 0.06); // prov: assumed; sign: halyard pulls draft forward
  const twistBase = knob(boat, 'shape.jibTwistBase', 6); // prov: assumed, degrees at the three-quarter height
  const leadToTwist = knob(boat, 'shape.leadToTwist', 0.9); // prov: assumed, deg per hole; sign: aft lead opens the leech
  const sheetToTwist = knob(boat, 'shape.jibSheetToTwist', 0.08); // prov: assumed, deg per % of sheet ease
  const inhaulerToEntry = knob(boat, 'shape.inhaulerToEntryDeg', -4); // prov: assumed, deg at full inhauler; sign: narrower sheeting

  // prov: assumed. Lead holes are counted from the base setting in baseRace().
  const leadFromBase = race.jibLead - 5;
  const draftPos = posBase - (halToPos * race.jibHalyard) / 100;
  const twistTop = twistBase + leadToTwist * leadFromBase + sheetToTwist * (100 - race.jibSheet);
  const entryShift = (inhaulerToEntry * race.inhauler) / 100;

  return shapeOf(
    HEIGHTS.map((_, i) =>
      section(
        draftBase * JIB_DRAFT_F[i] +
          sagToDraft * rig.sagMm -
          leadToFoot * leadFromBase * JIB_LEAD_F[i],
        draftPos,
        twistTop * TWIST_F[i],
        entryShift,
      ),
    ),
  );
}

function asymShape(boat: BoatDefinition): SailShape {
  // ponytail: constants. FlyingShapeFn takes RaceControls, which carries no
  // kite trim, so there is nothing here to respond to. Wire the kite up when
  // DownControls reach this signature.
  const draft = knob(boat, 'shape.asymDraft', 0.17); // prov: assumed, deep running sail
  const draftPos = knob(boat, 'shape.asymDraftPos', 0.45); // prov: assumed
  const twist = knob(boat, 'shape.asymTwistBase', 12); // prov: assumed, degrees at the head
  return shapeOf(
    HEIGHTS.map((_, i) => section(draft * ASYM_DRAFT_F[i], draftPos, twist * ASYM_TWIST_F[i])),
  );
}

export function flyingShape(
  boat: BoatDefinition,
  rig: RigState,
  race: RaceControls,
  sail: SailId,
): SailShape {
  if (sail === 'main') return mainShape(boat, rig, race);
  if (sail === 'jib') return jibShape(boat, rig, race);
  return asymShape(boat);
}
