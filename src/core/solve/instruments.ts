/**
 * INVENTED — not ORC. The four cues a keelboat crew actually watches, derived
 * from state the solver already has: main leech stall fraction, jib leech
 * position against the spreader stripes, a weather-helm load proxy, and boat
 * speed as a percentage of the reference polar (research 2026-08-25-cockpit
 * §2.3; ADR 0015).
 *
 * Every magnitude here is a per-boat knob with a documented default, because
 * each was calibrated against one class's tuning guide: the stripe spacing a
 * class paints on its spreaders, and the helm moment that reads "firm" on a
 * boat of that displacement, are class facts, not physics. A class that does
 * not override them is explicitly borrowing the reference boat's numbers,
 * which `boat/validate.ts` reports rather than hides.
 *
 * Three of the four are tier C: direction only. They are re-expressions of
 * the invented sheeting and flying-shape layers in the units a sailor reads,
 * not new physics, so they inherit those layers' confidence and add no
 * accuracy of their own. `pctPolar` is the exception, but only as far as its
 * numerator allows: it is tier A when the target is inside the printed grid
 * *and* the boat speed it divides is itself tier A, and otherwise the lower
 * of the two (audit docs-consistency-01 M-07). Under the kite that is B; off
 * the grid, or outside the polar's TWS range, C.
 *
 * Pure and deterministic: no DOM, no `Math.random`, no `Date`.
 */
import type {
  AeroState,
  BoatDefinition,
  Condition,
  ControlState,
  Instruments,
  SailId,
  SailShape,
  Tier,
} from '../types';
import { boomAngle, jibSheetAngle, sheetingDeviation, TWIST_TO_AOA } from '../shape/sheeting';
import { polarTarget } from '../reference/polar';
import { knob } from '../internal';
import { interp1 } from '../math';
import { lowerTier, tiered } from './tierFor';

const DEG = Math.PI / 180;

function dim(boat: BoatDefinition, sail: SailId, key: string): number {
  const v = boat.sails[sail][key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

// ---------------------------------------------------------------------------
// 1. Main leech stall fraction
// ---------------------------------------------------------------------------

/**
 * What fraction of the main's leech ribbons the guides want stalled at
 * maximum trim: 50–70 %, with 100 % flow while building speed.
 *
 * prov: class-independent. The 50–70 % band is generic upwind mainsail-trim
 * advice repeated across one-design guides and sailmaker literature, not a
 * J/70 measurement — it is a statement about attached flow on a mainsail
 * leech, and nothing in it scales with rig or displacement. The J/70's North
 * guide (S1) and Speed Guide (S3) are where this repo read it, and
 * `src/ui/instruments/gauges.ts` mirrors it for the gauge.
 */
// prov: class-independent guide band, see the block comment above.
export const LEECH_STALL_BAND: readonly [number, number] = [0.5, 0.7];

/**
 * Head twist the leech would need for the mid-height angle of attack to land
 * on the sheeting model's optimum, minus the twist it has. Positive is a
 * leech closed inside that optimum-twist target — the direction that stalls
 * ribbons; negative is one open of it. Only `TWIST_TO_AOA` of head twist
 * reaches the station the deviation is measured at, so one degree of
 * over-trim is four degrees of twist.
 */
export function leechTwistDevDeg(devDeg: number): number {
  return devDeg / TWIST_TO_AOA;
}

/**
 * Twist deviation at which the guides' 50–70 % band is centred, degrees. The
 * sheeting layer's optimum angle of attack is its lift-maximising one, which
 * sits far tighter than the trim a class guide calls base, so the meter is
 * anchored on that base trim rather than on the model's own optimum — which
 * makes it a per-class number: it is calibrated against *that class's* base
 * trim, and a class with a different base trim lands somewhere else on the
 * curve.
 * prov: calibrated so the reference boat's `baseRace()` upwind at 10 kt reads
 * inside the band (ASSUMPTIONS.md). Default is the J/70's fitted value.
 */
// prov: per-class default, calibrated on the reference boat (see above).
export const STALL_TWIST_CENTRE_DEG = -56;

/**
 * Width of the transition in twist degrees — the logistic's scale, so a leech
 * one scale closed of the centre reads 0.73 and one scale open of it 0.27.
 * This is the stall meter's own scale, not the lift-loss e-fold it used to
 * borrow: that e-fold is 30° of *angle of attack*, which put the whole upwind
 * range inside 0–0.11 and made the guide's band unreachable.
 * prov: calibrated so mainsheet hard on reads above 0.7 and eased to 30 %
 * below 0.3 (ASSUMPTIONS.md). Default is the J/70's fitted value.
 */
// prov: per-class default, calibrated on the reference boat (see above).
export const STALL_TWIST_RANGE_DEG = 45;

/**
 * Stall fraction from how far the leech's twist sits inside the optimum-twist
 * target. Monotone in the deviation — and therefore in mainsheet, which is
 * the control that closes the leech — and asymptotic at both ends, because
 * neither a wholly stalled nor a wholly attached leech is a state the lift
 * model claims to resolve.
 */
export function leechStallFrac(boat: BoatDefinition, devDeg: number): number {
  const centre = knob(boat, 'instruments.stallTwistCentreDeg', STALL_TWIST_CENTRE_DEG);
  const range = knob(boat, 'instruments.stallTwistRangeDeg', STALL_TWIST_RANGE_DEG);
  const z = (leechTwistDevDeg(devDeg) - centre) / range;
  return 1 / (1 + Math.exp(-z));
}

// ---------------------------------------------------------------------------
// 2. Jib leech against the spreader stripes
// ---------------------------------------------------------------------------

/**
 * Spreader stripe distances from the mast, inches, for the reference boat.
 * Class-specific: a class paints the stripes its own guide calls for, and the
 * spacing is what the gauge's whole scale is built on.
 * prov: North Sails J/70 tuning guide (S1). `src/ui/instruments/gauges.ts`
 * mirrors this default for the gauge drawing (ADR 0003 forbids the UI
 * importing the core).
 */
// prov: North Sails J/70 tuning guide (S1); per-class, see the block comment above.
export const STRIPE_INCHES: readonly [number, number, number] = [18, 20, 22];

/**
 * This boat's spreader stripes. Overridable per class through the three
 * `instruments.stripeIn*` knobs; a class that sets none is reading the
 * reference boat's stripes, which `boat/validate.ts` reports.
 */
export function stripeInches(boat: BoatDefinition): [number, number, number] {
  return [
    knob(boat, 'instruments.stripeInLo', STRIPE_INCHES[0]),
    knob(boat, 'instruments.stripeInMid', STRIPE_INCHES[1]),
    knob(boat, 'instruments.stripeInHi', STRIPE_INCHES[2]),
  ];
}

const M_PER_INCH = 0.0254; // prov: international inch, exact by definition

/**
 * Athwartships offset added to the modelled leech position before it is read
 * against the stripes, inches. The chord is swung about a luff taken as on
 * the centreline, and the stripes are painted outboard from the mast, which
 * is neither the same point nor the same station; this absorbs the
 * difference. Without it the model reads −0.6 at the base trim, i.e. hooked
 * inside the innermost stripe, and the verdict calls for lead aft from the
 * one trim the guide calls right.
 */
// prov: calibrated so the reference boat's `baseRace()` upwind at 10 kt reads
// the middle stripe, the North J/70 tuning guide's base position
// (ASSUMPTIONS.md). Per-class: it absorbs a geometry mismatch that depends on
// where the class's chainplates and spreaders actually are.
// prov: per-class default, calibrated on the reference boat (see above).
export const STRIPE_OFFSET_IN = 3.2;

/**
 * Jib chord at the spreaders, m, read off the class girth stations rather
 * than assumed: the luff fractions 0/¼/½/¾/1 carry LP and the four measured
 * girths, so the chord at the spreader height is an interpolation of
 * published measurements.
 * prov: the boat file's own `sails.jib` girths, whose provenance rows name the
 * class rules they were measured from.
 */
export function jibChordAtSpreaderM(boat: BoatDefinition): number {
  const luffM = dim(boat, 'jib', 'luffMm') / 1000;
  if (luffM <= 0) return 0;
  const girthsM = [
    dim(boat, 'jib', 'lpMm'),
    dim(boat, 'jib', 'quarterMm'),
    dim(boat, 'jib', 'halfMm'),
    dim(boat, 'jib', 'threeQuarterMm'),
    dim(boat, 'jib', 'topMm'),
  ].map((mm) => mm / 1000);
  // prov: class-independent. Sail measurement rules put girth stations at
  // quarter/half/three-quarter of the luff for every class that measures a
  // headsail this way; the *values* are per-boat and come off the boat file.
  // prov: class-independent girth stations (see above); values come off the boat.
  const stations = [0, 0.25, 0.5, 0.75, 1];
  return interp1(stations, girthsM, Math.min(1, boat.rig.spreaderZM / luffM));
}

/**
 * Where the jib leech crosses the spreader, as a continuous stripe index:
 * 0 is the 18" stripe, 1 the 20", 2 the 22". Below zero the leech is inside
 * the innermost stripe (hooked); above two it is outboard of the tip
 * (twisted off).
 *
 * The leech's athwartships offset at the spreader height is the local chord
 * swung out by the clew sheeting angle plus the twist the sail has at ¾
 * height, with the luff taken as on the centreline. Sign-correct by
 * construction — lead aft and sheet eased both open the leech outboard —
 * magnitude assumed (ASSUMPTIONS.md).
 */
export function jibLeechStripe(boat: BoatDefinition, sheetDeg: number, twistDeg: number): number {
  const stripes = stripeInches(boat);
  const offsetIn = knob(boat, 'instruments.stripeOffsetIn', STRIPE_OFFSET_IN);
  const offsetM =
    jibChordAtSpreaderM(boat) * Math.sin((sheetDeg + Math.max(0, twistDeg)) * DEG) +
    offsetIn * M_PER_INCH;
  const zeroM = stripes[0] * M_PER_INCH;
  const stepM = (stripes[1] - stripes[0]) * M_PER_INCH;
  return (offsetM - zeroM) / stepM;
}

// ---------------------------------------------------------------------------
// 3. Helm load
// ---------------------------------------------------------------------------

/**
 * Yaw moment that reads as a firm but not heavy helm, N·m. The drive acts
 * through the sail plan's centre of effort, which heel carries to leeward by
 * `ceHeight · sin(heel)`; that lever times the driving force is the moment
 * the rudder holds. The reference is the model's own value for a well-powered
 * J/70 upwind at 12–14 kt with the crew hiking (~150–350 N·m here), so 1.0
 * reads "firm" and the > 1.2 the cockpit calls heavy is heel running away.
 *
 * Per-class: the moment that reads "firm" is set by rudder area and the
 * leverage a crew has on the tiller, both of which scale with the boat. A
 * heavier class left on this default would read light at every trim.
 * prov: assumed (ASSUMPTIONS.md). Default is the J/70's value.
 */
export const HELM_REF_NM = 300;

/** Weather-helm proxy, + = weather. Unsigned in heel: helm loads up on both tacks. */
export function helmLoad(
  boat: BoatDefinition,
  fxN: number,
  ceHeightM: number,
  heelDeg: number,
): number {
  const ref = knob(boat, 'instruments.helmRefNm', HELM_REF_NM);
  return (fxN * ceHeightM * Math.sin(Math.abs(heelDeg) * DEG)) / ref;
}

// ---------------------------------------------------------------------------
// 4. Percentage of polar
// ---------------------------------------------------------------------------

/**
 * Half-width of the band on `pctPolar`, percentage points. The polar is a
 * printed table interpolated between columns 2 kt apart, and the model's own
 * fit-row residuals are larger than this; ±3 is the interpolation slack, not
 * a claim about the model.
 *
 * prov: assumed, class-independent (ASSUMPTIONS.md). It is a property of the
 * Speed Guide *format* — 2 kt column spacing — not of any boat in it, so
 * every class printed on that grid carries the same slack.
 */
export const PCT_POLAR_BAND = 3;

// ---------------------------------------------------------------------------

/** Solver state the instruments read. Everything else comes off the boat. */
export interface InstrumentState {
  aero: AeroState;
  shape: Partial<Record<SailId, SailShape>>;
  bsKt: number;
  /** The tier `bsKt` carries — `pctPolar` can never beat its own numerator. */
  bsTier: Tier;
  heelDeg: number;
}

/**
 * The instrument block for one solved state. `jibLeechStripe` is omitted
 * under the kite: there is no jib, and an invented number for a sail that is
 * not up is worse than no number.
 */
export function instrumentsFor(
  boat: BoatDefinition,
  controls: ControlState,
  condition: Condition,
  state: InstrumentState,
): Instruments {
  const r = controls.race;
  const { aero, shape } = state;

  const main = sheetingDeviation(boat, 'main', aero.awaDeg, {
    sheetDeg: boomAngle(r.mainsheet, r.traveller),
    twistDeg: shape.main?.threeQuarter.twistDeg ?? 0,
  });
  const stall = leechStallFrac(boat, main.devDeg);

  const target = polarTarget(boat, condition.twsKt, condition.twaDeg, condition.sailset);
  const pct = target.bsKt > 0 ? (state.bsKt / target.bsKt) * 100 : 0;
  const pctTier: Tier = lowerTier(target.inGrid ? 'A' : 'C', state.bsTier);

  const jib = shape.jib;
  return {
    leechStallFrac: tiered(stall, 'C'),
    ...(jib
      ? {
          jibLeechStripe: tiered(
            jibLeechStripe(boat, jibSheetAngle(r.jibLead, r.jibSheet), jib.threeQuarter.twistDeg),
            'C',
          ),
        }
      : {}),
    helmLoad: tiered(helmLoad(boat, aero.fxN, aero.ceHeightM, state.heelDeg), 'C'),
    // Tier A gets no band: `tiered()` withholds one, and the ±3 interpolation
    // slack only applies where the ratio is not a clean read off the table.
    pctPolar: {
      ...tiered(pct, pctTier),
      ...(pctTier === 'A' ? {} : { band: [pct - PCT_POLAR_BAND, pct + PCT_POLAR_BAND] }),
    },
  };
}
