/**
 * The one place the 3D view's signs live. Risk 2 of the cockpit plan is that
 * twist, entry and leeward drift between the core, the 2D pictures and this
 * scene; `conventions.test.ts` asserts every rule below against the 2D helpers
 * in `race/boat.ts`, so drift fails a test rather than shipping a sail that
 * bellies to windward.
 *
 * ## Frame
 *
 * Right-handed, boat-local, origin at the **mast heel on the sheer** — the
 * same datum `race/rigLayout.ts` uses for the side elevation.
 *
 *     +x forward (toward the stem)   +y up   +z to starboard
 *
 * The plan view (`race/boat.ts`) draws in +x to starboard, +y aft, so the two
 * frames map through `planToWorld`. Nothing else converts between them.
 *
 * ## Signs
 *
 * - **Tack.** `tackSide` from `race/boat.ts`: +1 on starboard tack (TWA >= 0),
 *   -1 on port. Every athwartships term carries it, exactly as in 2D.
 * - **Leeward** is `lee = -side` along +z: on starboard tack the sails go to
 *   port. `leeward()` returns the unit vector.
 * - **Sheeting angle** is unsigned degrees off the centreline, as
 *   `boat.boomAngle` and `boat.jibSheetAngle` return it. `chordDir` applies
 *   the tack.
 * - **Twist** is positive when the leech falls off *to leeward*, so it adds to
 *   the sheeting angle. That is the core's convention too: `shape/flying.ts`
 *   scales one positive `twistTop` by height and clamps it to [0, 30].
 * - **Entry** is positive when the camber line leaves the luff toward the
 *   leeward (convex) side — the arc half-angle `shape/flying.ts` computes as
 *   `atan(2 * draft / draftPos)`. In section-local terms it is `dy/dx` at the
 *   luff, with y measured along `camberDir`.
 * - **Heel** tips the masthead to leeward: a rotation about +x of `-side*heel`.
 * - **Rake** is not a rotation here. It is baked into the mast polyline by
 *   `rig3d.ts`, the way `race/geometry.ts:mastPoints` does it in 2D, so the
 *   luff spine and everything hanging off it follow the real spar. A rig-group
 *   rotation would be the same angle and one more frame to keep straight.
 *
 * ## Sections lie in horizontal planes
 *
 * Chord directions are horizontal and the section stack is indexed by height
 * above the sail's tack, not by distance along the luff. That is how draft
 * stripes are actually sighted (research 03, source 31), and it keeps this
 * loft and the plan view reading the same chord. The luff itself rakes and
 * sags, so the spanwise grid lines are not vertical and the surface normals
 * tilt with them.
 */
import boat from '../../../data/boats/j70.json';
import { tackSide, type Side } from '../race/boat';

export { tackSide };
export type { Side };

/**
 * Stem, +J forward of the mast heel — the reduction `race/rigLayout.ts` uses
 * for the side elevation, and the fore-and-aft datum every drawing shares.
 */
export const STEM_X = boat.rig.jM;

/** Bowsprit fully extended: where the gennaker tacks at `sprit = 100`. */
export const SPRIT_TIP_X = STEM_X + boat.rig.bowspritOuterMm / 1000;

/** `[x, y, z]` in the frame above. A tuple, so it is JSON-safe and cheap. */
export type Vec3 = [number, number, number];

export const DEG2RAD = Math.PI / 180;

/** Which way is leeward: -1 on starboard tack (to port), +1 on port tack. */
export function lee(side: Side): -1 | 1 {
  return side === 1 ? -1 : 1;
}

/** Unit vector pointing to leeward. */
export function leeward(side: Side): Vec3 {
  return [0, 0, lee(side)];
}

/**
 * Chord direction for a sail sheeted `thetaRad` off the centreline: aft, and
 * open to leeward by that angle. `thetaRad` is unsigned (sheeting angle plus
 * twist); the tack supplies the sign.
 */
export function chordDir(thetaRad: number, side: Side): Vec3 {
  return [-Math.cos(thetaRad), 0, lee(side) * Math.sin(thetaRad)];
}

/**
 * The section's camber direction: perpendicular to `chordDir`, horizontal, and
 * on the leeward side — the convex face of the aerofoil. It cannot be
 * recovered from the chord alone: a chord on the centreline is the same vector
 * on either tack, and only the tack says which face is the low-pressure one.
 */
export function camberDir(thetaRad: number, side: Side): Vec3 {
  return [Math.sin(thetaRad), 0, lee(side) * Math.cos(thetaRad)];
}

/** Heel rotation about +x, radians. Positive `heelDeg` tips the rig to leeward. */
export function heelRad(heelDeg: number, side: Side): number {
  return -side * heelDeg * DEG2RAD;
}

/**
 * A plan-view point (`race/boat.ts` frame: +x starboard, +y aft) as a world
 * vector. Lengths are whatever the caller passed in; only the axes move.
 */
export function planToWorld(p: { x: number; y: number }): Vec3 {
  return [-p.y, 0, p.x];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scaled(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function norm(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Point at fraction `f` (0 = first, 1 = last) along a polyline. */
export function along(pts: Vec3[], f: number): Vec3 {
  const last = pts.length - 1;
  if (last <= 0) return pts[0];
  const s = Math.min(last, Math.max(0, f * last));
  const i = Math.min(last - 1, Math.floor(s));
  return lerp3(pts[i], pts[i + 1], s - i);
}
