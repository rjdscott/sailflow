/**
 * Plan-view boat geometry: the top-down J/70 the race screen draws. Pure
 * functions, no Svelte and no DOM, so every shape in the picture is testable
 * on its own.
 *
 * Frame: hull-local, origin at the stem, +y aft, +x to starboard. The
 * component translates that frame into its viewBox once. Deck outlines are
 * built from a starboard half and mirrored, so symmetry is structural rather
 * than something a hand-edit can quietly break.
 *
 * `Side` is +1 on starboard tack and −1 on port; every athwartships term
 * carries it, which is the whole of the port-tack mirror.
 */
import { activeBoat as boat, sailM } from '../../lib/boat';
import type { SectionShape } from '../../core/types';
import { camberControl, type Pt } from './geometry';

export type Side = 1 | -1;

/** Starboard on positive TWA, port on negative. Head to wind reads starboard. */
export function tackSide(twaDeg: number): Side {
  return twaDeg < 0 ? -1 : 1;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ---------------------------------------------------------------------------
// Deck plan
// ---------------------------------------------------------------------------

const LOA = boat.hull.loaM;
const HALF_BEAM = boat.hull.beamM / 2;

/**
 * Mast station, fraction of LOA aft of the stem. prov: assumed — the boat
 * JSON carries no deck plan, and this is the station that puts the spar
 * between the cabin trunk and the cockpit where the class photos show it.
 */
export const MAST_STATION = 0.45;

/** Metres, straight off the boat JSON, so the drawing is in class proportion. */
export const DIMS = {
  loaM: LOA,
  halfBeamM: HALF_BEAM,
  spritM: boat.rig.bowspritOuterMm / 1000,
  boomM: boat.rig.boomOuterMm / 1000,
  jibFootM: sailM(boat.sails.jib, 'lpMm'),
  /** ¾-height chord over the foot: how long the twist ghost's chord is. */
  headChord: {
    main: sailM(boat.sails.main, 'threeQuarterMm') / sailM(boat.sails.main, 'footMm'),
    jib: sailM(boat.sails.jib, 'threeQuarterMm') / sailM(boat.sails.jib, 'lpMm'),
  },
} as const;

interface Seg {
  c1: Pt;
  c2: Pt;
  to: Pt;
}

/**
 * Half-outlines in normalised units: x in half-beams, y in LOA aft of the stem.
 * A sportsboat deck plan — fine but not hollow forward, maximum beam around
 * 62% aft, most of that beam carried to a squared-off transom. Cabin trunk
 * and cockpit well leave a real side deck at every station.
 * prov: assumed — the boat JSON carries dimensions, not a deck plan.
 */
const HULL_HALF: Seg[] = [
  { c1: { x: 0.34, y: 0.07 }, c2: { x: 0.78, y: 0.22 }, to: { x: 0.95, y: 0.42 } },
  { c1: { x: 1.03, y: 0.56 }, c2: { x: 1.0, y: 0.8 }, to: { x: 0.82, y: 1.0 } },
];
const CABIN_HALF: Seg[] = [
  { c1: { x: 0.28, y: 0.158 }, c2: { x: 0.45, y: 0.22 }, to: { x: 0.46, y: 0.32 } },
  { c1: { x: 0.475, y: 0.39 }, c2: { x: 0.44, y: 0.44 }, to: { x: 0.32, y: 0.44 } },
];
const COCKPIT_HALF: Seg[] = [
  { c1: { x: 0.32, y: 0.483 }, c2: { x: 0.56, y: 0.52 }, to: { x: 0.58, y: 0.63 } },
  { c1: { x: 0.6, y: 0.76 }, c2: { x: 0.59, y: 0.88 }, to: { x: 0.54, y: 0.935 } },
];

/**
 * Closed, mirror-symmetric outline: down the starboard half, straight across
 * the aft edge, back up the mirrored half. The straight run is what gives the
 * hull its squared-off transom and the cockpit its bulkhead.
 */
function symOutline(start: Pt, segs: Seg[], sx: number, sy: number): string {
  const at = (q: Pt, m: 1 | -1) => `${(m * q.x * sx).toFixed(2)} ${(q.y * sy).toFixed(2)}`;
  const out = [`M ${at(start, 1)}`];
  for (const s of segs) out.push(`C ${at(s.c1, 1)} ${at(s.c2, 1)} ${at(s.to, 1)}`);
  out.push(`L ${at(segs[segs.length - 1].to, -1)}`);
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    out.push(`C ${at(s.c2, -1)} ${at(s.c1, -1)} ${at(i === 0 ? start : segs[i - 1].to, -1)}`);
  }
  return `${out.join(' ')} Z`;
}

/** Deck outline, stem at (0, 0), transom at y = LOA·scale. `scale` is px/m. */
export function hullPath(scale: number): string {
  return symOutline({ x: 0, y: 0 }, HULL_HALF, HALF_BEAM * scale, LOA * scale);
}

export interface Deck {
  hull: string;
  cabin: string;
  cockpit: string;
  /** Stem to transom, for the dashed deck centreline. */
  centreline: string;
  /** Bowsprit, as a tapered spar rather than a bare line. */
  sprit: string;
  /** Shroud chainplates, port and starboard, at the mast station. */
  chainplates: Pt[];
  mast: Pt;
  /** Bowsprit root at the stem: where the jib tacks. */
  tack: Pt;
  spritTip: Pt;
  sternY: number;
  boomPx: number;
  jibFootPx: number;
}

/** Everything the picture needs from the deck plan, at `scale` px per metre. */
export function deck(scale: number): Deck {
  const sx = HALF_BEAM * scale;
  const sy = LOA * scale;
  const spritTip = { x: 0, y: -DIMS.spritM * scale };
  return {
    hull: hullPath(scale),
    cabin: symOutline({ x: 0, y: 0.16 }, CABIN_HALF, sx, sy),
    cockpit: symOutline({ x: 0, y: 0.48 }, COCKPIT_HALF, sx, sy),
    centreline: `M 0 0 L 0 ${sy.toFixed(2)}`,
    sprit: `M -1.7 0 L -0.75 ${spritTip.y.toFixed(2)} L 0.75 ${spritTip.y.toFixed(2)} L 1.7 0 Z`,
    chainplates: [
      { x: -boat.rig.chainplateYM * scale, y: MAST_STATION * sy },
      { x: boat.rig.chainplateYM * scale, y: MAST_STATION * sy },
    ],
    mast: { x: 0, y: MAST_STATION * sy },
    tack: { x: 0, y: 0 },
    spritTip,
    sternY: sy,
    boomPx: DIMS.boomM * scale,
    jibFootPx: DIMS.jibFootM * scale,
  };
}

// ---------------------------------------------------------------------------
// Sheeting angles
//
// prov: assumed. The solver returns flying shape, not sheet loads, so these
// are a quadratic reading of the two controls that move each spar — quadratic
// in the sheet so the last of the ease opens the spar much faster than the
// first, linear in the traveller and the lead. Enough for the picture to
// answer a slider the way the boat does, not a trim model.
// ---------------------------------------------------------------------------

/**
 * Boom angle off the centreline, degrees. Easing the sheet opens it.
 * ponytail: fully eased the boom reaches the 90° clamp with the traveller
 * centred, and 83° with it all the way to windward — a run draws about right,
 * and the clamp rather than the formula is what stops it. Upwind and reaching
 * are the part that is actually shaped; swap in a real sheet-load model if
 * downwind trim ever earns the picture.
 */
export function boomAngle(mainsheet: number, traveller: number): number {
  // Traveller + = up to windward (matches shape/flying.ts and the coach copy),
  // which pulls the boom towards the centreline. prov: assumed gains
  // Same formula as src/core/shape/sheeting.ts; keep them identical.
  const eased = 100 - mainsheet;
  return clamp(6 + 0.0085 * eased * eased - traveller * 0.08, 2, 90);
}

// ---------------------------------------------------------------------------
// Telltales. Read against the local angle of attack, not the raw AWA: sheet
// in and the sheeting angle closes, so the same apparent wind meets the luff
// at a larger angle and the leeward ribbon stalls; twist opens the top so the
// high telltales lift first when pinching. prov: assumed targets and bands;
// the core carries no boundary layer.
// ---------------------------------------------------------------------------

export type Ribbon = 'streaming' | 'lifting' | 'stalled';

/** Local angle of attack at fraction `at` (0..1) up the luff. */
export function localAoa(
  awaDeg: number,
  sheetDeg: number,
  twistTopDeg: number,
  at: number,
): number {
  // Half the geometric twist reaches the local flow (upwash fills part of it). prov: assumed
  const twistAt = 0.5 * Math.max(0, twistTopDeg) * clamp((at - 0.25) / 0.5, 0, 1);
  return awaDeg - sheetDeg - twistAt;
}

/** Jib luff telltale, read against a target entry angle of attack. prov: assumed 12° */
export function luffRibbon(aoaDeg: number, entryDeg = 12, band = 3): Ribbon {
  const d = aoaDeg - entryDeg;
  if (d < -band) return 'lifting';
  if (d > band) return 'stalled';
  return 'streaming';
}

/**
 * Main leech telltale. The leech stalls when the top of the sail is
 * over-trimmed: little twist and a closed boom. prov: assumed target 8°, band 4°
 */
export function leechRibbon(awaDeg: number, boomDeg: number, twistDeg: number, at = 1): Ribbon {
  const aoa = localAoa(awaDeg, boomDeg, twistDeg, at);
  const d = aoa - 8;
  if (d > 4) return 'stalled';
  if (d < -4) return 'lifting';
  return 'streaming';
}

/** Jib sheeting angle off the centreline, degrees. Lead aft opens it. */
export function jibSheetAngle(jibLead: number, jibSheet: number): number {
  // prov: assumed; sheet term sized so the first 30 % of sheet travel off
  // fully-trimmed is ~4° of sheeting angle (it is quadratic, so the next 30 %
  // is worth more than the first)
  // Same formula as src/core/shape/sheeting.ts; keep them identical.
  const eased = 100 - jibSheet;
  return clamp(4 + jibLead * 0.35 + 0.0045 * eased * eased, 2, 90);
}

// ---------------------------------------------------------------------------
// Heel, in plan
// ---------------------------------------------------------------------------

/**
 * Cap on the drawn heel, degrees. prov: assumed — a plan view has no third
 * axis, so tilting the boat is a metaphor; past this the rotation stops
 * reading as heel and starts reading as a change of heading.
 */
export const MAX_DRAWN_HEEL = 25;

/**
 * Rotation applied to the drawn boat, degrees clockwise. The deck tips away
 * from the wind, so the sign is the tack's — same convention as the heel
 * inset. Magnitude is capped at `MAX_DRAWN_HEEL`.
 */
export function drawnHeel(heelDeg: number, side: Side): number {
  return -side * clamp(heelDeg, -MAX_DRAWN_HEEL, MAX_DRAWN_HEEL);
}

// ---------------------------------------------------------------------------
// Sails
// ---------------------------------------------------------------------------

/** Clew `len` px from `tack` at `deg` off the centreline, to leeward. */
export function clewAt(tack: Pt, deg: number, len: number, side: Side): Pt {
  const r = (deg * Math.PI) / 180;
  return { x: tack.x - side * len * Math.sin(r), y: tack.y + len * Math.cos(r) };
}

/** Rotate a clew `deg` further open about its tack. Twist, in plan. */
export function openBy(tack: Pt, clew: Pt, deg: number, side: Side): Pt {
  const r = (side * deg * Math.PI) / 180;
  const dx = clew.x - tack.x;
  const dy = clew.y - tack.y;
  return {
    x: tack.x + dx * Math.cos(r) - dy * Math.sin(r),
    y: tack.y + dx * Math.sin(r) + dy * Math.cos(r),
  };
}

/**
 * Quadratic control point of the cambered sail, in viewBox coordinates. Draft
 * and draft position come from the flying shape; the belly falls to leeward,
 * which is the convex side of the aerofoil.
 */
function sailControl(tack: Pt, clew: Pt, s: SectionShape, side: Side): Pt {
  const dx = clew.x - tack.x;
  const dy = clew.y - tack.y;
  const chord = Math.hypot(dx, dy) || 1;
  const ex = { x: dx / chord, y: dy / chord };
  const ey = { x: -side * ex.y, y: side * ex.x };
  const c = camberControl(s, chord);
  return {
    x: tack.x + ex.x * c.x - ey.x * c.y,
    y: tack.y + ex.y * c.x - ey.y * c.y,
  };
}

/** Points along the cambered sail, tack first, clew last. */
export function sailPoints(tack: Pt, clew: Pt, s: SectionShape, side: Side, n = 24): Pt[] {
  const c = sailControl(tack, clew, s, side);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return {
      x: u * u * tack.x + 2 * u * t * c.x + t * t * clew.x,
      y: u * u * tack.y + 2 * u * t * c.y + t * t * clew.y,
    };
  });
}

/**
 * The sail as a closed crescent: cambered curve out to the clew, chord back.
 * Filled translucent, it reads as a wing section seen from above.
 */
export function sailPath(tack: Pt, clew: Pt, s: SectionShape, side: Side): string {
  const c = sailControl(tack, clew, s, side);
  return (
    `M ${tack.x.toFixed(2)} ${tack.y.toFixed(2)} ` +
    `Q ${c.x.toFixed(2)} ${c.y.toFixed(2)} ${clew.x.toFixed(2)} ${clew.y.toFixed(2)} Z`
  );
}

// ---------------------------------------------------------------------------
// Wind rose
//
// The two arrows used to be parked on an ellipse around the whole boat, which
// forced a viewBox twice the hull's length and left the drawing floating in
// empty space (owner feedback, 2026-08-25). They are a rose off the windward
// bow instead: fixed centre, fixed rim, arrows swinging inside it, labels
// stacked underneath. Same bow-up frame as the boat, so the angles still read
// against the deck, and nothing has to clear the transom on a run.
// ---------------------------------------------------------------------------

/**
 * Arrow length in px, linear in true wind speed. prov: assumed — 4–25 kt is
 * the app's wind range, and the rose radius is what the arrow has to fit
 * inside. Both arrows carry the true wind's strength: the apparent arrow says
 * where the wind is, not how hard it blows, so two lengths would read as two
 * winds.
 */
export function arrowLength(twsKt: number, lo = 9, hi = 19): number {
  return lo + clamp((twsKt - 4) / 21, 0, 1) * (hi - lo);
}

export interface Arrow {
  /** On the rim, where the wind comes from. */
  tail: Pt;
  /** Inboard end, where the arrowhead points. */
  head: Pt;
}

/**
 * One rose arrow for `deg` off the bow, blowing inward from the rim. Negative
 * `deg` is port tack and mirrors, exactly like the boat.
 */
export function roseArrow(deg: number, centre: Pt, radius: number, len: number): Arrow {
  const side = tackSide(deg);
  const a = (Math.abs(deg) * Math.PI) / 180;
  const u = { x: side * Math.sin(a), y: -Math.cos(a) };
  const at = (d: number): Pt => ({ x: centre.x + u.x * d, y: centre.y + u.y * d });
  return { tail: at(radius), head: at(radius - len) };
}

// ---------------------------------------------------------------------------
// Plan-view layout
//
// One place holds the numbers the drawing and its fit test both use, as
// SECTION_LAYOUT does for the sail sections. Cropped to the boat: the hull
// runs nearly the full height of the viewBox, and the rose and the heel tag
// fill the flanks the hull's own shape leaves empty.
// ---------------------------------------------------------------------------

/** Plan-view layout, in the viewBox user units the component draws in. */
export const PLAN_LAYOUT = {
  /** viewBox is `0 0 w h`. */
  w: 150,
  h: 190,
  /** px per metre. The hull is 145 units long, so it owns the crop. */
  scale: 21,
  /** Stem, in viewBox coordinates: everything on the deck hangs off this. */
  origin: { x: 76, y: 38 },
  /**
   * Wind rose: centre offset from the stem, signed athwartships by the tack,
   * plus its rim radius and the two label baselines below it.
   */
  rose: { dx: 49, dy: 18, radius: 22, labelY: [87, 96] },
  /** Heel figure, leeward of the transom, in the corner the sails never reach. */
  heelTag: { dx: -40, y: 186 },
} as const;
