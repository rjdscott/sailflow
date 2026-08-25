/**
 * Side-elevation layout: `BoatDefinition` + `RigState` -> points in the
 * elevation's viewBox units. Pure — no Svelte, no DOM — so "is the drawing at
 * class proportions?" and "does anything clip?" are unit tests rather than a
 * browser check.
 *
 * Frame: bow to the left. One `scale` (px per metre) converts every dimension,
 * so I : J : P : E on screen are the ratios in the boat JSON. Screen axes are
 * +x aft, +y down; the vertical datum is the sheer at the mast partners,
 * because no published J/70 source gives a rig datum (see HEIGHTS below).
 *
 * Bend and forestay sag are drawn at `EXAGGERATION`; rake is drawn true, so
 * the mast angle on screen is the mast angle on the water.
 */
import type { BoatDefinition, RigState, SailDef } from '../../core/types';
import { EXAGGERATION, mastPoints, sagPoints, type Pt } from './geometry';

/**
 * viewBox of the elevation. Portrait, and sized so the inner box is close to
 * the content's own 8.4 m x 9.25 m aspect: any slack is height the card pays
 * for and the drawing does not use. `top` also carries the rake arrow.
 */
export const VIEW = { w: 280, h: 294 } as const;

/**
 * Inner margins, viewBox units. `left` carries the I and P dimension bars,
 * `top` the rake arrow. Not physical: pure drawing furniture.
 */
const PAD = { left: 36, right: 10, top: 26, bottom: 10 } as const;

/** x of the I and P dimension bars, in the left margin. */
const DIM_BAR_X = [11, 25] as const;

/**
 * Vertical geometry the JSON and the class rules do not carry.
 *
 * Class Rules C.9.2(a) (mast dimensions) is a reference to the manufacturing
 * specification, not a table, and the ORC certificate publishes only I/J/P/E.
 * So every height below is either derived from those four or assumed, and is
 * tagged as such. See the progress note in
 * docs/plans/2026-08-25-drills-and-loop/phase-00-p0-defects.md.
 */
const HEIGHTS = {
  /**
   * Sheer above the waterline, m.
   * prov: assumed. `aero.hbiM` default in src/core/aero/orc/forces.ts ("base
   * of I above water"); j70.json's calibrated 1.4 is an aero fit, not a hull
   * dimension, so the default is used here and no freeboard is claimed as
   * published.
   */
  freeboardM: 0.75,
  /**
   * Forefoot: how far aft of the stem the hull bottom starts.
   * prov: assumed. The J/70 bow is treated as plumb here and in
   * src/core/geometry/rig.ts backstayGeometry, so this is a small tuck, not a
   * measured overhang. Drawing only — nothing physical reads it.
   */
  forefootM: 0.25,
} as const;

/** Leech fractions from the head at which the girth table is defined. */
const GIRTH_T = {
  /** prov: Class Rules G.3.4 — upper point is equidistant from head and ¾. */
  upper: 0.125,
  /** prov: ERS leech points: ¾ is ¾ of the leech from the clew. */
  threeQuarter: 0.25,
  half: 0.5,
  quarter: 0.75,
} as const;

export interface Dim {
  label: string;
  from: Pt;
  to: Pt;
  /** Text anchor for the label. */
  at: Pt;
  vertical: boolean;
}

export interface Girth {
  label: string;
  luff: Pt;
  leech: Pt;
}

export interface SailOutline {
  path: string;
  luff: Pt[];
  leech: Pt[];
  girths: Girth[];
}

export interface RigLayout {
  /** px per metre; every length on screen goes through this one number. */
  scale: number;
  /** Mast heel at the sheer — the origin of the physical frame. */
  heel: Pt;
  /** 11 bend stations, partners (0) to tip (10). */
  mast: Pt[];
  tip: Pt;
  /** Masthead with rake and bend removed: the plumb reference ghost. */
  plumbTip: Pt;
  /** Baseline of the rake arrow, clear above the masthead. */
  rakeY: number;
  hounds: Pt;
  gooseneck: Pt;
  /** Boom outer point, E aft of the gooseneck. */
  boomTip: Pt;
  spreaderRoot: Pt;
  spreaderTip: Pt;
  stem: Pt;
  transom: Pt;
  spritTip: Pt;
  /** Sheer line, stem to transom. The bowsprit is a spar, not part of it. */
  sheer: [Pt, Pt];
  waterY: number;
  /** Hull below the sheer, drawn as a closed outline. */
  hullPath: string;
  forestayPath: string;
  backstay: [Pt, Pt];
  main: SailOutline;
  jib: SailOutline;
  dims: Dim[];
}

/**
 * One girth off a sail definition, mm. `SailDef` carries an index signature so
 * a new measurement point costs no type change; the cast back to a number is
 * the price, and a missing girth draws as zero rather than NaN.
 */
export function girthMm(sail: SailDef, key: string): number {
  const v = sail[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Point at fraction `f` (0 = first, 1 = last) along a polyline's stations. */
export function along(pts: Pt[], f: number): Pt {
  const last = pts.length - 1;
  const s = Math.min(last, Math.max(0, f * last));
  const i = Math.min(last - 1, Math.floor(s));
  return lerp(pts[i], pts[i + 1], s - i);
}

/** Unit tangent at fraction `f`, pointing the way the polyline runs. */
function tangent(pts: Pt[], f: number): Pt {
  const last = pts.length - 1;
  const i = Math.min(last - 1, Math.max(0, Math.floor(f * last)));
  const d = { x: pts[i + 1].x - pts[i].x, y: pts[i + 1].y - pts[i].y };
  const len = Math.hypot(d.x, d.y) || 1;
  return { x: d.x / len, y: d.y / len };
}

/**
 * Girth point: `mm` from the luff, perpendicular to the luff and aft.
 * Sail girths are measured to the nearest point on the luff, so the offset is
 * taken off the *bent* mast (or the *sagged* forestay) — which is how bend and
 * sag show up as a change in the drawn sail, not just in the spar.
 */
function girthPoint(luff: Pt[], f: number, mm: number, scale: number): Pt {
  const p = along(luff, f);
  const n = aftNormal(tangent(luff, f));
  const d = (mm / 1000) * scale;
  return { x: p.x + n.x * d, y: p.y + n.y * d };
}

/** The unit normal to `t` that points aft (+x); sails girth aft of the luff. */
function aftNormal(t: Pt): Pt {
  const n = { x: -t.y, y: t.x };
  return n.x >= 0 ? n : { x: -n.x, y: -n.y };
}

function polyPath(pts: Pt[], close = false): string {
  return (
    pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
    (close ? ' Z' : '')
  );
}

/** Resample a polyline between two fractions of its length. */
function slice(pts: Pt[], f0: number, f1: number, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => along(pts, f0 + ((f1 - f0) * i) / n));
}

export interface LayoutOptions {
  /** Bowsprit drawn extended: Class Rules C.9.4(b)(1), only under gennaker. */
  spritOut?: boolean;
  /** Jib drawn: furled under the gennaker, so the outline is dropped. */
  jibUp?: boolean;
  exaggeration?: number;
}

export function rigLayout(
  boat: BoatDefinition,
  rig: RigState,
  opts: LayoutOptions = {},
): RigLayout {
  const { spritOut = false, jibUp = true, exaggeration = EXAGGERATION } = opts;
  const { iM, jM, pM, eM, mastLenM, spreaderZM, spreaderLenM, sweepDeg } = boat.rig;
  const spritM = boat.rig.bowspritOuterMm / 1000;

  // --- physical extents, metres, mast heel at (0, 0) ------------------------
  // The forestay lands at the stem on a plumb-bow hull, so J puts the mast
  // J aft of the stem and the transom (LOA − J) aft of the mast — the same
  // reduction src/core/geometry/rig.ts backstayGeometry uses.
  const stemXm = -jM;
  const transomXm = boat.hull.loaM - jM;
  const spritXm = stemXm - spritM;
  const spanXm = transomXm - spritXm;
  const spanZm = mastLenM + HEIGHTS.freeboardM;

  const innerW = VIEW.w - PAD.left - PAD.right;
  const innerH = VIEW.h - PAD.top - PAD.bottom;
  const scale = Math.min(innerW / spanXm, innerH / spanZm);

  // Centre the content in the inner box, then hang the frame off the mast heel.
  const x0 = PAD.left + (innerW - spanXm * scale) / 2 - spritXm * scale;
  const y0 = PAD.top + (innerH - spanZm * scale) / 2 + mastLenM * scale;
  const at = (xm: number, zm: number): Pt => ({ x: x0 + xm * scale, y: y0 - zm * scale });

  // --- mast -----------------------------------------------------------------
  // Class Rules D.1.1(e) lists a mast compression post, so the spar is stepped
  // on deck and its full length stands above the sheer.
  // prov: derived from rig.mastLenM (itself assumed — see PROVENANCE.md).
  const mastLenPx = mastLenM * scale;
  const mmPerPx = 1000 / scale;
  const mast = mastPoints(rig, mastLenPx, mmPerPx, exaggeration).map((p) => ({
    x: x0 + p.x,
    y: y0 - mastLenPx + p.y,
  }));
  const heel = at(0, 0);
  const tip = mast[mast.length - 1];
  const plumbTip = at(0, mastLenM);

  // Hounds: I is measured from the sheer, so the forestay attachment sits at
  // I/mastLen up the (raked, bent) spar. prov: ORC cert RIG IG 8.000.
  const hounds = along(mast, iM / mastLenM);

  // Gooseneck: P is the luff limit, measured from the boom's upper edge to the
  // mast's upper limit mark. prov: derived — assumes the upper limit mark is
  // at the masthead, which puts the gooseneck at mastLen − P above the sheer
  // (0.526 m on the J/70). Nothing published gives the boom height directly.
  const goosefrac = (mastLenM - pM) / mastLenM;
  const gooseneck = along(mast, goosefrac);
  // prov: Class Rules C.9.3(a) boom outer point 2876 mm = E. Drawn level: no
  // published boom angle, and the J/70 gooseneck is fixed.
  const boomTip = { x: gooseneck.x + eM * scale, y: gooseneck.y };

  // Spreader, foreshortened in side view: only the swept component shows.
  // prov: rig.spreaderZM / spreaderLenM / sweepDeg (all assumed, PROVENANCE.md).
  const spreaderRoot = along(mast, spreaderZM / mastLenM);
  const aftM = spreaderLenM * Math.sin((sweepDeg * Math.PI) / 180);
  const spreaderTip = { x: spreaderRoot.x + aftM * scale, y: spreaderRoot.y };

  // --- hull ------------------------------------------------------------------
  const stem = at(stemXm, 0);
  const transom = at(transomXm, 0);
  const spritTip = at(spritOut ? spritXm : stemXm, 0);
  const waterY = at(0, -HEIGHTS.freeboardM).y;
  const hullPath = polyPath(
    [
      stem,
      transom,
      { x: transom.x, y: waterY },
      { x: stem.x + HEIGHTS.forefootM * scale, y: waterY },
    ],
    true,
  );

  // --- wires -----------------------------------------------------------------
  const forestayLuff = sagPoints(hounds, stem, rig.sagMm, mmPerPx, 12, exaggeration);
  const forestayPath = polyPath(forestayLuff);
  const backstay: [Pt, Pt] = [tip, transom];

  // --- mainsail --------------------------------------------------------------
  // Luff on the mast between gooseneck and head; leech from the girth table.
  const m = boat.sails.main;
  const mainLuff = slice(mast, goosefrac, 1, 10);
  // prov: Class Rules G.3.4 mainsail widths, top through quarter.
  const mainLeech: Pt[] = [
    girthPoint(mainLuff, 1, girthMm(m, 'topMm'), scale),
    girthPoint(mainLuff, 1 - GIRTH_T.upper, girthMm(m, 'upperMm'), scale),
    girthPoint(mainLuff, 1 - GIRTH_T.threeQuarter, girthMm(m, 'threeQuarterMm'), scale),
    girthPoint(mainLuff, 1 - GIRTH_T.half, girthMm(m, 'halfMm'), scale),
    girthPoint(mainLuff, 1 - GIRTH_T.quarter, girthMm(m, 'quarterMm'), scale),
    boomTip,
  ];
  const main: SailOutline = {
    path: polyPath([...mainLuff, ...mainLeech.slice().reverse()], true),
    luff: mainLuff,
    leech: mainLeech,
    girths: [
      { label: '¾', luff: along(mainLuff, 1 - GIRTH_T.threeQuarter), leech: mainLeech[2] },
      { label: '½', luff: along(mainLuff, 1 - GIRTH_T.half), leech: mainLeech[3] },
      { label: '¼', luff: along(mainLuff, 1 - GIRTH_T.quarter), leech: mainLeech[4] },
    ],
  };

  // --- headsail --------------------------------------------------------------
  // Luff on the forestay (headsail luff 8000 mm = I, Class Rules G.4.3), so
  // forestay sag bows the jib luff too. Girths are the G.4.3 widths.
  //
  // The clew: no headsail foot length is published, but LP is the clew's
  // perpendicular distance from the luff, and G.4.3 allows only 30 mm of foot
  // irregularity on a sail that furls — a deck-sweeper. prov: derived. Putting
  // the clew on the sheer at LP off the luff line fixes it exactly, and gives
  // a ~2.55 m foot.
  const j = boat.sails.jib;
  const chord = tangent([hounds, stem], 0);
  const nAft = aftNormal(chord);
  const jibClew: Pt = { x: stem.x + ((girthMm(j, 'lpMm') / 1000) * scale) / nAft.x, y: stem.y };
  const jibLeech: Pt[] = [
    girthPoint(forestayLuff, 0, girthMm(j, 'topMm'), scale),
    girthPoint(forestayLuff, GIRTH_T.threeQuarter, girthMm(j, 'threeQuarterMm'), scale),
    girthPoint(forestayLuff, GIRTH_T.half, girthMm(j, 'halfMm'), scale),
    girthPoint(forestayLuff, GIRTH_T.quarter, girthMm(j, 'quarterMm'), scale),
    jibClew,
  ];
  const jib: SailOutline = {
    path: jibUp ? polyPath([...forestayLuff, ...jibLeech.slice().reverse()], true) : '',
    luff: forestayLuff,
    leech: jibUp ? jibLeech : [],
    girths: jibUp
      ? [
          { label: '¾', luff: along(forestayLuff, GIRTH_T.threeQuarter), leech: jibLeech[1] },
          { label: '½', luff: along(forestayLuff, GIRTH_T.half), leech: jibLeech[2] },
          { label: '¼', luff: along(forestayLuff, GIRTH_T.quarter), leech: jibLeech[3] },
        ]
      : [],
  };

  // --- dimension ticks -------------------------------------------------------
  const iBar = { x: DIM_BAR_X[0], top: at(0, iM).y, bottom: heel.y };
  const pBar = { x: DIM_BAR_X[1], top: at(0, mastLenM).y, bottom: at(0, mastLenM - pM).y };
  const jY = heel.y - 8; // just above the sheer, so the deck line stays readable
  const eY = gooseneck.y + 9;
  const dims: Dim[] = [
    {
      label: 'I',
      from: { x: iBar.x, y: iBar.bottom },
      to: { x: iBar.x, y: iBar.top },
      at: { x: iBar.x, y: (iBar.top + iBar.bottom) / 2 },
      vertical: true,
    },
    {
      label: 'P',
      from: { x: pBar.x, y: pBar.bottom },
      to: { x: pBar.x, y: pBar.top },
      at: { x: pBar.x, y: (pBar.top + pBar.bottom) / 2 },
      vertical: true,
    },
    {
      label: 'J',
      from: { x: stem.x, y: jY },
      to: { x: heel.x, y: jY },
      at: { x: (stem.x + heel.x) / 2, y: jY - 3 },
      vertical: false,
    },
    {
      label: 'E',
      from: { x: gooseneck.x, y: eY },
      to: { x: boomTip.x, y: eY },
      at: { x: (gooseneck.x + boomTip.x) / 2, y: eY + 8 },
      vertical: false,
    },
  ];

  return {
    scale,
    heel,
    mast,
    tip,
    plumbTip,
    rakeY: Math.min(tip.y, plumbTip.y) - 11,
    hounds,
    gooseneck,
    boomTip,
    spreaderRoot,
    spreaderTip,
    stem,
    transom,
    spritTip,
    sheer: [stem, transom],
    waterY,
    hullPath,
    forestayPath,
    backstay,
    main,
    jib,
    dims,
  };
}

/** Every point the layout draws, for a clipping test. */
export function layoutPoints(l: RigLayout): Pt[] {
  return [
    ...l.mast,
    l.tip,
    l.plumbTip,
    l.hounds,
    l.gooseneck,
    l.boomTip,
    l.spreaderRoot,
    l.spreaderTip,
    l.stem,
    l.transom,
    l.spritTip,
    ...l.backstay,
    ...l.main.luff,
    ...l.main.leech,
    ...l.jib.luff,
    ...l.jib.leech,
    ...l.main.girths.flatMap((g) => [g.luff, g.leech]),
    ...l.jib.girths.flatMap((g) => [g.luff, g.leech]),
    ...l.dims.flatMap((d) => [d.from, d.to, d.at]),
    { x: l.heel.x, y: l.waterY },
    { x: l.tip.x, y: l.rakeY },
    { x: l.plumbTip.x, y: l.rakeY },
  ];
}
