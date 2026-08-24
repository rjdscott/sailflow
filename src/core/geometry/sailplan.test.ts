import { describe, expect, it } from 'vitest';
import type { BoatDefinition, SailId } from '../types';
import type { SailGeometryFn } from '../internal';
import { sailGeometry } from './sailplan';
import j70 from '../../../data/boats/j70.json';

const boat = j70 as unknown as BoatDefinition;
const SAILS: SailId[] = ['main', 'jib', 'asym'];

describe('sailGeometry', () => {
  it('satisfies the SailGeometryFn contract', () => {
    const fn: SailGeometryFn = sailGeometry;
    expect(typeof fn).toBe('function');
  });

  it.each(SAILS)('integrates %s area to within 10 %% of the rated area', (sail) => {
    const g = sailGeometry(boat, sail);
    expect(g.ratedAreaM2).toBe(boat.sails[sail].ratedAreaM2);
    expect(Math.abs(g.areaM2 - g.ratedAreaM2) / g.ratedAreaM2).toBeLessThan(0.1);
  });

  it('puts the main CE between 35 % and 50 % of P above the boom', () => {
    const g = sailGeometry(boat, 'main');
    const aboveBoom = g.ceHeightM - g.tackHeightM;
    expect(aboveBoom / boat.rig.pM).toBeGreaterThan(0.35);
    expect(aboveBoom / boat.rig.pM).toBeLessThan(0.5);
  });

  it.each(SAILS)('puts the %s CE above its tack and below its head', (sail) => {
    const g = sailGeometry(boat, sail);
    expect(g.ceHeightM).toBeGreaterThan(g.tackHeightM);
    expect(g.ceHeightM).toBeLessThan(g.tackHeightM + g.spanM);
  });

  it('spans match the measured luff lengths', () => {
    expect(sailGeometry(boat, 'main').spanM).toBeCloseTo(boat.rig.pM, 6);
    expect(sailGeometry(boat, 'jib').spanM).toBeCloseTo(8.0, 6);
    // ORC spinnaker SL is the mean of luff and leech.
    expect(sailGeometry(boat, 'asym').spanM).toBeCloseTo((10.8 + 8.8) / 2, 6);
  });

  it.each(SAILS)('has a %s chord that is positive, finite and clamped at the ends', (sail) => {
    const g = sailGeometry(boat, sail);
    for (let h = 0; h <= 1.0001; h += 0.05) {
      const c = g.chordAt(h);
      expect(Number.isFinite(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
    }
    expect(g.chordAt(-1)).toBeCloseTo(g.chordAt(0), 9);
    expect(g.chordAt(2)).toBeCloseTo(g.chordAt(1), 9);
  });

  it('reproduces the measured girths at the main measurement points', () => {
    const g = sailGeometry(boat, 'main');
    expect(g.chordAt(0)).toBeCloseTo(2.876, 6);
    expect(g.chordAt(0.25)).toBeCloseTo(2.57, 6);
    expect(g.chordAt(0.5)).toBeCloseTo(2.134, 6);
    expect(g.chordAt(0.75)).toBeCloseTo(1.425, 6);
    expect(g.chordAt(1)).toBeCloseTo(0.364, 6);
  });

  it('narrows the main and jib monotonically from foot to head', () => {
    for (const sail of ['main', 'jib'] as const) {
      const g = sailGeometry(boat, sail);
      for (let h = 0; h < 1; h += 0.05) expect(g.chordAt(h + 0.05)).toBeLessThan(g.chordAt(h));
    }
  });

  it('matches the ORC spinnaker formula for the asym', () => {
    const g = sailGeometry(boat, 'asym');
    const sl = (10.8 + 8.8) / 2;
    expect(g.areaM2).toBeCloseTo((sl * (5.7 + 4 * 5.56)) / 6, 6);
    expect(g.chordAt(0)).toBeCloseTo(5.7, 6);
    expect(g.chordAt(0.5)).toBeCloseTo(5.56, 6);
    expect(g.chordAt(1)).toBeCloseTo(0, 6);
  });

  it('honours the tack-height knobs', () => {
    const tall = { ...boat, calibration: { ...boat.calibration, 'geom.boomHeightM': 1.9 } };
    expect(sailGeometry(tall, 'main').ceHeightM).toBeCloseTo(
      sailGeometry(boat, 'main').ceHeightM + 1,
      6,
    );
  });

  it('is deterministic', () => {
    for (const sail of SAILS) {
      const a = sailGeometry(boat, sail);
      const b = sailGeometry(boat, sail);
      expect(a.areaM2).toBe(b.areaM2);
      expect(a.ceHeightM).toBe(b.ceHeightM);
      expect(a.chordAt(0.37)).toBe(b.chordAt(0.37));
    }
  });
});
