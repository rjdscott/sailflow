/**
 * Sail surface from the solver's sectional shape. Pure: no `three`, no DOM, no
 * classes — so every invariant the picture depends on is a Vitest assertion
 * with no GPU in sight (research 03 §7, tier 1).
 *
 * A sail is a stack of 2D section curves lofted along the luff spine — the
 * reduction SailVis and Fossati both use, and the one North's Spine-and-Spiral
 * moulds from (research 03 §3). We already hold every parameter it wants:
 * camber, draft position, entry angle and twist at quarter, half and
 * three-quarter height. Foot and head are synthesised; see `sectionStack`.
 *
 * Signs and axes live in `conventions.ts`. Heel and rake are *not* here: they
 * are a rotation on the parent object and a bend in the spine respectively, so
 * these tests stay independent of the boat's attitude.
 */
import {
  add,
  camberDir as camberDirOf,
  chordDir as chordDirOf,
  cross,
  DEG2RAD,
  lee,
  norm,
  scaled,
  sub,
  type Side,
  type Vec3,
} from './conventions';
import type { SailShape } from '../../core/types';

// ---------------------------------------------------------------------------
// Section camber line
// ---------------------------------------------------------------------------

/**
 * Camber-line coefficients: `y(x) = x(1-x)(a + b x + c x^2)`, x along the
 * chord from luff (0) to leech (1), y toward leeward in chord fractions.
 */
export interface Profile {
  a: number;
  b: number;
  c: number;
}

/** Draft position is clamped away from the ends, as `race/geometry.ts` does. */
const DRAFT_POS_MIN = 0.15;
const DRAFT_POS_MAX = 0.85;
/** Camber clamp, matching `race/geometry.ts:camberControl`. */
const CAMBER_MAX = 0.5;
/** Entry beyond this is not a sail, it is a hook. Radians. */
const ENTRY_MAX = 60 * DEG2RAD;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * The section curve, solved closed-form for all three numbers the readouts
 * show: maximum camber, the chord fraction it sits at, and the luff tangent.
 *
 * ponytail: a quartic in x rather than the research sketch's cubic Bézier plus
 * Newton steps. Three conditions need three free coefficients, a cubic has
 * two, and pinning the abscissae of a quartic Bézier at 0, ¼, ½, ¾, 1 makes
 * x(t) = t — so the curve is a polynomial in x, the three conditions are two
 * linear equations after `a`, and there is nothing to iterate and nothing to
 * invert. Same curve family, no root finder.
 *
 *   y'(0) = a                      = tan(entry)
 *   y(p)  = p(1-p)(a + bp + cp^2)  = camber
 *   y'(p) = 0                      (the maximum is at the draft position)
 */
export function solveSectionBezier(camber: number, draftPos: number, entryRad: number): Profile {
  const p = clamp(draftPos, DRAFT_POS_MIN, DRAFT_POS_MAX);
  const d = clamp(camber, 0, CAMBER_MAX);
  const a = Math.tan(clamp(entryRad, -ENTRY_MAX, ENTRY_MAX));
  if (d === 0 && a === 0) return { a: 0, b: 0, c: 0 };
  // G is the curve's value at p divided by the x(1-x) envelope; S falls out of
  // setting the derivative to zero there.
  const G = d / (p * (1 - p));
  const S = (-(1 - 2 * p) * G) / (p * (1 - p));
  const c = (S * p - G + a) / (p * p);
  const b = S - 2 * c * p;
  return { a, b, c };
}

/** The camber line at chord fraction `x`, in chord fractions to leeward. */
export function profileY(prof: Profile, x: number): number {
  return x * (1 - x) * (prof.a + prof.b * x + prof.c * x * x);
}

// ---------------------------------------------------------------------------
// Monotone cubic interpolation over height
// ---------------------------------------------------------------------------

/**
 * Fritsch–Carlson monotone cubic (PCHIP) through `(xs, ys)`. Catmull-Rom is
 * the obvious choice on five knots and it overshoots on the monotone twist
 * ramp, inventing a hook in the upper leech that is not in the data (research
 * 03 risk 2). This is the one place in the file not to be lazy.
 *
 * Outside `[xs[0], xs[n-1]]` the value is clamped to the end knot; the loft
 * only ever samples inside.
 */
export function pchip(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n === 0) return () => 0;
  if (n === 1) return () => ys[0];

  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
    delta.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  }

  const d = new Array<number>(n);
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      d[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
  }
  d[0] = edgeSlope(h, delta, false);
  d[n - 1] = edgeSlope(h, delta, true);

  return (x: number): number => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = n - 2;
    while (i > 0 && x < xs[i]) i--;
    const t = (x - xs[i]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    // Hermite basis.
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h[i] * d[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h[i] * d[i + 1]
    );
  };
}

/** One-sided three-point end slope, shaved back so the end stays monotone. */
function edgeSlope(h: number[], delta: number[], last: boolean): number {
  const n = delta.length;
  if (n === 1) return delta[0];
  const [h0, h1, d0, d1] = last
    ? [h[n - 1], h[n - 2], delta[n - 1], delta[n - 2]]
    : [h[0], h[1], delta[0], delta[1]];
  let s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (s * d0 <= 0) s = 0;
  else if (d0 * d1 <= 0 && Math.abs(s) > Math.abs(3 * d0)) s = 3 * d0;
  return s;
}

// ---------------------------------------------------------------------------
// Section stack: the three solved knots, plus a synthesised foot and head
// ---------------------------------------------------------------------------

/** One height's flying shape, in the units the loft wants. */
export interface Section {
  /** 0 at the sail's tack, 1 at the head. */
  h: number;
  /** Metres. */
  chord: number;
  /** Maximum draft as a fraction of chord. */
  camber: number;
  /** Chord fraction aft of the luff where that maximum sits. */
  draftPos: number;
  /** Luff tangent, radians, positive to leeward. */
  entryRad: number;
  /** Radians open from the sheeting angle, positive = leech falls to leeward. */
  twistRad: number;
  /**
   * How far the middle of this section hangs *below* its own horizontal plane,
   * metres — the skirt. Both ends stay pinned (the luff on the spine, the
   * leech on the leech line) and the sag is a half-sine between them, so an
   * edge length and a corner position are unaffected by it.
   *
   * Sections are horizontal by construction (`conventions.ts`), which is right
   * for a sail whose foot is on a boom or a deck sweep, and wrong for a
   * gennaker: its foot is a free edge between two corners and it hangs. Only
   * the kite sets it; `sectionStack` leaves it undefined and the main and the
   * jib are drawn exactly as before.
   */
  dropM?: number;
}

/** Chords at the five stack heights, metres. */
export interface SailChords {
  foot: number;
  quarter: number;
  half: number;
  threeQuarter: number;
  head: number;
}

/**
 * Head camber as a fraction of the three-quarter section's.
 * prov: assumed. Nothing published gives a J/70 head camber, and the solver
 * stops at three-quarter height. 0.6 keeps the head visibly flatter than the
 * ¾ section without collapsing it to a plane — the head dominates the
 * silhouette, which is what people judge (research 03 risk 3). Entry is scaled
 * by the same factor, since the core's entry angle is `atan(2·camber/draftPos)`
 * and is therefore near-linear in camber at these depths.
 */
export const HEAD_CAMBER_FACTOR = 0.6;

/**
 * Foot twist, radians.
 * prov: assumed 0. The foot is on the boom (main) or between tack and lead
 * (jib), so the sheeting angle *is* the foot's angle and there is nothing left
 * to open. The core agrees within a degree: its per-height twist multipliers
 * [0.3, 0.65, 1.0] at heights [¼, ½, ¾] extrapolate to −0.05 at the foot.
 */
export const FOOT_TWIST_RAD = 0;

/**
 * The five-section stack for one sail. The middle three come straight off the
 * solver; foot and head are extrapolations and are the assumption this file
 * carries (ASSUMPTIONS.md, "3D hero loft").
 *
 * Foot: the published foot chord (E for the main, LP for the jib), the quarter
 * section's camber, draft position and entry, and no twist.
 * Head: the published head width (Class Rules top-width maxima, so `prov:
 * published` for the chord), `HEAD_CAMBER_FACTOR` of the ¾ camber, the ¾ draft
 * position, and twist linearly extrapolated off the ½→¾ ramp — which is what
 * the core's own height multipliers do.
 */
export function sectionStack(shape: SailShape, chords: SailChords): Section[] {
  const q = shape.quarter;
  const hf = shape.half;
  const tq = shape.threeQuarter;
  const tqTwist = tq.twistDeg * DEG2RAD;
  const headTwist = Math.max(tqTwist, (2 * tq.twistDeg - hf.twistDeg) * DEG2RAD);
  return [
    {
      h: 0,
      chord: chords.foot,
      camber: q.draft,
      draftPos: q.draftPos,
      entryRad: q.entryDeg * DEG2RAD,
      twistRad: FOOT_TWIST_RAD,
    },
    { h: 0.25, chord: chords.quarter, ...fromShape(q) },
    { h: 0.5, chord: chords.half, ...fromShape(hf) },
    { h: 0.75, chord: chords.threeQuarter, ...fromShape(tq) },
    {
      h: 1,
      chord: chords.head,
      camber: tq.draft * HEAD_CAMBER_FACTOR,
      draftPos: tq.draftPos,
      entryRad: tq.entryDeg * HEAD_CAMBER_FACTOR * DEG2RAD,
      twistRad: headTwist,
    },
  ];
}

function fromShape(s: SailShape['quarter']): Omit<Section, 'h' | 'chord'> {
  return {
    camber: s.draft,
    draftPos: s.draftPos,
    entryRad: s.entryDeg * DEG2RAD,
    twistRad: s.twistDeg * DEG2RAD,
  };
}

// ---------------------------------------------------------------------------
// The loft
// ---------------------------------------------------------------------------

/** Luff point at height fraction `h`: the bent mast, or the sagged forestay. */
export type Spine = (h: number) => Vec3;

export interface SailMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  /** Spanwise rows at ¼, ½ and ¾ — where the draft stripes go. */
  stripeRows: number[];
  /** Grid dimensions, so callers can walk rows without recomputing them. */
  N: number;
  M: number;
}

/** Default spanwise samples. 24 × 32 = 768 verts, 1426 tris, under 1 ms. */
export const DEFAULT_N = 24;
/** Default chordwise samples, cosine-clustered toward the luff. */
export const DEFAULT_M = 32;

/**
 * Loft the section stack along `spine`.
 *
 * `baseAngleRad` is the unsigned sheeting angle off the centreline — what
 * `boat.boomAngle` and `boat.jibSheetAngle` return, in radians. `side` is the
 * tack. Both are needed: the sheeting angle says how far open the chord is,
 * and only the tack says which face of the aerofoil is the leeward one
 * (see `conventions.camberDir`).
 *
 * ponytail: normals come from central differences on the finished grid rather
 * than the sketch's analytic parametric derivatives. Same result to within a
 * rounding, seam-free by construction, and about fifteen lines instead of two
 * derivative expansions that would have to be re-derived every time the
 * profile changes.
 */
export function buildSail(
  sections: Section[],
  spine: Spine,
  baseAngleRad: number,
  side: Side,
  N = DEFAULT_N,
  M = DEFAULT_M,
): SailMesh {
  const hs = sections.map((s) => s.h);
  const chordAt = pchip(
    hs,
    sections.map((s) => s.chord),
  );
  const camberAt = pchip(
    hs,
    sections.map((s) => s.camber),
  );
  const draftPosAt = pchip(
    hs,
    sections.map((s) => s.draftPos),
  );
  const entryAt = pchip(
    hs,
    sections.map((s) => s.entryRad),
  );
  const twistAt = pchip(
    hs,
    sections.map((s) => s.twistRad),
  );
  // Only the kite skirts, so the main and the jib do not pay for the pchip or
  // the per-vertex sine.
  const dropAt = sections.some((s) => s.dropM)
    ? pchip(
        hs,
        sections.map((s) => s.dropM ?? 0),
      )
    : null;

  // Cosine clustering toward the luff, where the entry angle lives and where
  // uniform sampling shows facets.
  const xs = Array.from({ length: M }, (_, j) => 0.5 * (1 - Math.cos((Math.PI * j) / (M - 1))));

  const positions = new Float32Array(N * M * 3);
  const normals = new Float32Array(N * M * 3);

  for (let i = 0; i < N; i++) {
    const h = i / (N - 1);
    const chord = chordAt(h);
    const theta = baseAngleRad + twistAt(h);
    const cd = chordDirOf(theta, side);
    const md = camberDirOf(theta, side);
    const luff = spine(h);
    const prof = solveSectionBezier(camberAt(h), draftPosAt(h), entryAt(h));
    const drop = dropAt ? dropAt(h) : 0;
    for (let j = 0; j < M; j++) {
      const x = xs[j];
      const p = add(add(luff, scaled(cd, x * chord)), scaled(md, profileY(prof, x) * chord));
      const k = (i * M + j) * 3;
      positions[k] = p[0];
      positions[k + 1] = p[1] - drop * Math.sin(Math.PI * x);
      positions[k + 2] = p[2];
    }
  }

  gridNormals(positions, normals, N, M, lee(side));

  // Winding follows the normals: `gridIndices`' unflipped triangles wind so
  // their face normal is +cross(dV, dU), which is what `gridNormals` emits
  // when `sign` is positive.
  const indices = gridIndices(N, M, lee(side) < 0);
  const stripeRows = [0.25, 0.5, 0.75].map((f) => Math.round(f * (N - 1)));
  return { positions, normals, indices, stripeRows, N, M };
}

/** Chord fraction of grid column `j` under the cosine clustering `buildSail` uses. */
export function chordFraction(j: number, M: number): number {
  return 0.5 * (1 - Math.cos((Math.PI * j) / (M - 1)));
}

/** The grid column nearest to chord fraction `x` (0 = luff, 1 = leech). */
export function nearestColumn(mesh: { M: number }, x: number): number {
  let best = 0;
  let err = Infinity;
  for (let j = 0; j < mesh.M; j++) {
    const e = Math.abs(chordFraction(j, mesh.M) - x);
    if (e < err) {
      err = e;
      best = j;
    }
  }
  return best;
}

/**
 * Where a telltale ribbon roots and which way it streams: grid point `j` on
 * `row`, lifted `lift` metres off the cloth along the chord's horizontal
 * normal (so a mid-chord ribbon is not buried in the surface), streaming aft
 * along the local chord read luff-ward from `j - 3`. A leech ribbon hangs off
 * the edge and takes `lift` 0.
 *
 * **A positive `lift` is always the leeward face, a negative one the windward
 * face**, on either tack. The chord's horizontal normal has no such promise —
 * it flips sense with the tack — so it is signed here against the grid normal,
 * which `buildSail` already builds pointing to leeward (`gridNormals(...,
 * lee(side))`). That is what lets a caller ask for the pair of ribbons a real
 * luff carries and know which one of them is the windward one.
 *
 * `along` is the local chord at that row, twist included, which is the flow
 * direction a ribbon at that height streams in — not the boat's centreline.
 */
export function ribbonAnchor(
  mesh: SailMesh,
  row: number,
  j: number,
  lift: number,
): { root: Vec3; along: Vec3 } {
  const pts = gridRow(mesh, row);
  const back = pts[Math.max(0, j - 3)];
  const d: Vec3 = [pts[j][0] - back[0], pts[j][1] - back[1], pts[j][2] - back[2]];
  const l = Math.hypot(...d) || 1;
  const along: Vec3 = [d[0] / l, d[1] / l, d[2] / l];
  const ol = Math.hypot(along[2], along[0]) || 1;
  const out: Vec3 = [along[2] / ol, 0, -along[0] / ol];
  const n = at(mesh.normals, mesh.M, row, j);
  const s = out[0] * n[0] + out[2] * n[2] < 0 ? -lift : lift;
  return {
    root: [pts[j][0] + out[0] * s, pts[j][1], pts[j][2] + out[2] * s],
    along,
  };
}

/** One row of the grid as `Vec3`s — draft stripes, leech and luff lines. */
export function gridRow(mesh: SailMesh, i: number): Vec3[] {
  return Array.from({ length: mesh.M }, (_, j) => vertexOf(mesh, i, j));
}

/** One column of the grid: `j = 0` is the luff, `j = M - 1` the leech. */
export function gridColumn(mesh: SailMesh, j: number): Vec3[] {
  return Array.from({ length: mesh.N }, (_, i) => vertexOf(mesh, i, j));
}

function vertexOf(mesh: SailMesh, i: number, j: number): Vec3 {
  const k = (i * mesh.M + j) * 3;
  return [mesh.positions[k], mesh.positions[k + 1], mesh.positions[k + 2]];
}

function at(positions: Float32Array, M: number, i: number, j: number): Vec3 {
  const k = (i * M + j) * 3;
  return [positions[k], positions[k + 1], positions[k + 2]];
}

/**
 * Central-difference normals over an `N x M` grid, flipped by `sign` so every
 * normal points to leeward — the convex face, and the one the leeward-quarter
 * camera looks at. Degenerate rows (a head chord near zero) fall back to the
 * previous good normal rather than emitting NaN.
 */
export function gridNormals(
  positions: Float32Array,
  normals: Float32Array,
  N: number,
  M: number,
  sign: number,
): void {
  let last: Vec3 = [0, 0, sign];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const dU = sub(
        at(positions, M, i, Math.min(M - 1, j + 1)),
        at(positions, M, i, Math.max(0, j - 1)),
      );
      const dV = sub(
        at(positions, M, Math.min(N - 1, i + 1), j),
        at(positions, M, Math.max(0, i - 1), j),
      );
      const c = cross(dV, dU);
      const len = Math.hypot(c[0], c[1], c[2]);
      const n: Vec3 = len > 1e-9 ? scaled(norm(c), sign) : last;
      last = n;
      const k = (i * M + j) * 3;
      normals[k] = n[0];
      normals[k + 1] = n[1];
      normals[k + 2] = n[2];
    }
  }
}

/**
 * Standard grid triangles. `flip` reverses the winding so front faces stay on
 * the side the normals point at — on port tack the whole surface mirrors.
 * `N * M <= 65535` keeps the index buffer 16-bit.
 */
export function gridIndices(N: number, M: number, flip = false): Uint16Array {
  const out = new Uint16Array((N - 1) * (M - 1) * 6);
  let k = 0;
  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < M - 1; j++) {
      const a = i * M + j;
      const b = a + 1;
      const c = a + M;
      const d = c + 1;
      if (flip) {
        out[k++] = a;
        out[k++] = b;
        out[k++] = c;
        out[k++] = b;
        out[k++] = d;
        out[k++] = c;
      } else {
        out[k++] = a;
        out[k++] = c;
        out[k++] = b;
        out[k++] = b;
        out[k++] = c;
        out[k++] = d;
      }
    }
  }
  return out;
}
