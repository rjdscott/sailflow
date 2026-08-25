import { describe, expect, it } from 'vitest';
import {
  clampFlat,
  efficiencyCoeff,
  fcdmult,
  flatMin,
  inducedDrag,
  reduction,
  sailsetCd,
  sailsetCl,
} from './depower';
import { jibTwistCeDropM, twistCeFactor } from './twist';
import { FLAT_MIN_BASE, FLAT_MIN_SPINNAKER } from './tables';

describe('flat bounds', () => {
  it('the 2023 baseline minimum flat is 0.42', () => {
    expect(FLAT_MIN_BASE).toBe(0.42);
    expect(flatMin()).toBe(0.42);
  });

  it('FlatMIN is re-modulated by Flat8', () => {
    // prov: ORC VPP 2023 §5.1.3 step 1 -- FlatMIN = 0.42 * Flat8
    expect(flatMin(0.8)).toBeCloseTo(0.336, 12);
  });

  it('clamps into [FlatMIN, 1]', () => {
    expect(clampFlat(1.5)).toBe(1);
    expect(clampFlat(0.1)).toBe(0.42);
    expect(clampFlat(0.7)).toBe(0.7);
    expect(clampFlat(0.1, 0.8)).toBeCloseTo(0.336, 12);
  });

  it('the spinnaker floor is 0.53, and flat never goes below it under the kite', () => {
    // prov: ORC VPP 2026 §5.1 footnote 3 -- offwind baseline raised to 0.53 in 2024
    expect(FLAT_MIN_SPINNAKER).toBe(0.53);
    expect(flatMin(1, 'asym')).toBe(0.53);
    expect(clampFlat(0.1, 1, 'asym')).toBe(0.53);
    expect(clampFlat(0.42, 1, 'asym')).toBe(0.53);
    expect(clampFlat(0.7, 1, 'asym')).toBe(0.7);
    // Flat8 re-modulation still applies offwind.
    expect(flatMin(0.8, 'asym')).toBeCloseTo(0.424, 12);
  });

  it('leaves the jib on the 0.42 floor', () => {
    expect(flatMin(1, 'jib')).toBe(0.42);
    expect(clampFlat(0.1, 1, 'jib')).toBe(0.42);
    // 0.45 is legal upwind and illegal under the kite: the two floors differ.
    expect(clampFlat(0.45, 1, 'jib')).toBe(0.45);
    expect(clampFlat(0.45, 1, 'asym')).toBe(0.53);
  });
});

describe('fcdmult', () => {
  it('is exact at the tabulated flats', () => {
    expect(fcdmult(0.9)).toBe(1.0);
    expect(fcdmult(0.7)).toBe(1.035);
    expect(fcdmult(0.4)).toBe(1.06);
  });

  it('rises again at full power, which is the whole point of the 2014 change', () => {
    // prov: ORC VPP 2023 §5.4.3, table under Figure 5.15
    expect(fcdmult(1.0)).toBe(1.06);
    expect(fcdmult(1.0)).toBeGreaterThan(fcdmult(0.9));
    expect(fcdmult(0.5)).toBeGreaterThan(fcdmult(0.9));
  });

  it('interpolates between knots and clamps outside them', () => {
    expect(fcdmult(0.925)).toBeCloseTo(1.002, 12);
    expect(fcdmult(0)).toBe(1.06);
    expect(fcdmult(2)).toBe(1.06);
  });
});

describe('reef -> ftj / rfm', () => {
  it('reef = 1 is full sail', () => {
    const r = reduction(1, 'jib');
    expect(r.ftj).toBe(1);
    expect(r.rfm).toBe(1);
    expect(r.mainAreaScale).toBe(1);
    expect(r.foreAreaScale).toBe(1);
  });

  it('reef 1.0 -> 0.5 reduces the jib first and leaves the main alone', () => {
    // prov: ORC VPP 2023 §5.1.3 -- RED = reef*2; reef 0.5 means RED = 1,
    // i.e. jib at minimum size with a full mainsail.
    const r = reduction(0.5, 'jib');
    expect(r.ftj).toBe(0);
    expect(r.rfm).toBe(1);
    expect(r.mainAreaScale).toBe(1);
    expect(r.foreAreaScale).toBe(0);
  });

  it('below reef 0.5 the mainsail area comes off as rfm squared', () => {
    const r = reduction(0.4, 'jib');
    expect(r.ftj).toBe(0);
    expect(r.rfm).toBeCloseTo(0.8, 12);
    expect(r.mainAreaScale).toBeCloseTo(0.64, 12);
  });

  it('area scaling is monotonic in reef', () => {
    let prevMain = -1;
    let prevFore = -1;
    for (let reef = 0; reef <= 1.0001; reef += 0.05) {
      const r = reduction(reef, 'jib');
      expect(r.mainAreaScale).toBeGreaterThanOrEqual(prevMain);
      expect(r.foreAreaScale).toBeGreaterThanOrEqual(prevFore);
      prevMain = r.mainAreaScale;
      prevFore = r.foreAreaScale;
    }
  });

  it('offwind, reef scales the spinnaker directly', () => {
    expect(reduction(0.7, 'asym').foreAreaScale).toBeCloseTo(0.7, 12);
  });
});

describe('lift and drag versus flat', () => {
  const clMax = 1.4;
  const cd0 = 0.032;
  const fcdj = 0.44;
  const ce = efficiencyCoeff(0.0147, 26.01, 14.18);

  it('flat = 0.5 halves the lift of flat = 1', () => {
    expect(sailsetCl(clMax, 0.5)).toBeCloseTo(sailsetCl(clMax, 1) / 2, 12);
  });

  it('lift is exactly proportional to flat', () => {
    for (const f of [0.42, 0.6, 0.8, 1]) expect(sailsetCl(clMax, f)).toBeCloseTo(f * clMax, 12);
  });

  it('drag falls monotonically as flat falls', () => {
    let prev = Infinity;
    for (let f = 1; f >= 0.42; f -= 0.02) {
      const cd = sailsetCd(cd0, clMax, f, fcdj, ce);
      expect(cd).toBeLessThan(prev);
      prev = cd;
    }
  });

  it('drag never goes below the flat-independent parasitic floor', () => {
    expect(sailsetCd(cd0, clMax, 0.42, fcdj, ce)).toBeGreaterThan(cd0 * (1 - fcdj));
  });

  it('efficiency coefficient is KPP plus the span term', () => {
    // prov: ORC VPP 2023 eq (5.46): CE = KPP + Aref/(pi*heff^2)
    expect(efficiencyCoeff(0.01, 26, 14)).toBeCloseTo(0.01 + 26 / (Math.PI * 196), 12);
  });

  it('induced drag grows as the square of lift and falls as the square of span', () => {
    expect(inducedDrag(2, 26, 14)).toBeCloseTo(4 * inducedDrag(1, 26, 14), 12);
    expect(inducedDrag(1, 26, 28)).toBeCloseTo(inducedDrag(1, 26, 14) / 4, 12);
  });
});

describe('twist function (§5.4.4)', () => {
  it('is a no-op at full power', () => {
    for (const frac of [0.7, 0.9, 1.0]) expect(twistCeFactor(1, frac)).toBeCloseTo(1, 12);
  });

  it('lowers the centre of effort as flat falls', () => {
    let prev = Infinity;
    for (let f = 1; f >= 0.42; f -= 0.02) {
      const z = twistCeFactor(f, 0.9118);
      expect(z).toBeLessThan(prev);
      expect(z).toBeGreaterThan(0);
      prev = z;
    }
  });

  it('fractional rigs de-power more than masthead rigs', () => {
    expect(twistCeFactor(0.5, 0.7)).toBeLessThan(twistCeFactor(0.5, 1.0));
  });

  it('matches eq (5.49) by hand', () => {
    // 1 - 0.406*(1-0.5) - 0.902*(1-0.5)*(1-0.9) = 1 - 0.203 - 0.0451
    expect(twistCeFactor(0.5, 0.9)).toBeCloseTo(0.7519, 6);
    // masthead: the fractionality term vanishes
    expect(twistCeFactor(0.5, 1.0)).toBeCloseTo(0.797, 12);
  });

  it('jib-foot CE drop is zero at full jib and 5% of IG at minimum jib', () => {
    // prov: ORC VPP 2023 eq (5.40)
    expect(jibTwistCeDropM(1, 8)).toBe(0);
    expect(jibTwistCeDropM(0, 8)).toBeCloseTo(0.4, 12);
    expect(jibTwistCeDropM(0.5, 8)).toBeCloseTo(0.2, 12);
  });
});
