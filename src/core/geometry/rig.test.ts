import { describe, expect, it } from 'vitest';
import type { BoatDefinition } from '../types';
import {
  MAST_STATIONS,
  backstayGeometry,
  forestayGeometry,
  lowerGeometry,
  mastAboveDeckM,
  mastStations,
  spreaderGeometry,
  upperGeometry,
} from './rig';
import j70 from '../../../data/boats/j70.json';

const boat = { ...(j70 as unknown as BoatDefinition), calibration: {} }; // module tests run on default knobs;

describe('mastStations', () => {
  it('runs from the partners to the tip in 11 evenly spaced steps', () => {
    const z = mastStations(boat);
    expect(z).toHaveLength(MAST_STATIONS);
    expect(z[0]).toBe(0);
    expect(z[10]).toBeCloseTo(mastAboveDeckM(boat), 9);
    for (let i = 1; i < z.length; i++)
      expect(z[i] - z[i - 1]).toBeCloseTo(mastAboveDeckM(boat) / 10, 9);
  });

  it('takes the mast length from a knob when one is calibrated', () => {
    const b = { ...boat, calibration: { 'geom.mastAboveDeckM': 9 } };
    expect(mastStations(b)[10]).toBe(9);
  });
});

describe('spreaderGeometry', () => {
  it('sweeps the tip aft and inboard of an unswept spreader', () => {
    const s = spreaderGeometry(boat);
    expect(s.tipAftM).toBeGreaterThan(0);
    expect(s.tipYM).toBeLessThan(s.lenM);
    expect(Math.hypot(s.tipYM, s.tipAftM)).toBeCloseTo(s.lenM, 9);
    expect(s.fraction).toBeGreaterThan(0);
    expect(s.fraction).toBeLessThan(1);
  });
});

describe('shroud geometry', () => {
  it('makes the lower shroud shorter and wider-angled than the upper', () => {
    const u = upperGeometry(boat);
    const l = lowerGeometry(boat);
    expect(l.lengthM).toBeLessThan(u.lengthM);
    expect(l.angleFromMastDeg).toBeGreaterThan(u.angleFromMastDeg);
    expect(u.yM).toBe(boat.rig.chainplateYM);
  });
});

describe('forestayGeometry', () => {
  it('has zero rake and the I/J hypotenuse at the base setting', () => {
    const f = forestayGeometry(boat, 0);
    expect(f.rakeMm).toBeCloseTo(0, 9);
    expect(f.rakeDeg).toBeCloseTo(0, 9);
    expect(f.lengthM).toBeCloseTo(Math.hypot(boat.rig.iM, boat.rig.jM), 9);
    expect(f.angleFromMastDeg).toBeCloseTo(
      (Math.atan2(boat.rig.jM, boat.rig.iM) * 180) / Math.PI,
      9,
    );
  });

  it('rakes the mast aft monotonically as the forestay lengthens', () => {
    const spec = boat.controls.forestayMm;
    let prev = -Infinity;
    for (let mm = spec.min; mm <= spec.max; mm += spec.step) {
      const f = forestayGeometry(boat, mm);
      expect(f.rakeMm).toBeGreaterThan(prev);
      prev = f.rakeMm;
    }
    expect(forestayGeometry(boat, spec.max).rakeMm).toBeGreaterThan(0);
  });

  it('keeps rake in a plausible band over the published control range', () => {
    // 40 mm of forestay on an 8 m fore-triangle is O(100 mm) of tip rake.
    const r = forestayGeometry(boat, boat.controls.forestayMm.max).rakeMm;
    expect(r).toBeGreaterThan(50);
    expect(r).toBeLessThan(400);
  });

  it('opens the forestay-to-mast angle as the mast rakes aft', () => {
    expect(forestayGeometry(boat, 40).angleFromMastDeg).toBeGreaterThan(
      forestayGeometry(boat, 0).angleFromMastDeg,
    );
  });
});

describe('backstayGeometry', () => {
  it('pulls from aft of the mast at a wider angle than the forestay', () => {
    const b = backstayGeometry(boat);
    expect(b.baseAftM).toBeGreaterThan(0);
    expect(b.topZM).toBeCloseTo(mastAboveDeckM(boat), 9);
    expect(b.angleFromMastDeg).toBeGreaterThan(forestayGeometry(boat, 0).angleFromMastDeg);
    expect(b.angleFromMastDeg).toBeLessThan(45);
  });

  it('takes the chainplate position from a knob when one is calibrated', () => {
    const b = { ...boat, calibration: { 'geom.backstayBaseAftM': 2 } };
    expect(backstayGeometry(b).baseAftM).toBe(2);
  });
});
