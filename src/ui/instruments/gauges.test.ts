import { describe, expect, it } from 'vitest';
import { activeBoat } from '../../lib/boat';
import {
  bulletBands,
  bulletScale,
  heelBands,
  pctOfTarget,
  sparkPoints,
  STRIPE_INCHES,
  trendOf,
} from './gauges';

describe('STRIPE_INCHES', () => {
  it('reads the active class stripes, falling back to the reference boat', () => {
    // A class paints the stripes its own guide calls for, so this is a
    // per-boat `instruments.stripeIn*` knob (`core/solve/instruments.ts`) and
    // not the J/70 literal it used to be. The J/70 overrides none, so it
    // reads the reference spacing — 18/20/22 in, North J/70 guide (S1).
    const { calibration } = activeBoat;
    expect(STRIPE_INCHES).toEqual([
      calibration['instruments.stripeInLo'] ?? 18,
      calibration['instruments.stripeInMid'] ?? 20,
      calibration['instruments.stripeInHi'] ?? 22,
    ]);
  });

  it('is ascending, or the gauge would read a leech outboard as hooked', () => {
    expect(STRIPE_INCHES[0]).toBeLessThan(STRIPE_INCHES[1]);
    expect(STRIPE_INCHES[1]).toBeLessThan(STRIPE_INCHES[2]);
  });
});

describe('bulletScale', () => {
  const base = { min: 0, max: 10, betterIs: 'more' as const };

  it('places the value and the target on a 0-100 track', () => {
    const s = bulletScale({ ...base, value: 2.5, target: 7.5 });
    expect(s.valuePct).toBe(25);
    expect(s.targetPct).toBe(75);
  });

  it('clamps both ends rather than drawing off the track', () => {
    expect(bulletScale({ ...base, value: -4 }).valuePct).toBe(0);
    expect(bulletScale({ ...base, value: 40 }).valuePct).toBe(100);
    expect(bulletScale({ ...base, value: 5, target: 99 }).targetPct).toBe(100);
  });

  it('omits the target when there is none', () => {
    expect(bulletScale({ ...base, value: 5 }).targetPct).toBeUndefined();
  });

  it('splits the track into three bands at the two boundaries', () => {
    const s = bulletScale({ ...base, value: 5, ranges: [2, 6] });
    expect(s.rangePcts).toEqual([20, 40, 40]);
  });

  it('reverses the shade order when less is better', () => {
    const more = bulletScale({ ...base, value: 5, ranges: [2, 6] });
    const less = bulletScale({ ...base, betterIs: 'less', value: 5, ranges: [2, 6] });
    // Same geometry, worst band at the other end: the darkest shade moves.
    expect(less.rangePcts).toEqual([...more.rangePcts].reverse());
  });

  it('accepts the two boundaries in either order', () => {
    const s = bulletScale({ ...base, value: 5, ranges: [6, 2] });
    expect(s.rangePcts).toEqual([20, 40, 40]);
  });

  it('has no bands when no ranges are supplied', () => {
    expect(bulletScale({ ...base, value: 5 }).rangePcts).toEqual([]);
  });

  it('asks for a symbol when the scale does not start at zero', () => {
    expect(bulletScale({ ...base, value: 5 }).symbolMode).toBe(false);
    expect(bulletScale({ min: 8, max: 17, value: 12, betterIs: 'more' }).symbolMode).toBe(true);
    // A scale that starts below zero still starts at a meaningful baseline.
    expect(bulletScale({ min: -5, max: 5, value: 0, betterIs: 'more' }).symbolMode).toBe(false);
  });
});

describe('bulletBands', () => {
  it('stacks from the left when more is better, darkest first', () => {
    expect(bulletBands([20, 40, 40], 'more')).toEqual([
      { x: 0, w: 20, shade: 1 },
      { x: 20, w: 40, shade: 2 },
      { x: 60, w: 40, shade: 3 },
    ]);
  });

  it('stacks from the right when less is better, so the bands still tile', () => {
    const bands = bulletBands([40, 40, 20], 'less');
    expect(bands).toEqual([
      { x: 60, w: 40, shade: 1 },
      { x: 20, w: 40, shade: 2 },
      { x: 0, w: 20, shade: 3 },
    ]);
    // The darkest (worst) band sits at the high end of the scale.
    expect(bands[0].x + bands[0].w).toBe(100);
  });

  it('draws nothing without ranges', () => {
    expect(bulletBands([], 'more')).toEqual([]);
  });
});

describe('heelBands', () => {
  it('hits the published anchors', () => {
    expect(heelBands(6).target).toBe(8);
    expect(heelBands(10.5).target).toBe(12);
    expect(heelBands(16.5).target).toBe(14);
    expect(heelBands(22).target).toBe(15.5);
  });

  it('holds the end anchors outside the published range', () => {
    expect(heelBands(0).target).toBe(8);
    expect(heelBands(3).target).toBe(8);
    expect(heelBands(40).target).toBe(15.5);
  });

  it('interpolates monotonically between anchors', () => {
    let previous = -Infinity;
    for (let tws = 0; tws <= 30; tws += 0.5) {
      const { target } = heelBands(tws);
      expect(target).toBeGreaterThanOrEqual(previous);
      previous = target;
    }
    // Halfway between the 6 kt and 10.5 kt anchors is halfway between 8 and 12.
    expect(heelBands(8.25).target).toBeCloseTo(10, 6);
  });

  it('reproduces the guide big-breeze spread as the band at its anchor', () => {
    const big = heelBands(22);
    expect(big.lo).toBeCloseTo(14, 6);
    expect(big.hi).toBeCloseTo(17, 6);
    expect(big.lo).toBeLessThan(big.target);
    expect(big.hi).toBeGreaterThan(big.target);
  });
});

describe('pctOfTarget', () => {
  it('reads 100 on target', () => {
    expect(pctOfTarget(6, 6)).toBe(100);
    expect(pctOfTarget(3, 6)).toBe(50);
    expect(pctOfTarget(9, 6)).toBe(150);
  });

  it('has nothing to say without a usable target', () => {
    expect(pctOfTarget(6, undefined)).toBeUndefined();
    expect(pctOfTarget(6, 0)).toBeUndefined();
    expect(pctOfTarget(6, -2)).toBeUndefined();
    expect(pctOfTarget(6, NaN)).toBeUndefined();
  });
});

describe('trendOf', () => {
  it('needs two samples to have a direction', () => {
    expect(trendOf([])).toBe('flat');
    expect(trendOf([5])).toBe('flat');
  });

  it('compares the last sample to the mean of the ones before', () => {
    expect(trendOf([1, 1, 1, 2])).toBe('up');
    expect(trendOf([5, 5, 5, 1])).toBe('down');
  });

  it('ignores movement inside the 0.5 % dead-band', () => {
    expect(trendOf([100, 100, 100.4])).toBe('flat');
    expect(trendOf([100, 100, 99.6])).toBe('flat');
    expect(trendOf([100, 100, 100.6])).toBe('up');
    expect(trendOf([100, 100, 99.4])).toBe('down');
  });

  it('scales the dead-band with the magnitude of the number', () => {
    // The same absolute move is noise on a big number, a trend on a small one.
    expect(trendOf([1000, 1000, 1004])).toBe('flat');
    expect(trendOf([1, 1, 5])).toBe('up');
  });
});

describe('sparkPoints', () => {
  it('is empty below two samples', () => {
    expect(sparkPoints([], 64, 16)).toBe('');
    expect(sparkPoints([3], 64, 16)).toBe('');
  });

  it('spreads samples across the width, newest last, y inverted', () => {
    expect(sparkPoints([0, 1, 2], 64, 16)).toBe('0,16 32,8 64,0');
  });

  it('draws a flat series down the middle rather than dividing by zero', () => {
    expect(sparkPoints([4, 4, 4], 64, 16)).toBe('0,8 32,8 64,8');
  });
});
