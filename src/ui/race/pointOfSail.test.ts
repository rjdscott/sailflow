import { describe, expect, it } from 'vitest';
import { bandOf, LUFFING_DEG, nearestPointOfSail, POINTS_OF_SAIL } from './pointOfSail';

describe('POINTS_OF_SAIL', () => {
  it('flies the kite on the two downwind angles only', () => {
    expect(POINTS_OF_SAIL.map((p) => p.sailset)).toEqual(['jib', 'jib', 'jib', 'asym', 'asym']);
  });

  it('resolves the two VMG angles and fixes the three reaches', () => {
    const optimal = POINTS_OF_SAIL.filter((p) => p.optimal);
    expect(optimal.map((p) => p.id)).toEqual(['close-hauled', 'run']);
    expect(optimal.map((p) => p.optimal)).toEqual(['upwind', 'downwind']);
    expect(POINTS_OF_SAIL.filter((p) => !p.optimal).map((p) => p.twaDeg)).toEqual([60, 90, 135]);
  });
});

describe('nearestPointOfSail', () => {
  it('puts the beat on Close-hauled and the run on Run', () => {
    expect(nearestPointOfSail(42)).toBe('close-hauled');
    expect(nearestPointOfSail(20)).toBe('close-hauled');
    expect(nearestPointOfSail(151)).toBe('run');
    expect(nearestPointOfSail(180)).toBe('run');
  });

  it('lands each named angle on its own chip', () => {
    for (const p of POINTS_OF_SAIL) expect(nearestPointOfSail(p.twaDeg)).toBe(p.id);
  });

  it('breaks at the midpoint bands, ties to the tighter angle', () => {
    expect(nearestPointOfSail(50)).toBe('close-hauled');
    expect(nearestPointOfSail(51)).toBe('close-reach');
    expect(nearestPointOfSail(75)).toBe('close-reach');
    expect(nearestPointOfSail(76)).toBe('beam-reach');
    expect(nearestPointOfSail(112)).toBe('beam-reach');
    expect(nearestPointOfSail(113)).toBe('broad-reach');
    expect(nearestPointOfSail(150)).toBe('broad-reach');
  });

  it('ignores the sign of a port-tack angle', () => {
    expect(nearestPointOfSail(-42)).toBe('close-hauled');
    expect(nearestPointOfSail(-135)).toBe('broad-reach');
  });
});

describe('bandOf', () => {
  it('agrees with the nearest chip everywhere a chip applies', () => {
    for (let twa = LUFFING_DEG; twa <= 180; twa++) {
      expect(bandOf(twa), `${twa}°`).toBe(nearestPointOfSail(twa));
    }
  });

  it('deselects the row inside the luffing angle and past dead downwind', () => {
    expect(bandOf(LUFFING_DEG - 1)).toBeNull();
    expect(bandOf(20)).toBeNull();
    expect(bandOf(181)).toBeNull();
    expect(bandOf(LUFFING_DEG)).toBe('close-hauled');
    expect(bandOf(180)).toBe('run');
  });

  it('hands the angle over as it crosses a band edge', () => {
    expect(bandOf(50)).toBe('close-hauled');
    expect(bandOf(51)).toBe('close-reach');
    expect(bandOf(112)).toBe('beam-reach');
    expect(bandOf(113)).toBe('broad-reach');
    expect(bandOf(150)).toBe('broad-reach');
    expect(bandOf(151)).toBe('run');
  });

  it('ignores the sign of a port-tack angle', () => {
    expect(bandOf(-135)).toBe('broad-reach');
    expect(bandOf(-20)).toBeNull();
  });
});

/**
 * H-08. Five full labels are ~470 px of chip and a 390 px phone has ~340 px of
 * card, which is how the row came to be a hidden sideways scroller showing
 * three of five. The short forms are what makes one wrap-free row possible, so
 * their length is the invariant, not a cosmetic detail.
 */
describe('the phone labels', () => {
  it('gives every chip a short form that is a real point of sail', () => {
    expect(POINTS_OF_SAIL.map((p) => p.short)).toEqual(['Beat', 'Close', 'Beam', 'Broad', 'Run']);
  });

  it('keeps each short form inside the one-row budget', () => {
    for (const p of POINTS_OF_SAIL) {
      expect(p.short.length, p.id).toBeLessThanOrEqual(5);
      expect(p.short.length, p.id).toBeLessThanOrEqual(p.label.length);
    }
  });

  it('stays distinguishable: no two chips share a short form', () => {
    expect(new Set(POINTS_OF_SAIL.map((p) => p.short)).size).toBe(POINTS_OF_SAIL.length);
  });
});
