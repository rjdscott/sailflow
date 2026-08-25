import { describe, expect, it } from 'vitest';
import {
  CURL_OUT_KT,
  DIRECTION_ONLY,
  downwindPlay,
  KITE_CUE,
  PLANING_MIN_KT,
  SOAK_MIN_KT,
  WING_MIN_KT,
} from './downwind';

describe('downwindPlay', () => {
  it('has a line for every downwind mode', () => {
    for (const mode of ['plane', 'soak', 'wing', 'vmg'] as const) {
      expect(downwindPlay(mode, 12).line, mode).toBeTruthy();
    }
  });

  it('falls back to the VMG line for an upwind mode, which is what an unnamed angle is', () => {
    expect(downwindPlay('high', 12).line).toBe(downwindPlay('vmg', 12).line);
    expect(downwindPlay('fast', 12).line).toBe(downwindPlay('vmg', 12).line);
  });

  it('says the plane will not hold below the planing band', () => {
    expect(downwindPlay('plane', PLANING_MIN_KT - 1).caveat).toMatch(/no plane to hold/);
    expect(downwindPlay('plane', PLANING_MIN_KT).caveat).toBeUndefined();
  });

  it('says the tack-up rotation does nothing in the light, where the sources agree it does not', () => {
    expect(downwindPlay('soak', SOAK_MIN_KT - 1).caveat).toMatch(/keep it down/);
  });

  it('shows the tack-line band rather than a number once soaking works', () => {
    expect(downwindPlay('soak', SOAK_MIN_KT).caveat).toMatch(/0–12 in across four sources/);
  });

  it('withdraws the curl cue above the displacement band, in the modes that use it', () => {
    const breeze = CURL_OUT_KT + 1;
    expect(downwindPlay('vmg', breeze).caveat).toMatch(/trim the curl out/);
    expect(downwindPlay('soak', breeze).caveat).toMatch(/trim the curl out/);
    // Plane already says it in its line; it must not be told twice.
    expect(downwindPlay('plane', breeze).caveat).toBeUndefined();
    expect(downwindPlay('vmg', CURL_OUT_KT).caveat).toBeUndefined();
  });

  it('holds wing mode back until it starts to work', () => {
    expect(downwindPlay('wing', WING_MIN_KT - 1).caveat).toMatch(/starts to work/);
    expect(downwindPlay('wing', WING_MIN_KT).caveat).toBeUndefined();
  });
});

describe('panel copy', () => {
  it('makes the sheet the trim and everything else secondary', () => {
    expect(KITE_CUE).toMatch(/luff curls/);
    expect(KITE_CUE).toMatch(/sheet is the whole trim/);
  });

  it('says the four controls move the drawing, not the numbers', () => {
    expect(DIRECTION_ONLY).toMatch(/^Direction only/);
    expect(DIRECTION_ONLY).toMatch(/not the numbers/);
  });
});
