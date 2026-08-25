/**
 * A sportboat hull, generated. Pure: no `three`, no DOM.
 *
 * **Illustrative, not a J/70.** Only LOA and beam come off `j70.json`; every
 * station below is drawn by eye. That is deliberate: the free CAD libraries
 * are non-commercial or per-model CC roulette, and "J/70" is a trademarked
 * one-design, so a branded model on a public Pages site is a licence problem
 * we do not need (research 03 §4, source 33). About forty lines and four
 * hundred triangles buys a hull with no attribution obligations, and the
 * caption says what it is.
 *
 * Frame and datum are `conventions.ts`: origin at the mast heel on the sheer,
 * +x forward, +y up, +z to starboard.
 */
import boat from '../../../data/boats/j70.json';
import { gridIndices, gridNormals } from './loft';

export interface Mesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
}

const LOA = boat.hull.loaM;
const HALF_BEAM = boat.hull.beamM / 2;
const J = boat.rig.jM;

/**
 * Sheer above the waterline, m. prov: assumed — the same 0.75 m
 * `race/rigLayout.ts` uses, and for the same reason: nothing published gives a
 * J/70 freeboard, and `aero.hbiM` is an aero fit rather than a hull dimension.
 */
export const FREEBOARD_M = 0.75;

/**
 * Canoe-body depth below the waterline, m. prov: assumed — the hull under the
 * water, keel excluded. Drawing only; nothing physical reads it.
 */
const CANOE_DEPTH_M = 0.22;

/**
 * Stations aft of the stem as a fraction of LOA, with half-breadth and canoe
 * depth as fractions of their maxima. prov: assumed — a sportboat plan: fine
 * but not hollow forward, maximum beam about 62 % aft, most of that beam
 * carried to a squared-off transom. Matches the plan-view outline in
 * `race/boat.ts` by eye, which is the only agreement claimed.
 */
const STATIONS: [t: number, beam: number, depth: number][] = [
  [0.0, 0.02, 0.08],
  [0.1, 0.38, 0.55],
  [0.25, 0.72, 0.85],
  [0.45, 0.94, 1.0],
  [0.62, 1.0, 1.0],
  [0.8, 0.97, 0.94],
  [1.0, 0.86, 0.78],
];

/**
 * Superellipse exponent for the station shape: 2 is a round bilge, higher is
 * harder. prov: assumed 2.5, a firm sportboat turn. Drawing only.
 */
const BILGE_N = 2.5;

/** Girth samples per half-station. The full girth is `2 * GIRTH - 1` columns. */
const GIRTH = 9;

/** Waterline height in the boat frame: the sheer is the datum, so it is below. */
export const WATER_Y = -FREEBOARD_M;

/** Stem at +J forward of the mast heel — the reduction `rigLayout.ts` uses. */
export const STEM_X = J;
export const TRANSOM_X = J - LOA;
export const SPRIT_TIP_X = J + boat.rig.bowspritOuterMm / 1000;

function stationX(t: number): number {
  return STEM_X - t * LOA;
}

/**
 * The canoe body: stations lofted stem to transom, girth running from the port
 * sheer round the keel line to the starboard sheer, so the surface is one
 * grid and one draw call.
 */
export function hullMesh(): Mesh {
  const N = STATIONS.length;
  const M = 2 * GIRTH - 1;
  const positions = new Float32Array(N * M * 3);
  for (let i = 0; i < N; i++) {
    const [t, b, d] = STATIONS[i];
    const x = stationX(t);
    const halfB = b * HALF_BEAM;
    const depth = d * CANOE_DEPTH_M + FREEBOARD_M;
    for (let j = 0; j < M; j++) {
      // u runs -1 (port sheer) .. 0 (keel line) .. +1 (starboard sheer).
      const u = (2 * j) / (M - 1) - 1;
      const a = Math.abs(u);
      const k = (i * M + j) * 3;
      positions[k] = x;
      positions[k + 1] = -depth * Math.pow(1 - Math.pow(a, BILGE_N), 1 / BILGE_N);
      positions[k + 2] = u * halfB;
    }
  }
  const normals = new Float32Array(N * M * 3);
  // Spanwise runs aft and girthwise runs to starboard, so cross(dV, dU) points
  // inboard; -1 turns every normal outward. `hull.test.ts` holds that.
  gridNormals(positions, normals, N, M, -1);
  return { positions, normals, indices: gridIndices(N, M, true) };
}

/** The deck: the sheer line filled flat at y = 0, five columns across. */
export function deckMesh(): Mesh {
  const N = STATIONS.length;
  const M = 5;
  const positions = new Float32Array(N * M * 3);
  const normals = new Float32Array(N * M * 3);
  for (let i = 0; i < N; i++) {
    const [t, b] = STATIONS[i];
    const x = stationX(t);
    for (let j = 0; j < M; j++) {
      const k = (i * M + j) * 3;
      positions[k] = x;
      positions[k + 1] = 0;
      positions[k + 2] = ((2 * j) / (M - 1) - 1) * b * HALF_BEAM;
      normals[k + 1] = 1;
    }
  }
  return { positions, normals, indices: gridIndices(N, M, true) };
}
