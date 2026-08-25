/**
 * The gennaker's drawn geometry, from the four downwind controls (ADR 0017).
 * Pure: no `three`, no DOM, no `src/core` — so the 3D hero and the 2D plan
 * view draw one kite from one mapping, and every claim below is a Vitest
 * assertion rather than something you have to squint at a screenshot to see.
 *
 * **Tier C, and it is a drawing, not physics.** The solver switches its aero
 * tables under `sailset = 'asym'` but `shape.asym` is a set of constants and
 * `DownControls` reach no number in it (`core/shape/flying.ts`). So the sheet,
 * tack line, halyard and sprit move the *picture* here, direction only: every
 * constant is `prov: assumed` with a row in `ASSUMPTIONS.md`, and none of them
 * is claimed to be a measurement. What is claimed is the direction of each
 * control and the sign conventions, which `kite.test.ts` holds.
 *
 * Frame, signs and datums are `conventions.ts` — the same ones the jib uses,
 * so the two sails cannot disagree about which way is leeward.
 *
 * The luff is the one thing that makes this sail different from the other two:
 * it is a free edge, not a stay. There is more cloth in it than the straight
 * line from tack to head, so it *has* to bow, and it bows to leeward and
 * forward. That surplus — the sail's luff length less the tack-to-head
 * distance — is the whole of the sag model.
 */
import boat from '../../../data/boats/j70.json';
import type { DownControls } from '../../core/types';
import {
  add,
  along,
  chordDir,
  DEG2RAD,
  lee,
  lerp3,
  norm,
  scaled,
  STEM_X,
  sub,
  type Side,
  type Vec3,
} from './conventions';
import type { SailChords, Spine } from './loft';

const asym = boat.sails.asym;
const SPRIT_M = boat.rig.bowspritOuterMm / 1000;
const MAST_LEN_M = boat.rig.mastLenM;
/** Luff length, m. prov: Class Rules / ORC sail definition, `sails.asym`. */
const LUFF_M = asym.luffMm / 1000;

// ---------------------------------------------------------------------------
// Chords
// ---------------------------------------------------------------------------

/**
 * How much of a measured girth the sail actually flies as a chord.
 * prov: assumed 0.85. The sail definition carries flat dimensions — foot
 * median and half width of a sail laid out — and a spinnaker is cut with
 * shape that a flat measurement cannot see, so the flying section is a curve
 * whose chord is shorter than the girth. Only the direction is claimed: the
 * flying chord is shorter, never longer. It scales every station equally, so
 * the silhouette's proportions are the sail definition's; only its size is
 * assumed.
 */
export const FLYING_CHORD_FRACTION = 0.85;

/**
 * Girth at height fraction `x`: the parabola through (0, foot), (½, half
 * width), (1, 0). That is ORC's spinnaker girth model, and it is the same
 * curve `core/geometry/sailplan.ts` integrates for the rated area — so the
 * drawn silhouette and the solver's area come off one distribution rather
 * than two guesses. prov: ORC spinnaker area formula (see `sailplan.ts`).
 */
export function kiteGirthM(x: number): number {
  const a = asym.footMm / 1000;
  const d = 4 * (a / 2 - asym.halfMm / 1000);
  const b = -a - d;
  const t = Math.min(1, Math.max(0, x));
  return Math.max(0, a + b * t + d * t * t);
}

const chordAt = (x: number): number => kiteGirthM(x) * FLYING_CHORD_FRACTION;

/**
 * Kite chords at the five stack heights, m. Head is zero: the ORC parabola
 * closes the sail to a point at the head, and a gennaker really does. The
 * loft's degenerate-row fallback handles it (`loft.ts:gridNormals`).
 */
export const KITE_CHORDS: SailChords = {
  foot: chordAt(0),
  quarter: chordAt(0.25),
  half: chordAt(0.5),
  threeQuarter: chordAt(0.75),
  head: chordAt(1),
};

// ---------------------------------------------------------------------------
// The four controls
// ---------------------------------------------------------------------------

/**
 * Tack height above the bowsprit, m: `TACK_MIN_M` strapped down at
 * `tackLine = 100`, climbing by `TACK_TRAVEL_M` as the line is eased.
 * prov: assumed. At full tension this puts the tack 0.8 m above the water on
 * the 0.75 m assumed freeboard, which is `core/geometry/sailplan.ts`'s
 * `geom.asymTackHeightM` (0.7 m, assumed) to within that freeboard.
 */
export const TACK_MIN_M = 0.05;
export const TACK_TRAVEL_M = 0.6;

/**
 * How far the head drops below the masthead at `kiteHalyard = 0`, m.
 * prov: assumed 1.2. A gennaker halyard is a hoist, not a trim control: this
 * is the range a trimmer would use to take tension out of the luff, and its
 * visible effect is the sag it adds, not the drop itself.
 */
export const HALYARD_DROP_M = 1.2;

/**
 * Sheeting angle off the centreline at full trim and full ease, degrees.
 * prov: assumed 25 → 60. Trimmed, the clew is aft and inboard; eased, it
 * swings forward and outboard. Both are monotone in the sheet across this
 * range, which is the claim `kite.test.ts` holds — the numbers are not.
 */
export const SHEET_TRIM_DEG = 25;
export const SHEET_EASE_DEG = 60;

/**
 * Ease past which the luff curls, as a fraction of sheet travel.
 * prov: assumed 0.55. "Ease until the luff curls, then trim" is the cue this
 * cue exists to teach, but curl onset is an aero event and nothing in the
 * solver knows about it: this is a geometric threshold on the sheet, labelled
 * as one wherever it is shown.
 */
export const CURL_EASE_THRESHOLD = 0.55;

/**
 * How far forward the luff bows, as a fraction of how far it bows to leeward.
 * prov: assumed 0.6. A free luff flies out ahead of the boat as well as to
 * leeward — further forward than the forestay's `SAG_FORWARD_FRACTION` (0.35),
 * because nothing holds it. Only the two directions are claimed, not the split.
 */
export const SAG_FORWARD_FRACTION = 0.6;

/**
 * Cap on the luff bow, as a fraction of the sail's luff length.
 * prov: assumed 0.3. Past this the parabola stops reading as a sail and starts
 * reading as a bag. Measured against the luff and not against the tack-to-head
 * distance deliberately: the latter shrinks as the halyard is eased, so a cap
 * in those terms would tighten exactly where the sail is going slacker, and
 * reverse the one direction this control claims.
 */
export const SAG_MAX_FRACTION = 0.3;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * The two things the kite hangs off. `Rig3D` satisfies it, so the 3D hero
 * passes its rig straight in; the plan view — which has no third axis, and no
 * business dragging the rig module into the first-load bundle — passes
 * `BARE_SPAR`.
 */
export interface KiteRig {
  /** Mast stations, heel (0) to masthead (last). */
  mast: Vec3[];
  masthead: Vec3;
}

/** An unraked, unbent spar: rake and bend do not project into a plan view. */
export const BARE_SPAR: KiteRig = {
  mast: [
    [0, 0, 0],
    [0, MAST_LEN_M, 0],
  ],
  masthead: [0, MAST_LEN_M, 0],
};

export interface KiteGeometry {
  /** On the bowsprit, `tackLine` above it. */
  tack: Vec3;
  /** On the mast, at the masthead when the halyard is home. */
  head: Vec3;
  /** Foot chord's aft end — the loft's foot row, last column. */
  clew: Vec3;
  /** Luff, tack (h = 0) to head (h = 1), bowed to leeward and forward. */
  spine: Spine;
  chords: SailChords;
  /** Sheeting angle off the centreline, radians, unsigned: `buildSail`'s base. */
  sheetRad: number;
  /** Eased past `CURL_EASE_THRESHOLD`: the luff is unloaded and curling. */
  curl: boolean;
}

const pct = (v: number): number => Math.min(1, Math.max(0, v / 100));

/**
 * The drawn kite for one set of downwind controls.
 *
 * ponytail: the camber and draft position are not in here. They come off
 * `shape.asym` through `loft.ts:sectionStack(shape, KITE_CHORDS)` at the call
 * site, which is where the main and jib get theirs — passing the shape in
 * would only be an argument this function ignored.
 */
export function kiteGeometry(down: DownControls, rig: KiteRig, side: Side): KiteGeometry {
  const tack: Vec3 = [
    STEM_X + SPRIT_M * pct(down.sprit),
    TACK_MIN_M + TACK_TRAVEL_M * (1 - pct(down.tackLine)),
    0,
  ];

  const drop = HALYARD_DROP_M * (1 - pct(down.kiteHalyard));
  const head = along(rig.mast, 1 - drop / MAST_LEN_M);

  // Luff sag from the surplus cloth. A parabola of maximum deflection d over a
  // chord c is about c·(1 + 8/3·(d/c)²) long, which inverts in closed form —
  // no root finder, and within about 2 % of the exact arc at the deflections
  // this reaches. Same reduction as the forestay's (`rig3d.ts`), same reason.
  const chordVec = sub(head, tack);
  const c = Math.hypot(...chordVec) || 1;
  const slack = Math.max(0, LUFF_M - c);
  const d = Math.min(SAG_MAX_FRACTION * LUFF_M, Math.sqrt((3 * c * slack) / 8));
  const bow = scaled(norm([SAG_FORWARD_FRACTION, 0, lee(side)]), d);
  // A quadratic's midpoint sits halfway to its control point, so the control
  // offset is twice the bow we want to see.
  const ctrl = add(lerp3(tack, head, 0.5), scaled(bow, 2));
  const spine: Spine = (h) => {
    const t = Math.min(1, Math.max(0, h));
    const u = 1 - t;
    return [0, 1, 2].map((k) => u * u * tack[k] + 2 * u * t * ctrl[k] + t * t * head[k]) as Vec3;
  };

  const ease = 1 - pct(down.kiteSheet);
  const sheetRad = (SHEET_TRIM_DEG + ease * (SHEET_EASE_DEG - SHEET_TRIM_DEG)) * DEG2RAD;

  return {
    tack,
    head,
    clew: add(tack, scaled(chordDir(sheetRad, side), KITE_CHORDS.foot)),
    spine,
    chords: KITE_CHORDS,
    sheetRad,
    curl: ease >= CURL_EASE_THRESHOLD,
  };
}
