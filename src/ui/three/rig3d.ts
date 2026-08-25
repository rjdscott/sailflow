/**
 * Rig geometry in three dimensions: the bent mast, the sagging forestay, the
 * standing rigging, the boom, and the two luff spines the sails hang off.
 * Pure: no `three`, no DOM.
 *
 * Every reduction here is the one `race/rigLayout.ts` already uses for the 2D
 * side elevation — mast heel at the sheer, stem J forward of it, hounds at
 * I/mastLen up the spar, gooseneck at (mastLen - P)/mastLen — so the two
 * drawings cannot disagree about where anything is.
 *
 * **Bend, sag and rake are all drawn true.** The 2D elevation exaggerates bend
 * and sag by 5x because millimetres on an eight-metre spar are invisible in a
 * 280-unit viewBox. A 3D view can be orbited and zoomed, so it does not need
 * the lie, and a lie here would put the luff spine — and therefore the sails —
 * somewhere the boat never puts them.
 */
import boat from '../../../data/boats/j70.json';
import type { RigState } from '../../core/types';
import {
  add,
  along,
  chordDir,
  DEG2RAD,
  lee,
  lerp3,
  scaled,
  type Side,
  type Vec3,
} from './conventions';
import { STEM_X, TRANSOM_X } from './hull';
import type { SailChords, Spine } from './loft';

const { iM, jM, pM, eM, mastLenM, spreaderZM, spreaderLenM, sweepDeg, chainplateYM } = boat.rig;

/**
 * How far forward the forestay bows, as a fraction of how far it bows to
 * leeward. prov: assumed 0.35. Forestay sag is driven by jib load, not by the
 * wire's own weight, and that load pulls forward as well as to leeward
 * (research 03, source 35), so the offset has to be a 3D vector rather than
 * the in-plane one the side elevation draws. The split is assumed; only the
 * two directions are claimed.
 */
export const SAG_FORWARD_FRACTION = 0.35;

/** Samples along the forestay curve. Enough that the jib luff reads smooth. */
const FORESTAY_SAMPLES = 16;

/** Mainsail chords at the five stack heights, m. prov: Class Rules G.3 girths. */
export const MAIN_CHORDS: SailChords = {
  foot: boat.sails.main.footMm / 1000,
  quarter: boat.sails.main.quarterMm / 1000,
  half: boat.sails.main.halfMm / 1000,
  threeQuarter: boat.sails.main.threeQuarterMm / 1000,
  head: boat.sails.main.topMm / 1000,
};

/** Headsail chords, m. prov: Class Rules G.4.3 (foot is LP). */
export const JIB_CHORDS: SailChords = {
  foot: boat.sails.jib.lpMm / 1000,
  quarter: boat.sails.jib.quarterMm / 1000,
  half: boat.sails.jib.halfMm / 1000,
  threeQuarter: boat.sails.jib.threeQuarterMm / 1000,
  head: boat.sails.jib.topMm / 1000,
};

export interface Rig3D {
  /** 11 bend stations, heel (0) to masthead (10). */
  mast: Vec3[];
  /** Sampled forestay, stem (0) to hounds (last). */
  forestay: Vec3[];
  boom: [Vec3, Vec3];
  /** Shrouds, spreaders, backstay and bowsprit as `LineSegments` vertex pairs. */
  lines: Float32Array;
  gooseneck: Vec3;
  hounds: Vec3;
  masthead: Vec3;
  /** Mainsail luff: gooseneck (h = 0) to masthead (h = 1), up the bent spar. */
  mainSpine: Spine;
  /** Headsail luff: stem (h = 0) to hounds (h = 1), along the sagged forestay. */
  jibSpine: Spine;
}

/**
 * Everything the scene needs from the rig state.
 *
 * `boomAngleRad` is the unsigned boom angle off the centreline (what
 * `race/boat.ts:boomAngle` returns, in radians); `side` is the tack.
 */
export function rig3d(rig: RigState, side: Side, boomAngleRad: number): Rig3D {
  const n = rig.bendMm.length;
  // Bend bows the spar forward (+x); rake leans the tip aft (-x), spread
  // linearly up the mast — the same reduction as `race/geometry.ts:mastPoints`.
  const mast: Vec3[] = rig.bendMm.map((bendMm, i) => {
    const f = n > 1 ? i / (n - 1) : 0;
    return [(bendMm - rig.rakeMm * f) / 1000, mastLenM * f, 0];
  });

  const masthead = mast[mast.length - 1];
  const hounds = along(mast, iM / mastLenM);
  const gooseFrac = (mastLenM - pM) / mastLenM;
  const gooseneck = along(mast, gooseFrac);
  const stem: Vec3 = [STEM_X, 0, 0];

  // Forestay: a quadratic Bezier. A parabola is within 1 % of a catenary at
  // these sag ratios, and sail load rather than self-weight is what bows it,
  // so it is the more correct model as well as the cheaper one (research 03,
  // sources 34 and 35). A quadratic's midpoint sits halfway to its control
  // point, so the control offset is twice the sag we want to see.
  const sagM = rig.sagMm / 1000;
  const sagVec: Vec3 = [SAG_FORWARD_FRACTION * sagM, 0, lee(side) * sagM];
  const ctrl = add(lerp3(stem, hounds, 0.5), scaled(sagVec, 2));
  const forestay: Vec3[] = Array.from({ length: FORESTAY_SAMPLES + 1 }, (_, i) => {
    const t = i / FORESTAY_SAMPLES;
    const u = 1 - t;
    return [0, 1, 2].map((k) => u * u * stem[k] + 2 * u * t * ctrl[k] + t * t * hounds[k]) as Vec3;
  });

  const boomTip = add(gooseneck, scaled(chordDir(boomAngleRad, side), eM));

  // --- standing rigging -----------------------------------------------------
  const spreaderRoot = along(mast, spreaderZM / mastLenM);
  const sweep = sweepDeg * DEG2RAD;
  const aft = -spreaderLenM * Math.sin(sweep);
  const half = spreaderLenM * Math.cos(sweep);
  const segs: [Vec3, Vec3][] = [
    [masthead, [TRANSOM_X, 0, 0]],
    [stem, [STEM_X + boat.rig.bowspritOuterMm / 1000, 0, 0]],
  ];
  for (const s of [1, -1]) {
    const tip: Vec3 = [spreaderRoot[0] + aft, spreaderRoot[1], s * half];
    const plate: Vec3 = [0, 0, s * chainplateYM];
    segs.push([spreaderRoot, tip], [plate, tip], [tip, hounds], [plate, spreaderRoot]);
  }
  const lines = new Float32Array(segs.length * 6);
  segs.forEach(([a, b], i) => lines.set([...a, ...b], i * 6));

  return {
    mast,
    forestay,
    boom: [gooseneck, boomTip],
    lines,
    gooseneck,
    hounds,
    masthead,
    mainSpine: (h) => along(mast, gooseFrac + (1 - gooseFrac) * h),
    jibSpine: (h) => along(forestay, h),
  };
}

/** Boom length, m: `E`, the chord the foot section is lofted along. */
export const BOOM_M = eM;
/** Foretriangle base, m. */
export const J_M = jM;
