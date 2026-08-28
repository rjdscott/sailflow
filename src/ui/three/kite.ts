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
 *
 * ## Flying shape (2026-08-28, plan `2026-08-28-downwind-fidelity` phase 02)
 *
 * The owner's report on 0.5.0 was "the spinnaker doesn't look the right
 * shape", and the number behind it is the class half width. Every section
 * here spans from the bowed luff to `leechAt`, so **the leech is the
 * silhouette**: a leech drawn nearly straight into the masthead left the
 * drawn half width at 4.79–5.15 m against the class's published 5.560 mm,
 * 7–14 % narrow at exactly the height a spinnaker carries its shoulders. A
 * sail that narrow *measures* — on ORC's own formula, taken off the drawn
 * loft — 39.9–42.4 m² against the class's 45.64. It read as a big headsail
 * because at those dimensions it was one. The three changes, all in the
 * constants below:
 *
 * - the leech stands off far enough to restore the half width, and its bulge
 *   grows on ease so the head opens (`LEECH_BULGE_*`);
 * - the bulge's *direction* is the head's own chord angle, `sheetRad` plus a
 *   published foot-to-head twist (`TWIST_TRIM_DEG`), instead of a constant
 *   66° that pinned the head whatever the sheet did;
 * - the sheet band narrowed to 40°–55°, which is the widest band whose twist
 *   still opens with ease rather than closing (`SHEET_TRIM_DEG`);
 * - the luff bows further forward and correspondingly less across
 *   (`LUFF_FORWARD_FRACTION`), which is what puts the sail's body to leeward
 *   of the main instead of on the centreline behind it;
 * - the foot hangs, because a gennaker's foot is a free edge with nothing
 *   under it (`FOOT_SKIRT_M`, drawn by `loft.ts`'s `Section.dropM`).
 *
 * Camber and draft position are untouched: they come off `shape.asym`, which
 * research `2026-08-25-spinnaker` already re-based on the measured flying
 * shapes (#76), and `src/core` is out of scope for this phase.
 */
import { activeBoat as boat, sailM } from '../../lib/boat';
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
import { pchip, sectionStack, type SailChords, type Section, type Spine } from './loft';
import type { SailShape } from '../../core/types';

const asym = boat.sails.asym;
const SPRIT_M = boat.rig.bowspritOuterMm / 1000;
const MAST_LEN_M = boat.rig.mastLenM;
/** Luff length, m. prov: Class Rules / ORC sail definition, `sails.asym`. */
const LUFF_M = sailM(asym, 'luffMm');
/**
 * Leech and foot, m. prov: published — J/70 Class Rules G.5.3, carried in
 * `sails.asym`. These two are not decoration: together with the head and the
 * tack they *pin the clew to a circle* (`clewOnCircle`), which is where the
 * sheet then chooses a point. Before research doc 02 §6 the drawn leech
 * carried 25–40 % more cloth than the sail has.
 */
const LEECH_M = sailM(asym, 'leechMm');
const FOOT_M = sailM(asym, 'footMm');

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
  const a = FOOT_M;
  const d = 4 * (a / 2 - sailM(asym, 'halfMm'));
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
 * prov: assumed 40 → 55, but only as a *band*: the clew's distance from the
 * tack and from the head is no longer a choice at all (`clewOnCircle`), so
 * these two pick an arc on a derived circle rather than inventing a clew
 * position. Both endpoints sit inside the circle's achievable 18°–89°
 * (research doc 04 §2.2). Trimmed, the clew is aft, inboard and low; eased, it
 * swings forward, outboard and *up*. All three are monotone in the sheet
 * across this range, which is the claim `kite.test.ts` holds.
 *
 * Narrowed from 25 → 60 on 2026-08-28, and the reason is the *twist*. The head
 * is pinned at the masthead, so the only thing the sheet can rotate is the
 * foot; over a 35° band the foot outran the upper leech and the drawn
 * foot-to-head twist came out **backwards** — 25° at full trim falling to 4°
 * at full ease, the exact inverse of the 4° reaching / 26° running `F1`
 * measured (doc 02 §2c). Measured on the drawn loft, the widest band whose
 * twist still rises monotonically with ease is 15°; wider than that and the
 * mid-sheet state dips below the trimmed one. What it costs is expressiveness
 * — the sheet now swings the sail 15° rather than 35° — and what it buys back
 * is a leech that opens when you ease it. The clew's rise across the band is
 * unaffected at 1.42 m, against Deparday's measured 1.4 m (`F1`), because the
 * leech bulge's travel grew to compensate.
 */
export const SHEET_TRIM_DEG = 40;
export const SHEET_EASE_DEG = 55;

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
 * How far forward the luff bows, as a fraction of how far it bows athwartships.
 * prov: assumed 1.1. A free luff flies out ahead of the boat as well as to the
 * side — much further forward than the forestay's own forward fraction
 * (`SAG_FORWARD_FRACTION` = 0.35 in `rig3d.ts`), because a forestay is held at
 * both ends and a free luff is not. Only the two directions are claimed, not
 * the split. Named for the luff, not "sag", so it cannot be confused with the
 * forestay constant again: the two shared a name and disagreed on value.
 *
 * Raised from 0.6 on 2026-08-28, because this split is what decides whether
 * the sail's *body* sits to leeward. The bow's magnitude is fixed by the cloth
 * surplus (2.4-2.5 m); at 0.6 that threw the mid-luff 2.1 m to windward at
 * running angles — past the windward rail — and dragged the whole sail onto
 * the centreline, so from astern the kite sat directly behind the mainsail
 * with only its edges showing. Measured on the drawn loft at AWA 150°, the
 * half-height section's centroid was 0.87 m to leeward of the mast against the
 * main's 1.04 m: the kite's body was *inboard of the main*. At 1.1 the same
 * centroid is 1.26 m and the sail is where a photograph of a run puts it. The
 * luff still crosses to windward at deep angles — that direction is published
 * (`luffLateral`) and untouched — it just crosses by 1.5 m instead of 2.1. The
 * same change widens the tight-reach sail, whose measured half width goes
 * 2.86 m to 4.16 m against a published 5.560.
 */
export const LUFF_FORWARD_FRACTION = 1.1;

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
 * Leech bulge: how far the leech stands out from the straight head→clew line,
 * m, at full trim and the travel added by full ease.
 *
 * This one constant carries the sail's shoulders, because in this loft the
 * leech *is* the silhouette: every section spans from the bowed luff to
 * `leechAt`, so the girth at a height is whatever the leech leaves it. Drawn
 * straight, the sail runs out of width above half height and reads as a
 * headsail — which is the 0.5.0 report this phase answers. Measured on the
 * drawn loft, the old 0.4 m/+0.7 m bulge left a half width of **4.85 m**
 * against the class's published **5.560 m**, and the whole sail therefore
 * *measured* 40.3 m² on ORC's own formula against a published 45.64 — 12 %
 * narrow at half height and 12 % small overall.
 *
 * prov: assumed 0.7 m trimmed, +1.1 m eased, peak at ~65 % of the leech.
 * Amount and peak height are a fit, not a measurement: they are the values at
 * which the drawn sail measures within ±8 % of the published 45.64 m² on ORC's
 * own formula across the whole sheet band at the angles the kite is used at,
 * with a half width of 5.14-6.01 m against the class's 5.560 — the tightest
 * the four class dimensions can be held simultaneously. The bulge also
 * shortens the straight head→clew chord (`chordForArc`) and so lifts the clew,
 * which is the other thing the travel is fitted to: 1.1 m of travel lifts it
 * 1.42 m across the sheet band, against Deparday's measured 1.4 m of clew rise
 * (`F1`). No measured leech profile exists for any asymmetric (research
 * `2026-08-25-spinnaker` doc 02 §6 constrains the leech's *length* and nothing
 * else). The leech's cloth length stays the published 8.8 m: the straight
 * head→clew distance is shortened by the arc surplus (`chordForArc`).
 *
 * The *direction* stopped being a constant on 2026-08-28. It was a fixed
 * vector 66° off the centreline, which pinned the head's chord angle whatever
 * the sheet did and is half of why the drawn twist ran backwards; it is now
 * `chordDir(sheetRad + twist)` — see `TWIST_TRIM_DEG`.
 */
export const LEECH_BULGE_MIN_M = 0.7;
export const LEECH_BULGE_TRAVEL_M = 1.1;
/**
 * Foot-to-head twist at full trim and at full ease, degrees.
 * prov: **published** — `F1` Fig 3.3 via research doc 02 §2c: foot-to-top
 * twist is ~4° at AWA 64°, over 20° at 96°, 26° at 124° and 28° at 141°. The
 * sheet is in on a tight reach and out on a run, so those two ends of the
 * measured range are the two ends of the sheet band.
 *
 * These set the *direction the upper leech stands off in*, which is what
 * makes them reach the picture. Near the head the luff and the leech both
 * converge on the masthead, so the section chord there points wherever the
 * bulge does — meaning `bulgeDir`'s plan angle *is* the head's chord angle,
 * and setting it to `sheetRad + twist` is the twist mapping. It was a fixed
 * ~66° off the centreline, which is why the drawn twist ran backwards: the
 * sheet band swung the foot 25° → 60° while the head stayed put, so twist
 * measured 25° trimmed and 4° eased, the exact inverse of `F1`.
 *
 * The *height profile* is not a separate constant: it is
 * `leechBulgeProfile`, which already carries a `prov:` tag and an
 * `ASSUMPTIONS.md` row of its own. Doc 02 §2c has twist rising near-linearly
 * from the foot to half height and then flattening, and that is the shape the
 * profile gives — measured 8°/17°/23°/25° at ¼/½/¾/⅞ height at full ease.
 */
export const TWIST_TRIM_DEG = 4;
export const TWIST_EASE_DEG = 26;
/** `sin(π·t^k)` peaks where t^k = ½: k = 1.6 puts it at ~65 % of the leech. */
export const LEECH_BULGE_PEAK_EXPONENT = 1.6;

/**
 * The skirt: how far the middle of the foot hangs below the straight line
 * between the tack and the clew, m, and the height fraction over which that
 * sag blends away.
 *
 * A main's foot is on a boom and a jib's is on the deck; a gennaker's is a
 * free edge between two corners with nothing under it, so it hangs. Drawn as
 * a straight line it is the single clearest tell that the picture is of a
 * headsail — the sail meets the water in a hard diagonal instead of a belly.
 *
 * prov: assumed 0.55 m over the bottom 30 % of the height. Nothing published
 * gives a J/70 foot round: the class rules cap the *straight* foot at
 * 5 700 mm (`sails.asym.footMm`) and say nothing about the cloth in it, and
 * the research corpus measures luff and leech but never the foot
 * (`2026-08-25-spinnaker` doc 02 §6 is a leech constraint). 0.55 m is ~10 %
 * of the foot, which is the round a photograph shows and is the same order as
 * the 8.9 % measured luff excess (`F1`) on an edge with no forestay to hold
 * it. Only the sign is claimed: the foot hangs *below* the tack–clew line,
 * never above it.
 */
export const FOOT_SKIRT_M = 0.55;
export const FOOT_SKIRT_SPAN = 0.3;

/**
 * The skirt's amplitude at height fraction `h`: full at the foot, gone by
 * `FOOT_SKIRT_SPAN`, with zero slope at both ends so the blend leaves no
 * crease across the lower sail. The sag itself is a half-sine along the
 * chord (`loft.ts:buildSail`), so both corners stay exactly where the tack
 * and the leech line put them.
 */
export function footSkirtM(h: number): number {
  if (h >= FOOT_SKIRT_SPAN) return 0;
  return FOOT_SKIRT_M * 0.5 * (1 + Math.cos((Math.PI * h) / FOOT_SKIRT_SPAN));
}

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
  // The upper leech stands off in the direction the head's own chord points:
  // `sheetRad` plus the measured foot-to-head twist for this sheet setting.
  // Near the head the luff and the leech both converge on the masthead, so
  // this direction *is* the head's chord angle — which is how a published
  // twist range reaches a drawing whose sections are otherwise emergent.
  const twistTopRad = (TWIST_TRIM_DEG + ease * (TWIST_EASE_DEG - TWIST_TRIM_DEG)) * DEG2RAD;
  const bulgeDir = chordDir(sheetRad + twistTopRad, side);

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
  // stack's, interpolated the same way the loft would have; the skirt is
  // this sail's alone (`footSkirtM`), so it is set here and not in the stack.
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
        // Emergent, and it has to be: the three published edges pin every
        // section's angle once the clew is on its circle. What the twist
        // mapping steers is `bulgeDir`, which is where the upper leech stands
        // off to — see `TWIST_TRIM_DEG`.
        twistRad: theta - sheetRad,
        dropM: footSkirtM(h),
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
