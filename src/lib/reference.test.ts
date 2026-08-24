import { describe, expect, it, vi } from 'vitest';
import {
  bandFor,
  guideFor,
  guideRecommendation,
  interpolatedTurns,
  isCalibratedBand,
  referenceStatus,
} from './reference';

const north = guideFor('north')!;
const quantum = guideFor('quantum')!;

describe('guideFor', () => {
  it('loads both committed guides', () => {
    expect(north.bands.length).toBeGreaterThan(0);
    expect(quantum.bands.length).toBeGreaterThan(0);
  });
});

describe('bandFor', () => {
  it('clamps below the first band', () => {
    expect(bandFor(north, -5).label).toBe('<6 kt');
    expect(bandFor(north, 0).label).toBe('<6 kt');
  });

  it('treats band bounds as half-open [min, max)', () => {
    expect(bandFor(north, 5.99).label).toBe('<6 kt');
    expect(bandFor(north, 6).label).toBe('6-8 kt');
    expect(bandFor(north, 9.99).label).toBe('8-10 kt');
    expect(bandFor(north, 10).label).toBe('10-12 kt');
  });

  it('clamps above the open-ended top band', () => {
    expect(bandFor(north, 20).label).toBe('20+ kt');
    expect(bandFor(north, 45).label).toBe('20+ kt');
  });

  it('resolves a gap between published bands upward', () => {
    // Quantum publishes 0-4 and 5-6 with nothing in between.
    expect(bandFor(quantum, 4.5).label).toBe('5-6 kt');
  });
});

describe('interpolatedTurns', () => {
  it('returns the published value at a band midpoint', () => {
    // North 8-10 kt band is the base setting: 0 / 0 turns.
    expect(interpolatedTurns(north, 9).uppersTurns).toBeCloseTo(0, 10);
    expect(interpolatedTurns(north, 9).lowersTurns).toBeCloseTo(0, 10);
    // 12-16 kt band: +4 / +2.
    expect(interpolatedTurns(north, 14).uppersTurns).toBeCloseTo(4, 10);
    expect(interpolatedTurns(north, 14).lowersTurns).toBeCloseTo(2, 10);
  });

  it('interpolates linearly between band midpoints', () => {
    // Halfway between the 8-10 midpoint (9 kt, 0 turns) and the 10-12
    // midpoint (11 kt, +2 turns).
    expect(interpolatedTurns(north, 10).uppersTurns).toBeCloseTo(1, 10);
    // One third of the way from 11 kt (+2) to 14 kt (+4).
    expect(interpolatedTurns(north, 12).uppersTurns).toBeCloseTo(2 + (2 * 1) / 3, 10);
  });

  it('clamps flat outside the first and last midpoints', () => {
    expect(interpolatedTurns(north, 0).uppersTurns).toBe(-3);
    expect(interpolatedTurns(north, 60).uppersTurns).toBe(6);
  });

  it('is null-safe when a guide publishes no turns', () => {
    const empty = { ...north, bands: north.bands.map((b) => ({ ...b, uppersTurns: null })) };
    expect(interpolatedTurns(empty, 12).uppersTurns).toBeNull();
    expect(interpolatedTurns(empty, 12).lowersTurns).toBeCloseTo(1 + 1 / 3, 10);
  });
});

describe('guideRecommendation', () => {
  it('pairs the containing band with the interpolated turns', () => {
    const rec = guideRecommendation(north, 14);
    expect(rec.band.label).toBe('12-16 kt');
    expect(rec.uppersTurns).toBeCloseTo(4, 10);
    expect(rec.race).toBe(rec.band.race);
    expect(rec.targets).toBe(rec.band.targets);
  });

  it('reports rake honestly as null when the guide publishes none', () => {
    expect(guideRecommendation(north, 14).rakeNote).toBeNull();
  });

  it('formats a published rake figure when one exists', () => {
    const withRake = {
      ...north,
      bands: north.bands.map((b) => ({ ...b, rakeMm: 620 })),
    };
    expect(guideRecommendation(withRake, 14).rakeNote).toBe('620 mm rake');
  });
});

describe('isCalibratedBand', () => {
  it('covers exactly the two North bands used in calibration', () => {
    expect(isCalibratedBand(8)).toBe(true);
    expect(isCalibratedBand(9.9)).toBe(true);
    expect(isCalibratedBand(12)).toBe(true);
    expect(isCalibratedBand(15.9)).toBe(true);
  });

  it('excludes everything else, including the band edges above', () => {
    expect(isCalibratedBand(7.9)).toBe(false);
    expect(isCalibratedBand(10)).toBe(false);
    expect(isCalibratedBand(11.9)).toBe(false);
    expect(isCalibratedBand(16)).toBe(false);
  });
});

describe('referenceStatus', () => {
  it('reports both committed guides as loaded, with revision', () => {
    const s = referenceStatus();
    expect(s.north.loaded).toBe(true);
    expect(s.north.revision).toBe('Rev. 1015');
    expect(s.quantum.loaded).toBe(true);
  });

  it('reports a guide whose table has been emptied as not loaded', async () => {
    vi.resetModules();
    vi.doMock('../../data/tuning/north-j70.json', () => ({
      default: { schemaVersion: 1, source: {}, base: {}, bands: [] },
    }));
    const mod = await import('./reference');
    expect(mod.referenceStatus().north).toEqual({ loaded: false, revision: '' });
    expect(mod.guideFor('north')).toBeNull();
    expect(mod.referenceStatus().quantum.loaded).toBe(true);
    vi.doUnmock('../../data/tuning/north-j70.json');
    vi.resetModules();
  });
});
