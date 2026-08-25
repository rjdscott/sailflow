/**
 * INVENTED — not ORC. The four cues a J/70 crew actually watches, derived
 * from state the solver already has: main leech stall fraction, jib leech
 * position against the spreader stripes, a weather-helm load proxy, and boat
 * speed as a percentage of the reference polar (research 2026-08-25-cockpit
 * §2.3; ADR 0015).
 *
 * Three of the four are tier C: direction only. They are re-expressions of
 * the invented sheeting and flying-shape layers in the units a sailor reads,
 * not new physics, so they inherit those layers' confidence and add no
 * accuracy of their own. `pctPolar` is the exception — inside the printed
 * grid it is a ratio of two tier-A numbers.
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
import { boomAngle, jibSheetAngle, sheetingDeviation } from '../shape/sheeting';
import { polarTarget } from '../reference/polar';
import { interp1 } from '../math';
import { tiered } from './tierFor';

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
 * prov: North Sails J/70 tuning guide (S1) and Speed Guide (S3).
 */
export const LEECH_STALL_BAND: readonly [number, number] = [0.5, 0.7];

/** Deviations past which the whole leech counts as stalled, in stall e-folds. prov: assumed */
const STALL_FULL_SCALES = 2;
/** Exponent giving 0.95 at that full-scale deviation. prov: assumed */
const STALL_EFOLD = 3;

/**
 * Stall fraction from the sheeting model's over-trim deviation. Zero
 * anywhere the sail is inside or eased of its groove, then rising smoothly
 * — never quite reaching one, because a leech that is entirely stalled is a
 * state the lift model does not claim to resolve.
 */
export function leechStallFrac(devDeg: number, bandDeg: number, stallScaleDeg: number): number {
  if (devDeg <= 0) return 0;
  const full = bandDeg + STALL_FULL_SCALES * stallScaleDeg;
  return 1 - Math.exp((-STALL_EFOLD * devDeg) / full);
}

// ---------------------------------------------------------------------------
// 2. Jib leech against the spreader stripes
// ---------------------------------------------------------------------------

/** Spreader stripe distances from the mast, inches. prov: North Sails J/70 tuning guide (S1) */
export const STRIPE_INCHES: readonly [number, number, number] = [18, 20, 22];
const M_PER_INCH = 0.0254; // prov: international inch, exact by definition

/**
 * Jib chord at the spreaders, m, read off the class girth stations rather
 * than assumed: the luff fractions 0/¼/½/¾/1 carry LP and the four measured
 * girths, so the chord at the spreader height is an interpolation of
 * published measurements.
 * prov: `data/boats/j70.json` sails.jib girths (J/70 Class Rules).
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
  // prov: J/70 Class Rules girth stations — quarter/half/three-quarter of the luff
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
  const offsetM = jibChordAtSpreaderM(boat) * Math.sin((sheetDeg + Math.max(0, twistDeg)) * DEG);
  const zeroM = STRIPE_INCHES[0] * M_PER_INCH;
  const stepM = (STRIPE_INCHES[1] - STRIPE_INCHES[0]) * M_PER_INCH;
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
 * prov: assumed (ASSUMPTIONS.md).
 */
export const HELM_REF_NM = 300;

/** Weather-helm proxy, + = weather. Unsigned in heel: helm loads up on both tacks. */
export function helmLoad(fxN: number, ceHeightM: number, heelDeg: number): number {
  return (fxN * ceHeightM * Math.sin(Math.abs(heelDeg) * DEG)) / HELM_REF_NM;
}

// ---------------------------------------------------------------------------
// 4. Percentage of polar
// ---------------------------------------------------------------------------

/**
 * Half-width of the band on `pctPolar`, percentage points. The polar is a
 * printed table interpolated between columns 2 kt apart, and the model's own
 * fit-row residuals are larger than this; ±3 is the interpolation slack, not
 * a claim about the model. prov: assumed (ASSUMPTIONS.md).
 */
export const PCT_POLAR_BAND = 3;

// ---------------------------------------------------------------------------

/** Solver state the instruments read. Everything else comes off the boat. */
export interface InstrumentState {
  aero: AeroState;
  shape: Partial<Record<SailId, SailShape>>;
  bsKt: number;
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
  const stall = leechStallFrac(main.devDeg, main.bandDeg, main.stallScaleDeg);

  const target = polarTarget(condition.twsKt, condition.twaDeg, condition.sailset);
  const pct = target.bsKt > 0 ? (state.bsKt / target.bsKt) * 100 : 0;
  const pctTier: Tier = target.inGrid ? 'A' : 'C';

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
    helmLoad: tiered(helmLoad(aero.fxN, aero.ceHeightM, state.heelDeg), 'C'),
    pctPolar: { ...tiered(pct, pctTier), band: [pct - PCT_POLAR_BAND, pct + PCT_POLAR_BAND] },
  };
}
