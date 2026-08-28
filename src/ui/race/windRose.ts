/**
 * The angle maths behind `WindRose.svelte`, kept out of the component so it
 * can be tested without a DOM: a pointer position becomes a true wind angle,
 * and every way of changing that angle lands on a legal, whole degree.
 *
 * The rose draws the boat bow-up. 0° is head to wind, 180° is dead downwind,
 * and the sign of the pointer's side is dropped — the app sails one tack and
 * `tackSide()` decides which side the drawing mirrors to.
 */

/** The angles the solver is asked for anywhere in the app (`share.ts`, the sheet's slider). */
export const TWA_MIN = 20;
export const TWA_MAX = 180;

/** Whole degrees, inside the range. Snap is 1°: the solver's own resolution. */
export function clampTwa(deg: number): number {
  return Math.min(TWA_MAX, Math.max(TWA_MIN, Math.round(deg)));
}

/**
 * The angle a pointer at (x, y) is asking for, in degrees off the bow, given
 * the rose's centre. Straight up is 0°, straight down is 180°, and left and
 * right of the centreline read the same — the rose is a protractor, not a
 * compass rose.
 *
 * A press exactly on the centre has no angle to report; it reads 0° and the
 * clamp turns that into the tightest legal one, which is what a drag through
 * the middle of the rose should do rather than jumping to the last angle.
 */
export function angleAt(cx: number, cy: number, x: number, y: number): number {
  const deg = (Math.atan2(Math.abs(x - cx), cy - y) * 180) / Math.PI;
  return clampTwa(deg);
}

/** Arrow-key step: ±1°, ±5° with shift, clamped. */
export function stepTwa(deg: number, key: string, shift: boolean): number | null {
  const by = shift ? 5 : 1;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return clampTwa(deg + by);
    case 'ArrowLeft':
    case 'ArrowUp':
      return clampTwa(deg - by);
    case 'Home':
      return TWA_MIN;
    case 'End':
      return TWA_MAX;
    default:
      return null;
  }
}
