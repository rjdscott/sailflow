/**
 * Pure SVG geometry for the race pictures. No Svelte, no DOM — so the shapes
 * the screen draws are testable on their own.
 *
 * Screen convention for the elevation: +x aft, +y down, origin at the caller's
 * chosen anchor. Sections are drawn leading edge at the origin, chord along +x,
 * camber toward -y.
 */
import type { RigState, SectionShape } from '../../core/types';

export interface Pt {
  x: number;
  y: number;
}

/** Bend and sag are millimetres on an eight-metre rig: unreadable at 1:1. */
export const EXAGGERATION = 5;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Control point of the quadratic whose midpoint sits at maximum camber.
 * A quadratic's t=0.5 point is (P0 + 2·P1 + P2) / 4, so P1 = 2·M − (P0+P2)/2.
 * draftPos is clamped away from the ends to keep x(t) monotone.
 */
export function camberControl(s: SectionShape, chord: number): Pt {
  const dp = clamp(s.draftPos, 0.15, 0.85);
  const d = clamp(s.draft, 0, 0.5);
  return { x: 2 * dp * chord - chord / 2, y: -2 * d * chord };
}

/** Sample the camber curve, endpoints included. */
export function sectionPoints(s: SectionShape, chord: number, n = 16): Pt[] {
  const c = camberControl(s, chord);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return {
      x: 2 * u * t * c.x + t * t * chord,
      y: 2 * u * t * c.y,
    };
  });
}

/** `d` for the camber curve from leading edge (0,0) to trailing edge (chord,0). */
export function sectionPath(s: SectionShape, chord: number): string {
  const c = camberControl(s, chord);
  return `M 0 0 Q ${c.x.toFixed(2)} ${c.y.toFixed(2)} ${chord.toFixed(2)} 0`;
}

/** Twist of a section relative to the reference (¼) section, degrees. */
export function twistRelativeDeg(s: SectionShape, ref: SectionShape): number {
  return s.twistDeg - ref.twistDeg;
}

/** End of an entry/exit tick: `dir` +1 leaves the leading edge, −1 the trailing. */
export function tickEnd(origin: Pt, deg: number, len: number, dir: 1 | -1): Pt {
  const r = (deg * Math.PI) / 180;
  return { x: origin.x + dir * len * Math.cos(r), y: origin.y - dir * len * Math.sin(r) };
}

/**
 * Mast centreline, partners (index 0) to tip, in screen px.
 * Bend is exaggerated; rake is real and spread linearly up the mast.
 */
export function mastPoints(
  rig: RigState,
  heightPx: number,
  mmPerPx: number,
  exaggeration = EXAGGERATION,
): Pt[] {
  const n = rig.bendMm.length;
  return rig.bendMm.map((bend, i) => {
    const f = n > 1 ? i / (n - 1) : 0;
    return {
      x: (rig.rakeMm * f - bend * exaggeration) / mmPerPx,
      y: heightPx * (1 - f),
    };
  });
}

export function polyline(pts: Pt[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

/**
 * Forestay as a sagging quadratic. The curve's midpoint sits halfway to the
 * control point, so the control offset is twice the sag we want to show.
 */
export function sagPath(
  top: Pt,
  bow: Pt,
  sagMm: number,
  mmPerPx: number,
  exaggeration = EXAGGERATION,
): string {
  const d = (sagMm * exaggeration) / mmPerPx;
  const cx = (top.x + bow.x) / 2 + 2 * d;
  const cy = (top.y + bow.y) / 2;
  return `M ${top.x.toFixed(2)} ${top.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${bow.x.toFixed(2)} ${bow.y.toFixed(2)}`;
}

export type TelltaleState = 'streaming' | 'lifting' | 'stalled';

/**
 * Indicative only: apparent wind angle against the section's entry angle, with
 * a flat band either side. Not a separation model — the real one needs a
 * boundary layer the core does not carry.
 */
export function telltaleState(awaDeg: number, entryDeg: number, band = 3): TelltaleState {
  const delta = awaDeg - entryDeg;
  if (delta < -band) return 'lifting';
  if (delta > band) return 'stalled';
  return 'streaming';
}

/** Indicative top-down hull outline, bow at (0, 0), stern at (0, 100). */
export const HULL_PATH =
  'M 0 0 C 9 18 14 34 15 52 C 15.5 68 14 84 12 100 L -12 100 C -14 84 -15.5 68 -15 52 C -14 34 -9 18 0 0 Z';

// ---------------------------------------------------------------------------
// Sail-section layout
//
// One place holds the numbers the SailSections drawing and its fit test both
// use, so "does anything clip?" is a unit test rather than a browser check.
// ---------------------------------------------------------------------------

/** Section-drawing layout, in the viewBox user units the component draws in. */
export const SECTION_LAYOUT = {
  /** viewBox is `0 0 w h`. */
  w: 272,
  h: 216,
  chord: 100,
  /** Luff x for the main and the jib panel. */
  luffX: [16, 152],
  /**
   * Row baselines, ¾ on top down to ¼. Spacing is set by the worst leech rise
   * a fully twisted, maximum-draft section can produce (~57.5 at chord 100);
   * geometry.test.ts fails if any clamped section escapes the viewBox.
   */
  rowY: [66, 128, 190],
  luffTop: 8,
  labelY: 206,
} as const;

/** Rotate `p` about `about`. Positive degrees is clockwise, as in SVG. */
export function rotate(p: Pt, deg: number, about: Pt = { x: 0, y: 0 }): Pt {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = p.x - about.x;
  const dy = p.y - about.y;
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
}

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Bounds of one section drawn from `luff` along +x, rotated `deg` about the
 * luff point. `deg` is the SVG rotation the component applies, so this is
 * exactly the ink that lands on the canvas.
 */
export function sectionBox(s: SectionShape, chord: number, luff: Pt, deg: number, n = 32): Box {
  const pts = sectionPoints(s, chord, n).map((p) =>
    rotate({ x: luff.x + p.x, y: luff.y + p.y }, deg, luff),
  );
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * Tightest box round `pts`, grown by `pad` on every side. The crop the plan
 * view is drawn to: feed it every point the picture can put on the canvas and
 * it says how big the viewBox has to be, so "does anything clip?" is a unit
 * test rather than a browser check.
 */
export function cropBox(pts: Pt[], pad = 0): Box {
  if (pts.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minY: Math.min(...ys) - pad,
    maxY: Math.max(...ys) + pad,
  };
}

export function unionBox(a: Box, b: Box): Box {
  return {
    minX: Math.min(a.minX, b.minX),
    maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY),
    maxY: Math.max(a.maxY, b.maxY),
  };
}
