/**
 * The gennaker's drawn geometry, from the four downwind controls (ADR 0017).
 * Pure: no `three`, no DOM, no `src/core` — so the 3D hero and the 2D plan
 * view draw one kite from one mapping, and every claim below is a Vitest
 * assertion rather than something you have to squint at a screenshot to see.
 *
 * **Tier C, and it is a drawing, not physics.** The solver switches its aero
 * tables under `sailset = 'asym'` but `shape.asym` is a set of constants and
 * `DownControls` reach no number in it (`core/shape/flying.ts`). So the sheet,
 * tack line, halyard and sprit move the *picture* here, direction only.
 *
 * What is *not* assumed any more, after research `2026-08-25-spinnaker`
 * (doc 02, doc 04 §2): the clew is pinned by the published leech and foot
 * lengths rather than swung on an invented chord, and the luff bows to
 * leeward or to windward according to the apparent wind angle, which two
 * full-scale measurement programmes agree on. Each constant below carries the
 * tag it has earned — `published`, `derived` or `assumed` — and the rows in
 * `ASSUMPTIONS.md` say which is which. What is claimed is still the direction
 * of each control and the sign conventions, which `kite.test.ts` holds.
 *
 * Frame, signs and datums are `conventions.ts` — the same ones the jib uses,
 * so the two sails cannot disagree about which way is leeward.
 *
 * The luff is the one thing that makes this sail different from the other two:
 * it is a free edge, not a stay. There is more cloth in it than the straight
 * line from tack to head, so it *has* to bow. That surplus — the sail's luff
 * length less the tack-to-head distance — is the whole of the sag magnitude;
 * `luffLateral` is the whole of its direction.
 */
import boat from '../../../data/boats/j70.json';
import type { DownControls } from '../../core/types';
import {
  add,
  along,
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
import { pchip, sectionStack, type SailChords, type Section, type Spine } from './loft';
import type { SailShape } from '../../core/types';

const asym = boat.sails.asym;
const SPRIT_M = boat.rig.bowspritOuterMm / 1000;
const MAST_LEN_M = boat.rig.mastLenM;
/** Luff length, m. prov: Class Rules / ORC sail definition, `sails.asym`. */
const LUFF_M = asym.luffMm / 1000;
/**
 * Leech and foot, m. prov: published — J/70 Class Rules G.5.3, carried in
 * `sails.asym`. These two are not decoration: together with the head and the
 * tack they *pin the clew to a circle* (`clewOnCircle`), which is where the
 * sheet then chooses a point. Before research doc 02 §6 the drawn leech
 * carried 25–40 % more cloth than the sail has.
 */
const LEECH_M = asym.leechMm / 1000;
const FOOT_M = asym.footMm / 1000;

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
/**
 * prov: research 2026-08-25-spinnaker doc 04 §2.4 — the J/70-specific figures
 * span 0–12 in (0–0.30 m) across four North and Doyle sources, so 0.3 m puts
 * the fully-eased tack at the top of the class band rather than at double it.
 * Was 0.6, which with `TACK_MIN_M` gave 0.65 m of travel — above every cited
 * J/70 source, and above the 0–12 in band the downwind panel prints beside it
 * (`src/ui/race/downwind.ts`). The sportboat literature reaches 18 in, but
 * this is a J/70. Doc 04's second half — showing the source spread as a band
 * instead of one number — is still open.
 */
export const TACK_TRAVEL_M = 0.3;

/**
 * How far the head drops below the masthead at `kiteHalyard = 0`, m.
 * prov: assumed 1.2. A gennaker halyard is a hoist, not a trim control: this
 * is the range a trimmer would use to take tension out of the luff, and its
 * visible effect is the sag it adds, not the drop itself.
 */
export const HALYARD_DROP_M = 1.2;

/**
 * Sheeting angle off the centreline at full trim and full ease, degrees.
 * prov: assumed 25 → 60, but now only as a *band*: the clew's distance from
 * the tack and from the head is no longer a choice at all (`clewOnCircle`),
 * so these two pick an arc on a derived circle rather than inventing a clew
 * position. Both endpoints sit inside the circle's achievable 18°–89°
 * (research doc 04 §2.2). Trimmed, the clew is aft, inboard and low; eased, it
 * swings forward, outboard and *up*. All three are monotone in the sheet
 * across this range, which is the claim `kite.test.ts` holds.
 */
export const SHEET_TRIM_DEG = 25;
export const SHEET_EASE_DEG = 60;

/**
 * The apparent wind angles at which the luff was measured wholly to leeward
 * and wholly to windward, degrees. prov: published — research
 * `2026-08-25-spinnaker` doc 02 §3.2, from two independent full-scale
 * programmes. Deparday's J/80 (`F1`): at AWA 64° "the whole luff is on the
 * leeward side of the boat"; "for deeper AWA, the spinnaker has a more rounded
 * shape with the luff rotating to the windward side", the deepest run measured
 * being 141°. Motta et al. (`F2`) see the same crossing: "as the AWA is
 * increased, the luff moves more to windward, towards and across the
 * centreline".
 */
export const LUFF_LEEWARD_AWA_DEG = 64;
export const LUFF_WINDWARD_AWA_DEG = 141;

/**
 * Where the luff crosses the centreline, degrees: the midpoint of the two
 * measured endpoints, 102.5°. prov: derived from those two published angles,
 * and it lands inside the 100–120° band research doc 04 §2.1 proposes.
 * Nothing measures the crossing more tightly than "between 64° and 124°"
 * (doc 04 row 29), so the *linear ramp* either side of it — and the assumption
 * that the windward excursion is as large as the leeward one — stay assumed.
 */
export const LUFF_CROSSOVER_AWA_DEG = (LUFF_LEEWARD_AWA_DEG + LUFF_WINDWARD_AWA_DEG) / 2;

/**
 * Athwartships direction and share of the luff bow at an apparent wind angle:
 * +1 fully to leeward, -1 fully to windward, linear between the measured
 * endpoints and clamped outside them.
 *
 * The J/70's own downwind optimum is 142–174° TWA, which is entirely inside
 * the windward-luff regime — so before this the app drew the luff on the wrong
 * side of the boat at exactly the angles the gennaker is used at, while
 * shipping a coaching cue about rotating the sail to weather that the picture
 * contradicted (research doc 04 §2.1).
 *
 * The *magnitude* of the bow is untouched by this: `kiteGeometry` normalises
 * the direction and then scales it by the arc-length surplus, so at the
 * crossover the luff bows the same distance, straight ahead of the boat.
 */
export function luffLateral(awaDeg: number): number {
  const span = LUFF_WINDWARD_AWA_DEG - LUFF_LEEWARD_AWA_DEG;
  const t = (Math.abs(awaDeg) - LUFF_LEEWARD_AWA_DEG) / span;
  return Math.min(1, Math.max(-1, 1 - 2 * t));
}

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
 * leeward — further forward than the forestay's own forward fraction
 * (`SAG_FORWARD_FRACTION` = 0.35 in `rig3d.ts`), because a forestay is held at
 * both ends and a free luff is not. Only the two directions are claimed, not
 * the split. Named for the luff, not "sag", so it cannot be confused with the
 * forestay constant again: the two shared a name and disagreed on value.
 */
export const LUFF_FORWARD_FRACTION = 0.6;

/**
 * Cap on the luff bow, as a fraction of the sail's luff length.
 * prov: assumed 0.3. Past this the parabola stops reading as a sail and starts
 * reading as a bag. Measured against the luff and not against the tack-to-head
 * distance deliberately: the latter shrinks as the halyard is eased, so a cap
 * in those terms would tighten exactly where the sail is going slacker, and
 * reverse the one direction this control claims.
 */
export const SAG_MAX_FRACTION = 0.3;

/**
 * Leech bulge: how far the leech stands out to leeward and forward of the
 * straight head→clew line, m, at full trim and the travel added by full ease.
 * A straight leech into the masthead makes every upper section hook inboard
 * — the top of the sail reads closed, and easing the sheet cannot open it,
 * because the head is pinned. The real leech falls away to leeward in its
 * upper half (the shoulders every photograph of a J/70 kite shows), most
 * of all when the sheet is eased and the leech twists open.
 * prov: assumed 0.4 m trimmed, +0.7 m eased, peak at ~63 % height, 0.4 of
 * the bulge forward — read off photographs (owner-supplied, 2026-08-26) and
 * the twist-opens-with-ease direction in research doc 02 §5; no measured
 * leech profile exists. The leech's cloth length stays the published
 * 8.8 m: the straight head→clew distance is shortened by the arc surplus.
 */
export const LEECH_BULGE_MIN_M = 0.4;
export const LEECH_BULGE_TRAVEL_M = 0.7;
export const LEECH_BULGE_FORWARD_FRACTION = 0.4;
/** `sin(π·t^k)` peaks where t^k = ½: k = 1.5 puts it at ~63 % of the leech. */
export const LEECH_BULGE_PEAK_EXPONENT = 1.5;

/**
 * The straight chord that, bulged by `bulge` on `leechBulgeProfile`, has arc
 * length `arcM`. The profile is not a parabola, so this is a numerical
 * length rather than the closed form the luff uses: 64 samples, three
 * fixed-point passes, deterministic, and within 0.1 % of the sampled arc.
 */
export function chordForArc(arcM: number, bulge: number): number {
  const N = 64;
  const arcOf = (c: number): number => {
    let len = 0;
    let px = 0;
    let py = 0;
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      const x = c * t;
      const y = bulge * leechBulgeProfile(t);
      len += Math.hypot(x - px, y - py);
      px = x;
      py = y;
    }
    return len;
  };
  let c = arcM;
  for (let k = 0; k < 3; k++) c = (c * arcM) / arcOf(c);
  return c;
}

/** Where along the leech (0 clew, 1 head) the bulge profile is, 0..1. */
export function leechBulgeProfile(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return Math.sin(Math.PI * Math.pow(u, LEECH_BULGE_PEAK_EXPONENT));
}

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

/**
 * The clew, for a rig and a sheeting angle.
 *
 * The clew is not a free parameter and never was. The leech and the foot are
 * published dimensions, so the clew sits where a sphere of radius `LEECH_M`
 * about the head meets a sphere of radius `FOOT_M` about the tack — a circle.
 * The sheet chooses a *point on that circle*; it does not choose the clew's
 * distance from anything (research doc 02 §6, doc 04 §2.2). prov: derived.
 *
 * The parametrisation is the sheeting angle the rest of the app already
 * speaks: `thetaRad` unsigned off the centreline, measured in plan from the
 * tack, so the clew's offset from the tack is `[-r·cos θ, dy, lee·r·sin θ]`.
 * Two conditions — that offset is `FOOT_M` long, and its projection on the
 * tack→head axis is fixed by the two radii — leave a quadratic in `r` with one
 * root aft and to leeward. No root finder, and it reproduces doc 02 §6's
 * solved table to within 5 cm (the measured spread is 3.6–4.3 cm).
 *
 * The visible consequence, and the reason this is worth the algebra: **easing
 * the sheet lifts the clew**, ~0.3 m per 10° of ease. The old construction
 * held it at the tack's height at every setting, because `chordDir` has no
 * vertical component.
 */
export function clewOnCircle(
  tack: Vec3,
  head: Vec3,
  thetaRad: number,
  side: Side,
  leechM = LEECH_M,
): Vec3 {
  const v = sub(head, tack);
  const L = Math.hypot(...v) || 1;
  const u = scaled(v, 1 / L);
  // Where the circle's plane cuts the tack→head axis, measured from the tack.
  const a = (L * L + FOOT_M * FOOT_M - leechM * leechM) / (2 * L);
  const s = lee(side);
  const A = -u[0] * Math.cos(thetaRad) + s * u[2] * Math.sin(thetaRad);
  const uy = u[1] || 1e-9;
  const disc = FOOT_M * FOOT_M * (uy * uy + A * A) - a * a;
  // `disc` is positive for every reachable rig state; the guard only keeps a
  // degenerate spar (head on top of the tack) from emitting NaN.
  const r = disc > 0 ? (a * A + uy * Math.sqrt(disc)) / (uy * uy + A * A) : 0;
  return add(tack, [-r * Math.cos(thetaRad), (a - A * r) / uy, s * r * Math.sin(thetaRad)]);
}

export interface KiteGeometry {
  /** On the bowsprit, `tackLine` above it. */
  tack: Vec3;
  /** On the mast, at the masthead when the halyard is home. */
  head: Vec3;
  /** On the leech/foot circle, at the sheet's angle around it. */
  clew: Vec3;
  /** Luff, tack (h = 0) to head (h = 1), bowed by `luffLateral(awaDeg)`. */
  spine: Spine;
  chords: SailChords;
  /** Sheeting angle off the centreline, radians, unsigned: `buildSail`'s base. */
  sheetRad: number;
  /** Straight head→clew distance, m: the published leech less the bulge's arc surplus. */
  leechChord: number;
  /** Eased past `CURL_EASE_THRESHOLD`: the luff is unloaded and curling. */
  curl: boolean;
  /**
   * The loft's sections: chord and twist per height taken from the bowed luff
   * to `leechAt`, the bulged leech. Both edges bow, and they bow
   * independently — the luff on its own parabola, the leech on
   * `leechBulgeProfile` — which is the point: carrying one edge's bow into
   * the other is what made the sail read as a banana from astern. Camber and
   * draft position are `shape.asym`'s.
   */
  sections: (shape: SailShape) => Section[];
  /** The leech point at height `y` (clamped to the clew→head span). */
  leechAt: (y: number) => Vec3;
}

const pct = (v: number): number => Math.min(1, Math.max(0, v / 100));

/**
 * The drawn kite for one set of downwind controls at one apparent wind angle.
 *
 * `awaDeg` is the solver's own `aero.awaDeg` (sign is ignored — the luff
 * rotates the same way on either tack). It is not the control-to-physics link
 * ADR 0017 refused: it is a solver *output* steering a drawing, and the
 * direction it steers is measured (`luffLateral`).
 *
 * ponytail: the camber and draft position are not in here. They come off
 * `shape.asym` through `loft.ts:sectionStack(shape, KITE_CHORDS)` at the call
 * site, which is where the main and jib get theirs — passing the shape in
 * would only be an argument this function ignored.
 */
export function kiteGeometry(
  down: DownControls,
  rig: KiteRig,
  side: Side,
  awaDeg: number,
): KiteGeometry {
  const tack: Vec3 = [
    STEM_X + SPRIT_M * pct(down.sprit),
    TACK_MIN_M + TACK_TRAVEL_M * (1 - pct(down.tackLine)),
    0,
  ];

  const drop = HALYARD_DROP_M * (1 - pct(down.kiteHalyard));
  const head = along(rig.mast, 1 - drop / MAST_LEN_M);

  // Luff sag from the surplus cloth. A parabola of maximum deflection d over a
  // chord c is about c·(1 + 8/3·(d/c)²) long, which inverts in closed form —
  // no root finder, and within about 3 % of the exact arc at the deflections
  // this reaches. Same reduction as the forestay's (`rig3d.ts`), same reason.
  const chordVec = sub(head, tack);
  const c = Math.hypot(...chordVec) || 1;
  const slack = Math.max(0, LUFF_M - c);
  const d = Math.min(SAG_MAX_FRACTION * LUFF_M, Math.sqrt((3 * c * slack) / 8));
  // Direction, not magnitude: `norm` is applied before `d`, so the bow is the
  // same distance at every apparent wind angle and only swings from leeward
  // (reaching) through straight ahead (the crossover) to windward (running).
  const bow = scaled(norm([LUFF_FORWARD_FRACTION, 0, lee(side) * luffLateral(awaDeg)]), d);
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
  // The leech bows out by `bulge`; the same parabola-length reduction as the
  // luff turns the published cloth length into the straight head→clew chord.
  const bulge = LEECH_BULGE_MIN_M + ease * LEECH_BULGE_TRAVEL_M;
  const leechChord = chordForArc(LEECH_M, bulge);
  const clew = clewOnCircle(tack, head, sheetRad, side, leechChord);
  const bulgeDir = norm([LEECH_BULGE_FORWARD_FRACTION, 0, lee(side)]);

  // The leech runs head → clew and then stands off that line by its own
  // bulge, most of all in the upper half where the shoulders are. It is not
  // the luff's bow: the two edges are shaped independently, which is the
  // whole point. Lofting each section as luff point + a fixed chord vector
  // carried the luff's bow into the leech too, and the sail read as a banana
  // from astern. Each section here spans from the bowed luff to `leechAt` at
  // the same height, so the loft's chord and twist follow the real leech.
  //
  // Now that the clew is on the leech/foot circle it no longer sits at exactly
  // the tack's height: trimmed it hangs a little below, eased it climbs above.
  // The clamp is what handles the second case — the sections between the two
  // heights all end at the clew — and it is why the foot row's outboard end is
  // on the leech line rather than on the clew itself.
  const leechAt = (y: number): Vec3 => {
    const t = Math.min(1, Math.max(0, (y - clew[1]) / (head[1] - clew[1] || 1)));
    return add(lerp3(clew, head, t), scaled(bulgeDir, bulge * leechBulgeProfile(t)));
  };
  // Thirty-three knots, not the stack's five: the loft interpolates chord and
  // twist between knots, and five cannot follow a parabolic luff closely
  // enough to keep the leech on its line (measured 0.57 m off; 17 keeps it
  // under a few centimetres). Camber, draft position and entry are the
  // stack's, interpolated the same way the loft would have.
  const sections = (shape: SailShape): Section[] => {
    const stack = sectionStack(shape, KITE_CHORDS);
    const hs = stack.map((k) => k.h);
    const camber = pchip(
      hs,
      stack.map((k) => k.camber),
    );
    const draftPos = pchip(
      hs,
      stack.map((k) => k.draftPos),
    );
    const entry = pchip(
      hs,
      stack.map((k) => k.entryRad),
    );
    const KNOTS = 33;
    return Array.from({ length: KNOTS }, (_, i) => {
      const h = i / (KNOTS - 1);
      const luff = spine(h);
      const v = sub(leechAt(luff[1]), luff);
      const chord = Math.hypot(v[0], v[2]);
      // `chordDir(theta)` = (−cos θ, 0, lee·sin θ); invert it for this chord.
      const theta = chord > 1e-6 ? Math.atan2(lee(side) * v[2], -v[0]) : sheetRad;
      return {
        h,
        chord,
        camber: camber(h),
        draftPos: draftPos(h),
        entryRad: entry(h),
        twistRad: theta - sheetRad,
      };
    });
  };

  return {
    tack,
    head,
    clew,
    spine,
    chords: KITE_CHORDS,
    sheetRad,
    leechChord,
    leechAt,
    curl: ease >= CURL_EASE_THRESHOLD,
    sections,
  };
}
