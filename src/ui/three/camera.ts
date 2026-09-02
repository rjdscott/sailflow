/**
 * Camera framing for the 3D hero: how far back a preset's sight line has to
 * start so the whole boat is in the picture, and how to keep the eye out of
 * the sea while doing it.
 *
 * Split out of `SailView3D.svelte` so it can be tested without a WebGL
 * context — it needs `three`'s vector maths and nothing else. The component
 * owns the scene and hands in the boat's world bounding box plus the camera's
 * fov and aspect. prov: assumed — framing, not physics.
 */
import { Box3, Vector3 } from 'three';
import { DEG2RAD, lee, type Side } from './conventions';
import { WATER_Y } from './hull';
import { PRESETS, type PresetId } from './presets';

/**
 * prov: assumed — framing, not physics. The water is a single-sided plane
 * (back-face culled) and the horizon is its edge, so an eye below the surface
 * sees the boat from under its own keel with no sea and no skyline. Half a
 * metre of air keeps the surface a surface rather than a coincident plane.
 */
export const EYE_MIN_Y = WATER_Y + 0.5;

/**
 * prov: assumed FIT_MARGIN 1.06 — a little air so the masthead and transom
 * never touch the edge.
 */
export const FIT_MARGIN = 1.06;

const UP = new Vector3(0, 1, 0);
const fitCentre = new Vector3();
const fitRight = new Vector3();
const fitUp = new Vector3();
const fitFwd = new Vector3();
const fitCorner = new Vector3();

/**
 * Distance back from the box centre, along `dir`, that keeps all eight
 * corners inside the view on *both* axes — the vertical FOV and the
 * horizontal one the slot's aspect implies. Closed form: each corner needs
 * `|x| ≤ tan(h/2)·depth` and `|y| ≤ tan(v/2)·depth`, and depth is the
 * distance plus the corner's offset along the view axis. A portrait column
 * is limited by its width, a landscape band by its height; fitting only
 * the vertical FOV was what cropped the boat in the tall desktop hero.
 */
export function fitDistance(box: Box3, dir: Vector3, fovDeg: number, aspect: number): number {
  const tv = Math.tan((fovDeg / 2) * DEG2RAD) / FIT_MARGIN;
  const th = tv * aspect;
  box.getCenter(fitCentre);
  fitFwd.copy(dir).negate().normalize(); // camera looks from centre+dir·d towards centre
  fitRight.crossVectors(fitFwd, UP).normalize();
  if (fitRight.lengthSq() < 1e-6) fitRight.set(1, 0, 0);
  fitUp.crossVectors(fitRight, fitFwd);
  let need = 0;
  for (let i = 0; i < 8; i++) {
    fitCorner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    );
    fitCorner.sub(fitCentre);
    const along = fitCorner.dot(fitFwd); // positive = further from the camera than the centre
    need = Math.max(
      need,
      Math.abs(fitCorner.dot(fitRight)) / th - along,
      Math.abs(fitCorner.dot(fitUp)) / tv - along,
    );
  }
  return need;
}

const eyeH = new Vector3();
const eyeDir = new Vector3();

/**
 * Eye position looking at `target` from bearing `dir`, backed off far enough
 * to frame `box` and never below {@link EYE_MIN_Y}.
 *
 * A downward sight line descends `|dir.y|` metres for every metre the fit
 * backs off, so a pose that looks fine as authored ends up under the keel
 * once it is fitted from twenty metres. Clamping y alone would shorten the
 * sight line and crop the boat, so the eye is pinned at the surface and the
 * *bearing* is re-solved: keep the azimuth, put the eye at `EYE_MIN_Y`, and
 * iterate distance against elevation until they agree (three passes is well
 * inside a millimetre for this boat; the final clamp makes the invariant
 * exact whatever the geometry).
 */
export function fitEye(
  box: Box3,
  target: Vector3,
  dir: Vector3,
  fovDeg: number,
  aspect: number,
): Vector3 {
  eyeDir.copy(dir).normalize();
  const pos = target.clone().addScaledVector(eyeDir, fitDistance(box, eyeDir, fovDeg, aspect));
  if (pos.y >= EYE_MIN_Y) return pos;

  eyeH.set(eyeDir.x, 0, eyeDir.z);
  if (eyeH.lengthSq() < 1e-6) eyeH.set(1, 0, 0); // straight down: pick a bearing rather than divide by zero
  eyeH.normalize();
  const drop = EYE_MIN_Y - target.y; // negative: the eye sits below what it looks at
  for (let i = 0; i < 3; i++) {
    const d = fitDistance(box, eyeDir, fovDeg, aspect);
    const reach = Math.sqrt(Math.max(d * d - drop * drop, 0.01));
    eyeDir.set(eyeH.x * reach, drop, eyeH.z * reach).normalize();
  }
  pos.copy(target).addScaledVector(eyeDir, fitDistance(box, eyeDir, fovDeg, aspect));
  pos.y = Math.max(pos.y, EYE_MIN_Y);
  return pos;
}

/**
 * The camera pose for a preset: every preset keeps its authored *bearing* and
 * then looks at, and backs off from, the centre of what is actually drawn, so
 * the whole boat is in the picture at any aspect ratio. Only the direction of
 * `PRESETS[id]` survives; its position and target set the bearing alone.
 */
export function presetPose(
  id: PresetId,
  side: Side,
  box: Box3,
  fovDeg: number,
  aspect: number,
): [Vector3, Vector3] {
  const p = PRESETS[id];
  const z = lee(side);
  const pos = new Vector3(p.position[0], p.position[1], p.position[2] * z);
  const target = new Vector3(p.target[0], p.target[1], p.target[2] * z);
  const dir = pos.clone().sub(target).normalize();
  box.getCenter(target);
  return [fitEye(box, target, dir, fovDeg, aspect), target];
}
