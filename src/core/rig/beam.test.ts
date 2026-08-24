import { describe, expect, it } from 'vitest';
import type { BoatDefinition } from '../types';
import { MAST_STATIONS, mastAboveDeckM, mastStations } from '../geometry/rig';
import { beamPeakMm, bendCurveMm, bendShape, mastEI, pinPinDeflection, pinPinPeak } from './beam';
import j70 from '../../../data/boats/j70.json';

const boat = { ...(j70 as unknown as BoatDefinition), calibration: {} }; // module tests run on default knobs;

describe('pinPinDeflection', () => {
  it('is zero at both pins and positive in between for a positive load', () => {
    expect(pinPinDeflection(8.5, 4.4, 1e6, 1000, 0)).toBe(0);
    expect(pinPinDeflection(8.5, 4.4, 1e6, 1000, 8.5)).toBeCloseTo(0, 12);
    expect(pinPinDeflection(8.5, 4.4, 1e6, 1000, 4.4)).toBeGreaterThan(0);
  });

  it('matches the closed form Qa²b²/(3LEI) under the load', () => {
    const [L, a, EI, Q] = [8.5, 4.4, 1e6, 1000];
    const b = L - a;
    expect(pinPinPeak(L, a, EI, Q)).toBeCloseTo((Q * a * a * b * b) / (3 * L * EI), 12);
  });

  it('is symmetric for a centred load', () => {
    expect(pinPinDeflection(8, 4, 1e6, 1000, 2)).toBeCloseTo(
      pinPinDeflection(8, 4, 1e6, 1000, 6),
      12,
    );
  });

  it('is linear in force and inverse in EI', () => {
    const one = pinPinPeak(8.5, 4.4, 1e6, 1000);
    expect(pinPinPeak(8.5, 4.4, 1e6, 2000)).toBeCloseTo(2 * one, 12);
    expect(pinPinPeak(8.5, 4.4, 2e6, 1000)).toBeCloseTo(one / 2, 12);
    expect(pinPinPeak(8.5, 4.4, 1e6, -1000)).toBeCloseTo(-one, 12);
  });

  it('degrades to zero on degenerate geometry rather than returning NaN', () => {
    expect(pinPinDeflection(0, 0, 1e6, 1000, 0)).toBe(0);
    expect(pinPinDeflection(8.5, 4.4, 0, 1000, 4)).toBe(0);
    expect(pinPinDeflection(8.5, 0, 1e6, 1000, 4)).toBe(0);
  });
});

describe('bendShape', () => {
  const shape = bendShape(boat);

  it('has one value per mast station, pinned at both ends', () => {
    expect(shape).toHaveLength(MAST_STATIONS);
    expect(shape[0]).toBe(0);
    expect(shape[MAST_STATIONS - 1]).toBeCloseTo(0, 12);
  });

  it('is single-humped and peaks at the spreader panel', () => {
    const peak = Math.max(...shape);
    // Normalised at the spreader, which is neither one of the 11 stations nor
    // quite the true maximum (that sits at sqrt((L^2-b^2)/3) on the long side).
    expect(peak).toBeGreaterThan(0.99);
    expect(peak).toBeLessThan(1.01);
    const z = mastStations(boat);
    const peakZ = z[shape.indexOf(peak)];
    expect(Math.abs(peakZ - boat.rig.spreaderZM)).toBeLessThan(mastAboveDeckM(boat) / 10);
    const top = shape.indexOf(peak);
    for (let i = 1; i <= top; i++) expect(shape[i]).toBeGreaterThan(shape[i - 1]);
    for (let i = top + 1; i < shape.length; i++) expect(shape[i]).toBeLessThan(shape[i - 1]);
  });
});

describe('beamPeakMm', () => {
  it('bends the mast about 40 mm at the full backstay load with the fallback EI', () => {
    // The fallback rig.EI is defined by this target; if it moves, say so.
    const sinBackstay = Math.sin((28.26 * Math.PI) / 180);
    const mm = beamPeakMm(boat, 4000 * sinBackstay);
    expect(mm).toBeGreaterThan(35);
    expect(mm).toBeLessThan(45);
  });

  it('is linear in force and follows the EI knob', () => {
    expect(beamPeakMm(boat, 2000)).toBeCloseTo(2 * beamPeakMm(boat, 1000), 9);
    const stiff = { ...boat, calibration: { 'rig.EI': mastEI(boat) * 2 } };
    expect(beamPeakMm(stiff, 1000)).toBeCloseTo(beamPeakMm(boat, 1000) / 2, 9);
  });
});

describe('bendCurveMm', () => {
  it('scales the mode shape to the requested peak', () => {
    const c = bendCurveMm(boat, 60);
    expect(Math.max(...c)).toBeCloseTo(60, 0);
    expect(c[0]).toBe(0);
    expect(c[MAST_STATIONS - 1]).toBeCloseTo(0, 9);
  });

  it('flips sign with the peak', () => {
    const pos = bendCurveMm(boat, 60);
    const neg = bendCurveMm(boat, -60);
    for (let i = 0; i < pos.length; i++) expect(neg[i]).toBeCloseTo(-pos[i], 9);
  });
});
