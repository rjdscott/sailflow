import { describe, expect, it } from 'vitest';
import { nearestPointOfSail, POINTS_OF_SAIL } from './pointOfSail';

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
