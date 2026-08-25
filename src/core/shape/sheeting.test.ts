import { describe, expect, it } from 'vitest';
import j70 from '../../../data/boats/j70.json';
import type { BoatDefinition } from '../types';
import { boomAngle, jibSheetAngle, sheetingEffect } from './sheeting';

const boat = { ...j70, calibration: {} } as unknown as BoatDefinition;

describe('sheeting angles', () => {
  it('boom: a beat is ~12°, a run reaches the cap, traveller up pulls it in', () => {
    expect(boomAngle(70, 20)).toBeCloseTo(12, 0);
    expect(boomAngle(0, 0)).toBe(90);
    expect(boomAngle(70, 60)).toBeLessThan(boomAngle(70, 20));
  });
  it('jib: 70 % sheet is ~10°, fully eased reaches a beam-reach angle', () => {
    expect(jibSheetAngle(5, 70)).toBeCloseTo(9.8, 0);
    expect(jibSheetAngle(5, 0)).toBeGreaterThan(45);
  });
});

describe('sheetingEffect', () => {
  const twist = 8;
  it('is ideal inside the band and for the kite', () => {
    // AWA 26, boom 12, twist 8: AoA = 26 − 12 − 2 = 12, opt 16, band 4 → in.
    expect(sheetingEffect(boat, 'main', 26, { sheetDeg: 12, twistDeg: twist })).toEqual({
      clMul: 1,
      dCd0: 0,
    });
    expect(sheetingEffect(boat, 'asym', 112, { sheetDeg: 0, twistDeg: 0 })).toEqual({
      clMul: 1,
      dCd0: 0,
    });
  });
  it('eased past the band loses lift monotonically, without drag', () => {
    const a = sheetingEffect(boat, 'main', 26, { sheetDeg: 20, twistDeg: twist });
    const b = sheetingEffect(boat, 'main', 26, { sheetDeg: 40, twistDeg: twist });
    expect(a.clMul).toBeLessThan(1);
    expect(b.clMul).toBeLessThan(a.clMul);
    expect(b.clMul).toBeGreaterThanOrEqual(0.2);
    expect(b.dCd0).toBe(0);
  });
  it('over-trimmed upwind loses lift and gains drag; on a run only lift', () => {
    const up = sheetingEffect(boat, 'jib', 40, { sheetDeg: 4, twistDeg: 0 });
    expect(up.clMul).toBeLessThan(1);
    expect(up.dCd0).toBeGreaterThan(0);
    const run = sheetingEffect(boat, 'main', 112, { sheetDeg: 4, twistDeg: 0 });
    expect(run.clMul).toBeLessThan(1);
    expect(run.dCd0).toBe(0);
  });
  it('does not penalise a boom that is out as far as it goes on a deep run', () => {
    expect(sheetingEffect(boat, 'main', 150, { sheetDeg: 90, twistDeg: 0 }).clMul).toBe(1);
  });
});
