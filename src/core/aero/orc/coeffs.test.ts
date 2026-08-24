import { describe, expect, it } from 'vitest';
import {
  SET_HIGH,
  SET_LOW,
  SET_MEDIUM,
  fcoefOf,
  lerpTable,
  sailCoeffs,
  type OrcSail,
} from './coeffs';
import { ASYM_TABLE, JIB_TABLE, KPASP, MAIN_TABLE, TABLES } from './tables';

describe('table transcription', () => {
  it('every table has matching row lengths and a positive kp', () => {
    for (const t of [MAIN_TABLE, JIB_TABLE, ASYM_TABLE]) {
      const n = t.awaDeg.length;
      expect(t.cdLow).toHaveLength(n);
      expect(t.clLow).toHaveLength(n);
      expect(t.cdHigh).toHaveLength(n);
      expect(t.clHigh).toHaveLength(n);
      expect(t.kp).toBeGreaterThan(0);
    }
  });

  it('AWA knots are strictly increasing and inside 0..180', () => {
    for (const t of [MAIN_TABLE, JIB_TABLE, ASYM_TABLE]) {
      for (let i = 1; i < t.awaDeg.length; i++)
        expect(t.awaDeg[i]).toBeGreaterThan(t.awaDeg[i - 1]);
      expect(t.awaDeg[0]).toBeGreaterThanOrEqual(0);
      expect(t.awaDeg[t.awaDeg.length - 1]).toBeLessThanOrEqual(180);
    }
  });

  it('parasitic drag is non-negative and climbs monotonically from its dip to its peak', () => {
    for (const t of [MAIN_TABLE, JIB_TABLE, ASYM_TABLE]) {
      for (const cd of [...t.cdLow, ...t.cdHigh]) expect(cd).toBeGreaterThanOrEqual(0);
      const lo = Math.min(...t.cdLow);
      const hi = Math.max(...t.cdLow);
      const iMin = t.cdLow.indexOf(lo);
      const iMax = t.cdLow.indexOf(hi);
      expect(iMax).toBeGreaterThan(iMin);
      // Non-decreasing, not strictly increasing: the mainsail has a flat step
      // from 9 to 12 deg. Past the peak the drag falls again for the jib (150
      // to 180) and the asymmetric (115 to 180), so the sweep stops at iMax.
      for (let i = iMin + 1; i <= iMax; i++)
        expect(t.cdLow[i]).toBeGreaterThanOrEqual(t.cdLow[i - 1]);
      expect(hi).toBeGreaterThan(3 * lo);
    }
  });

  it('the high set never has less lift than the low set', () => {
    for (const t of [MAIN_TABLE, JIB_TABLE, ASYM_TABLE])
      for (let i = 0; i < t.awaDeg.length; i++)
        expect(t.clHigh[i]).toBeGreaterThanOrEqual(t.clLow[i]);
  });

  it('the high set never has more parasitic drag than the low set', () => {
    for (const t of [MAIN_TABLE, JIB_TABLE, ASYM_TABLE])
      for (let i = 0; i < t.awaDeg.length; i++) expect(t.cdHigh[i]).toBeLessThanOrEqual(t.cdLow[i]);
  });

  it('lift decays to about zero and drag is large by 180 deg', () => {
    // prov: ORC VPP 2023 §5.1.1 -- at AWA 180 the lift has declined to zero
    // and the drag coefficient increased to about 1.0.
    expect(Math.abs(MAIN_TABLE.clLow[MAIN_TABLE.awaDeg.length - 1])).toBeLessThan(0.2);
    expect(MAIN_TABLE.cdLow[MAIN_TABLE.awaDeg.length - 1]).toBeGreaterThan(1.0);
    expect(JIB_TABLE.clLow[JIB_TABLE.awaDeg.length - 1]).toBeLessThan(0.1);
    expect(ASYM_TABLE.clLow[ASYM_TABLE.awaDeg.length - 1]).toBe(0);
  });

  it('kpasp equals kpasc (Tables 5.7 and 5.8 share the quadratic drag term)', () => {
    expect(KPASP).toBe(ASYM_TABLE.kp);
  });

  it('spinnaker has a single coefficient set', () => {
    expect(ASYM_TABLE.clHigh).toEqual(ASYM_TABLE.clLow);
    expect(ASYM_TABLE.cdHigh).toEqual(ASYM_TABLE.cdLow);
  });
});

describe('lerpTable', () => {
  it('is exact at every knot of every table and set', () => {
    for (const t of [MAIN_TABLE, JIB_TABLE, ASYM_TABLE])
      for (let i = 0; i < t.awaDeg.length; i++) {
        expect(lerpTable(t.awaDeg, t.clLow, t.awaDeg[i])).toBe(t.clLow[i]);
        expect(lerpTable(t.awaDeg, t.cdLow, t.awaDeg[i])).toBe(t.cdLow[i]);
        expect(lerpTable(t.awaDeg, t.clHigh, t.awaDeg[i])).toBe(t.clHigh[i]);
        expect(lerpTable(t.awaDeg, t.cdHigh, t.awaDeg[i])).toBe(t.cdHigh[i]);
      }
  });

  it('interpolates linearly at the midpoint', () => {
    // Jib CLlow: 1.375 at 20 deg, 1.45 at 27 deg. prov: ORC VPP 2023 Table 5.4
    expect(lerpTable(JIB_TABLE.awaDeg, JIB_TABLE.clLow, 23.5)).toBeCloseTo(1.4125, 12);
  });

  it('clamps flat outside the knot range', () => {
    expect(lerpTable(JIB_TABLE.awaDeg, JIB_TABLE.clLow, -50)).toBe(JIB_TABLE.clLow[0]);
    expect(lerpTable(JIB_TABLE.awaDeg, JIB_TABLE.clLow, 999)).toBe(JIB_TABLE.clLow[8]);
  });
});

describe('sailCoeffs', () => {
  const cases: OrcSail[] = ['main', 'jib', 'asym'];

  it('returns exactly the tabulated value at a knot for low and high', () => {
    for (const sail of cases) {
      const t = TABLES[sail];
      for (let i = 0; i < t.awaDeg.length; i++) {
        expect(sailCoeffs(sail, t.awaDeg[i], SET_LOW).clMax).toBe(t.clLow[i]);
        expect(sailCoeffs(sail, t.awaDeg[i], SET_HIGH).cd0).toBe(t.cdHigh[i]);
      }
    }
  });

  it('is symmetric in the sign of AWA', () => {
    for (const sail of cases)
      expect(sailCoeffs(sail, -63, SET_MEDIUM, 0.7)).toEqual(sailCoeffs(sail, 63, SET_MEDIUM, 0.7));
  });

  it('medium sits between low and high for both sails, despite different blend formulas', () => {
    // prov: eq (5.6) for the main, eq (5.9) for the jib -- they are NOT the
    // same expression, which is why both endpoints are checked explicitly.
    for (const fcoef of [0.1, 0.5, 0.9]) {
      for (const sail of ['main', 'jib'] as const) {
        for (const awa of [15, 27, 45, 90]) {
          const lo = sailCoeffs(sail, awa, SET_LOW).clMax;
          const hi = sailCoeffs(sail, awa, SET_HIGH).clMax;
          const md = sailCoeffs(sail, awa, SET_MEDIUM, fcoef).clMax;
          expect(md).toBeGreaterThanOrEqual(Math.min(lo, hi) - 1e-12);
          expect(md).toBeLessThanOrEqual(Math.max(lo, hi) + 1e-12);
        }
      }
    }
  });

  it('mainsail medium collapses to the low set at fcoef = 0', () => {
    // eq (5.6): Cmedium = Clow*(1 - fcoef/2) + Chigh*(fcoef/2)
    expect(sailCoeffs('main', 28, SET_MEDIUM, 0).clMax).toBeCloseTo(MAIN_TABLE.clLow[4], 12);
  });

  it('jib medium collapses to the high set at fcoef = 0', () => {
    // eq (5.9): Cmedium = Clow*fcoef + Chigh*(1 - fcoef)
    expect(sailCoeffs('jib', 27, SET_MEDIUM, 0).clMax).toBeCloseTo(JIB_TABLE.clHigh[3], 12);
    expect(sailCoeffs('jib', 27, SET_MEDIUM, 1).clMax).toBeCloseTo(JIB_TABLE.clLow[3], 12);
  });

  it('carries the right kp through', () => {
    expect(sailCoeffs('main', 30, SET_LOW).kp).toBe(0.01379);
    expect(sailCoeffs('jib', 30, SET_LOW).kp).toBe(0.016);
    expect(sailCoeffs('asym', 60, SET_LOW).kp).toBe(0.02648);
  });
});

describe('fcoefOf', () => {
  it('is zero for a masthead rig (fractionality = 1) and grows as the rig gets more fractional', () => {
    expect(fcoefOf(1)).toBeCloseTo(0, 12);
    expect(fcoefOf(0.95)).toBeGreaterThan(0);
    expect(fcoefOf(0.85)).toBeGreaterThan(fcoefOf(0.95));
  });

  it('saturates at the 0.3 cap', () => {
    // min(0.3, 1/frac - 1) hits the cap below frac = 1/1.3
    const capped = fcoefOf(1 / 1.3);
    expect(fcoefOf(0.5)).toBeCloseTo(capped, 12);
    expect(fcoefOf(0.2)).toBeCloseTo(capped, 12);
  });

  it('matches a hand calculation for the J/70 fractionality', () => {
    // frac = 8.0 / (7.974 + 0.8) = 0.9117848
    // inner  = 1/frac - 1        = 0.0967500
    // arg    = (pi/0.6) * inner  = 0.5065812 rad
    // fcoef  = sqrt(sin(arg))    = 0.6965567
    expect(fcoefOf(8.0 / 8.774)).toBeCloseTo(0.69656, 5);
  });
});

describe('coefficient curve shape', () => {
  function peakAwa(sail: OrcSail): number {
    let best = 0;
    let bestCl = -Infinity;
    for (let a = 0; a <= 180; a += 0.5) {
      const cl = sailCoeffs(sail, a, SET_LOW).clMax;
      if (cl > bestCl) {
        bestCl = cl;
        best = a;
      }
    }
    return best;
  }

  it('the upwind sails peak at a narrow angle, the asymmetric much wider', () => {
    // Published fact, not a guess: the mainsail CL peak sits at AWA 60 and the
    // jib runs a flat 1.45 plateau from 27 to 50 deg, while the asymmetric
    // peaks around 75 deg. prov: ORC VPP 2023 Tables 5.1, 5.4, 5.7
    expect(peakAwa('jib')).toBeGreaterThanOrEqual(20);
    expect(peakAwa('jib')).toBeLessThanOrEqual(50);
    expect(peakAwa('main')).toBeLessThanOrEqual(60);
    expect(peakAwa('asym')).toBeGreaterThan(peakAwa('jib'));
  });

  it('lift falls away monotonically from the peak to 180 deg', () => {
    for (const sail of ['main', 'jib', 'asym'] as const) {
      const p = peakAwa(sail);
      let prev = Infinity;
      for (let a = p; a <= 180; a += 1) {
        const cl = sailCoeffs(sail, a, SET_LOW).clMax;
        expect(cl).toBeLessThanOrEqual(prev + 1e-12);
        prev = cl;
      }
    }
  });
});
