/**
 * The framing invariants of the 3D hero's camera presets. Two things went
 * wrong in audit kite-3d-01 and neither had a test:
 *
 * - H-10: the fit backs the eye off along the authored sight line, so a
 *   downward-pointing pose ends up under the sea — and the water is a
 *   single-sided plane, so from below there is no water and no horizon.
 * - H-06: `helm` was exempt from the fit altogether, so the hull and boom fell
 *   off the bottom edge at every aspect ratio.
 *
 * Both are asserted against the boat's real drawn extremes rather than a
 * stand-in radius, at the two aspect ratios the hero actually gets and on both
 * tacks, upwind and under the kite.
 */
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { DownControls, RigState } from '../../core/types';
import { EYE_MIN_Y, presetPose } from './camera';
import { DEG2RAD, type Side, type Vec3 } from './conventions';
import { hullMesh, WATER_Y } from './hull';
import { BARE_SPAR, kiteGeometry } from './kite';
import { PRESET_ORDER, type PresetId } from './presets';
import { rig3d } from './rig3d';

const RIG: RigState = {
  bendMm: [0, 12, 28, 47, 66, 80, 86, 82, 68, 44, 14],
  sagMm: 90,
  rakeMm: 420,
  prebendMm: 40,
  forestayN: 3200,
  upperN: 2600,
  lowerN: 1400,
};
const DOWN: DownControls = { kiteHalyard: 100, tackLine: 20, kiteSheet: 55, sprit: 100 };

const SIDES: Side[] = [1, -1];
/** The desktop hero is a 3.3:1 band, the phone one is nearly square. */
const ASPECTS = [1292 / 396, 358 / 320];
const FOV = 42; // `SailView3D.svelte`'s PerspectiveCamera
/** `race/boat.ts:boomAngle` at the upwind and downwind base trims. */
const boomRad = (kite: boolean): number => (kite ? 67.4 : 19.6) * DEG2RAD;

/**
 * The extremes of what the scene draws, as the component's `fitBoat()` would
 * measure them: hull shell, spar, forestay, boom, the rigging and bowsprit
 * line segments, and — with the kite up — the gennaker's tack, head, clew,
 * bowed luff and leech. Cloth hangs inside that envelope, so this is the same
 * box to within the sails' own camber.
 */
function boatBox(side: Side, kite: boolean): Box3 {
  const r = rig3d(RIG, side, boomRad(kite));
  const pts: Vec3[] = [...r.mast, ...r.forestay, ...r.boom];
  const hull = hullMesh().positions;
  for (let i = 0; i < hull.length; i += 3) pts.push([hull[i], hull[i + 1], hull[i + 2]]);
  for (let i = 0; i < r.lines.length; i += 3)
    pts.push([r.lines[i], r.lines[i + 1], r.lines[i + 2]]);
  if (kite) {
    const k = kiteGeometry(DOWN, BARE_SPAR, side, 150);
    pts.push(k.tack, k.head, k.clew);
    for (let h = 0; h <= 1.0001; h += 0.1) {
      pts.push(k.spine(h), k.leechAt(k.clew[1] + h * (k.head[1] - k.clew[1])));
    }
  }
  const box = new Box3();
  for (const p of pts) box.expandByPoint(new Vector3(...p));
  return box;
}

/** Every case the presets are asked to frame: tack × sail plan × viewport. */
const CASES: { side: Side; kite: boolean; aspect: number; name: string }[] = SIDES.flatMap((side) =>
  [false, true].flatMap((kite) =>
    ASPECTS.map((aspect) => ({
      side,
      kite,
      aspect,
      name: `${side > 0 ? 'starboard' : 'port'}, ${kite ? 'gennaker' : 'upwind'}, aspect ${aspect.toFixed(2)}`,
    })),
  ),
);

function shot(id: PresetId, side: Side, kite: boolean, aspect: number): PerspectiveCamera {
  const [pos, target] = presetPose(id, side, boatBox(side, kite), FOV, aspect);
  const cam = new PerspectiveCamera(FOV, aspect, 0.2, 200);
  cam.position.copy(pos);
  cam.lookAt(target);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}

describe('preset framing', () => {
  // audit kite-3d-01 H-10: `luff` sighted 47° downward, so the fit put the eye
  // about 11 m under the keel at every state and every viewport.
  it.each(CASES)('keeps the eye above the water — $name', ({ side, kite, aspect }) => {
    const box = boatBox(side, kite);
    for (const id of PRESET_ORDER) {
      const [pos] = presetPose(id, side, box, FOV, aspect);
      expect(pos.y, `${id} eye`).toBeGreaterThan(WATER_Y);
      expect(pos.y, `${id} eye`).toBeGreaterThanOrEqual(EYE_MIN_Y - 1e-9);
    }
  });

  // audit kite-3d-01 H-06: `helm` skipped the fit and the resize refit, so the
  // gooseneck, boom end and whole hull sat below the bottom edge.
  it.each(CASES)('holds the whole boat in frame — $name', ({ side, kite, aspect }) => {
    const box = boatBox(side, kite);
    const rig = rig3d(RIG, side, boomRad(kite));
    const marks: [string, Vector3][] = [
      ['masthead', new Vector3(...rig.masthead)],
      ['gooseneck', new Vector3(...rig.gooseneck)],
      ['boom end', new Vector3(...rig.boom[1])],
      ['keel', new Vector3(0, box.min.y, 0)], // the hull's lowest point, on the centreline
    ];
    for (const id of PRESET_ORDER) {
      const cam = shot(id, side, kite, aspect);
      for (const [what, p] of marks) {
        const ndc = p.clone().project(cam);
        expect(Math.abs(ndc.x), `${id}: ${what} off the side`).toBeLessThan(1);
        expect(Math.abs(ndc.y), `${id}: ${what} off the top or bottom`).toBeLessThan(1);
      }
    }
  });

  it('fills the frame rather than leaving the boat a speck', () => {
    const box = boatBox(1, false);
    for (const id of PRESET_ORDER) {
      const cam = shot(id, 1, false, ASPECTS[0]);
      let lo = 1;
      let hi = -1;
      for (let i = 0; i < 8; i++) {
        const c = new Vector3(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z,
        ).project(cam);
        lo = Math.min(lo, c.y);
        hi = Math.max(hi, c.y);
      }
      // On this 3.3:1 band every preset is height-limited, so the fitted box
      // should reach most of the frame's 2.0 of NDC height.
      expect(hi - lo, `${id} vertical fill`).toBeGreaterThan(1.6);
    }
  });
});
