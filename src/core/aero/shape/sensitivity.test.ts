import { describe, expect, it } from 'vitest';
import type { ShapeDeltas } from '../../internal';
import {
  PARACHUTE_AWA_HI,
  PARACHUTE_AWA_LO,
  ZERO_DELTAS,
  applyShapeDeltas,
  parachuteCdMul,
  twistCeFactorInvented,
} from './sensitivity';

const base = { clMax: 1.4, cd0: 0.032, ceH: 4.01, twist: 12 };
const d = (over: Partial<ShapeDeltas>): ShapeDeltas => ({ ...ZERO_DELTAS, ...over });

describe('applyShapeDeltas', () => {
  it('zero deltas are the identity', () => {
    expect(applyShapeDeltas(base, ZERO_DELTAS)).toEqual(base);
  });

  it('dCLmax and dCD0 are additive', () => {
    expect(applyShapeDeltas(base, d({ dCLmax: -0.05 })).clMax).toBeCloseTo(1.35, 12);
    expect(applyShapeDeltas(base, d({ dCD0: 0.004 })).cd0).toBeCloseTo(0.036, 12);
  });

  it('dCEh is fractional, not additive', () => {
    expect(applyShapeDeltas(base, d({ dCEh: -0.03 })).ceH).toBeCloseTo(4.01 * 0.97, 12);
    expect(applyShapeDeltas(base, d({ dCEh: 0.1 })).ceH).toBeCloseTo(4.411, 12);
  });

  it('dTwistDeg is additive on the twist angle', () => {
    expect(applyShapeDeltas(base, d({ dTwistDeg: 4 })).twist).toBe(16);
    expect(applyShapeDeltas(base, d({ dTwistDeg: -4 })).twist).toBe(8);
  });

  it('clamps coefficients and CE height at zero', () => {
    const r = applyShapeDeltas(base, d({ dCLmax: -9, dCD0: -9, dCEh: -9 }));
    expect(r.clMax).toBe(0);
    expect(r.cd0).toBe(0);
    expect(r.ceH).toBe(0);
  });

  it('does not mutate its input', () => {
    const copy = { ...base };
    applyShapeDeltas(base, d({ dCLmax: 0.2, dCEh: 0.2 }));
    expect(base).toEqual(copy);
  });

  it('is sign-correct and monotonic in every delta', () => {
    let prevCl = -Infinity;
    let prevCe = -Infinity;
    for (let x = -0.3; x <= 0.3001; x += 0.05) {
      const r = applyShapeDeltas(base, d({ dCLmax: x, dCEh: x }));
      expect(r.clMax).toBeGreaterThan(prevCl);
      expect(r.ceH).toBeGreaterThan(prevCe);
      prevCl = r.clMax;
      prevCe = r.ceH;
    }
  });
});

describe('twistCeFactorInvented', () => {
  it('is a no-op with no twist', () => {
    expect(twistCeFactorInvented(0, 0.004)).toBe(1);
  });

  it('lowers the CE linearly in twist at the calibrated gain', () => {
    expect(twistCeFactorInvented(10, 0.004)).toBeCloseTo(0.96, 12);
    expect(twistCeFactorInvented(20, 0.004)).toBeCloseTo(0.92, 12);
  });

  it('ignores negative twist rather than raising the CE above the ORC value', () => {
    expect(twistCeFactorInvented(-30, 0.004)).toBe(1);
  });

  it('never drops the CE below half, however absurd the twist', () => {
    expect(twistCeFactorInvented(1000, 0.004)).toBe(0.5);
  });

  it('a zero gain switches the invented layer off entirely', () => {
    for (const t of [0, 5, 20, 45]) expect(twistCeFactorInvented(t, 0)).toBe(1);
  });
});

describe('parachuteCdMul', () => {
  it('is identically 1 at and below the changeover, whatever the multiplier', () => {
    for (const awa of [0, 60, 100, PARACHUTE_AWA_LO]) expect(parachuteCdMul(awa, 3)).toBe(1);
  });

  it('is the full multiplier at and above the parachute end', () => {
    for (const awa of [PARACHUTE_AWA_HI, 165, 180]) expect(parachuteCdMul(awa, 3)).toBe(3);
  });

  it('ramps linearly across the changeover', () => {
    const mid = (PARACHUTE_AWA_LO + PARACHUTE_AWA_HI) / 2;
    expect(parachuteCdMul(mid, 3)).toBeCloseTo(2, 12);
    expect(parachuteCdMul(PARACHUTE_AWA_LO + 7, 3)).toBeCloseTo(1.4, 12);
  });

  it('never decreases with apparent wind angle', () => {
    let prev = 0;
    for (let awa = 0; awa <= 180; awa += 2.5) {
      const v = parachuteCdMul(awa, 2.6);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('is symmetric in the sign of the apparent wind angle', () => {
    for (const awa of [100, 130, 170])
      expect(parachuteCdMul(-awa, 2.6)).toBe(parachuteCdMul(awa, 2.6));
  });

  it('a multiplier of 1 switches the layer off entirely — ORC unmodified', () => {
    for (let awa = 0; awa <= 180; awa += 5) expect(parachuteCdMul(awa, 1)).toBe(1);
  });
});
