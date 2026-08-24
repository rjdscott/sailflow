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
import boat from '../../../data/boats/j70.json';
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
  jibFootM: boat.sails.jib.lpMm / 1000,
  /** ¾-height chord over the foot: how long the twist ghost's chord is. */
  headChord: {
    main: boat.sails.main.threeQuarterMm / boat.sails.main.footMm,
    jib: boat.sails.jib.threeQuarterMm / boat.sails.jib.lpMm,
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
// are a linear reading of the two controls that move each spar — enough for
// the picture to answer a slider the way the boat does, not a trim model.
// ---------------------------------------------------------------------------

/**
 * Boom angle off the centreline, degrees. Easing the sheet opens it.
 * ponytail: tops out near 39° at full ease and full traveller, so the running
 * boom draws further inboard than it flies. Upwind and reaching are right;
 * swap in a real sheet-load model if downwind trim ever earns the picture.
 */
export function boomAngle(mainsheet: number, traveller: number): number {
  return clamp(6 + (100 - mainsheet) * 0.25 + traveller * 0.08, 2, 90);
}

/** Jib sheeting angle off the centreline, degrees. Lead aft opens it. */
export function jibSheetAngle(jibLead: number, jibSheet: number): number {
  return clamp(7 + jibLead * 0.4 + (100 - jibSheet) * 0.15, 2, 90);
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
// Wind arrows
// ---------------------------------------------------------------------------

/**
 * The ellipse an arrow is parked on. Slightly wider than tall, because the
 * viewBox has room to spare abeam and none to spare ahead of the bowsprit.
 */
export interface Ring {
  rx: number;
  ry: number;
  /** Arrow length, drawn inward from the ring toward the boat. */
  len: number;
  /** Tag offset along the ring, signed: the two arrows tag opposite sides. */
  tagOff: number;
}

export interface Arrow {
  /** Point of the arrow, nearest the boat. */
  head: Pt;
  tail: Pt;
  tag: Pt;
}

/**
 * A wind arrow at `deg` off the bow, blowing toward the boat. The arrow lives
 * entirely outside the ring, so it never crosses the hull or the sails, and
 * its tag sits off the tail rather than further out — which is what keeps the
 * labels inside the viewBox at every angle from close-hauled to dead downwind.
 */
export function windArrow(deg: number, hub: Pt, ring: Ring): Arrow {
  const side = tackSide(deg);
  const a = (Math.abs(deg) * Math.PI) / 180;
  const u = { x: side * Math.sin(a), y: -Math.cos(a) };
  const r = 1 / Math.hypot(u.x / ring.rx, u.y / ring.ry);
  const at = (d: number): Pt => ({ x: hub.x + u.x * d, y: hub.y + u.y * d });
  const tail = at(r + ring.len);
  return {
    head: at(r),
    tail,
    tag: {
      x: tail.x + side * Math.cos(a) * ring.tagOff,
      y: tail.y + Math.sin(a) * ring.tagOff,
    },
  };
}
