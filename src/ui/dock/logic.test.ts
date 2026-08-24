import { describe, expect, it } from 'vitest';
import type { DockControls, DockRegret, DockScore, Forecast } from '../../core/types';
import {
  MAX_CANDIDATES,
  TIE_BAND_S_PER_MILE,
  candidateSetups,
  clampForecast,
  describeSetup,
  guideBand,
  legalAxis,
  pickBest,
  seq,
  signed,
  sparklinePath,
  sparklineTicks,
  specs,
} from './logic';

function isLegal(value: number, spec: { min: number; max: number; step: number }): boolean {
  if (value < spec.min || value > spec.max) return false;
  const steps = (value - spec.min) / spec.step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

function score(expected: number, setup: Partial<DockControls> = {}): DockScore {
  const s: DockControls = { upperTurns: 0, lowerTurns: 0, forestayMm: 0, ...setup };
  const r: DockRegret = { twsKt: 10, regretSPerMile: expected, optimum: s };
  return {
    setup: s,
    expectedRegretSPerMile: { value: expected, tier: 'B', band: [expected - 1, expected + 1] },
    atMin: r,
    atMax: r,
    worst: r,
    perTws: [r],
  };
}

describe('clampForecast', () => {
  const f = (minKt: number, likelyKt: number, maxKt: number): Forecast => ({
    minKt,
    likelyKt,
    maxKt,
    seaState: 1,
    crewKg: 300,
  });

  it('drags max and likely up when min overtakes them', () => {
    const v = f(20, 12, 16);
    clampForecast(v);
    expect(v).toMatchObject({ minKt: 20, likelyKt: 20, maxKt: 20 });
  });

  it('pulls likely down under a lowered max', () => {
    const v = f(4, 12, 6);
    clampForecast(v);
    expect(v).toMatchObject({ minKt: 4, likelyKt: 6, maxKt: 6 });
  });

  it('is a no-op on an ordered forecast, so the caller-s effect settles', () => {
    const v = f(8, 12, 16);
    clampForecast(v);
    expect(v).toEqual(f(8, 12, 16));
    clampForecast(v);
    expect(v).toEqual(f(8, 12, 16));
  });
});

describe('seq', () => {
  it('is inclusive and float-artefact free', () => {
    expect(seq(-3, 6, 1.5)).toEqual([-3, -1.5, 0, 1.5, 3, 4.5, 6]);
    expect(seq(0, 0, 1)).toEqual([0]);
  });
});

describe('legalAxis', () => {
  it('snaps to the control step, clamps to the range, and dedupes', () => {
    // forestay is 0..40 step 2: 15 -> 16, -5 -> 0, 99 -> 40, 0 -> 0 (deduped)
    expect(legalAxis(specs.forestayMm, [15, -5, 99, 0])).toEqual([16, 0, 40]);
  });
});

describe('candidateSetups', () => {
  const setups = candidateSetups();

  it('stays under the batch cap and is worth sending', () => {
    expect(setups.length).toBeLessThanOrEqual(MAX_CANDIDATES);
    expect(setups.length).toBeGreaterThanOrEqual(20);
  });

  it('respects every control min/max/step from the boat definition', () => {
    for (const s of setups) {
      expect(isLegal(s.upperTurns, specs.upperTurns)).toBe(true);
      expect(isLegal(s.lowerTurns, specs.lowerTurns)).toBe(true);
      expect(isLegal(s.forestayMm, specs.forestayMm)).toBe(true);
    }
  });

  it('emits no duplicate setups', () => {
    const keys = setups.map((s) => `${s.upperTurns}/${s.lowerTurns}/${s.forestayMm}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('thins further for a smaller cap, keeping the grid legal', () => {
    const small = candidateSetups(12);
    expect(small.length).toBeLessThanOrEqual(12);
    expect(small.length).toBeGreaterThan(0);
    for (const s of small) expect(isLegal(s.upperTurns, specs.upperTurns)).toBe(true);
  });
});

describe('pickBest', () => {
  it('returns null for an empty batch', () => {
    expect(pickBest([])).toBeNull();
  });

  it('picks the minimum expected regret', () => {
    const best = score(3.0, { upperTurns: 1.5 });
    const result = pickBest([score(9), best, score(5)]);
    expect(result?.best.setup.upperTurns).toBe(1.5);
  });

  it('reports every setup inside the tie band, and excludes the one just outside', () => {
    const result = pickBest([
      score(3),
      score(3 + TIE_BAND_S_PER_MILE),
      score(3 + TIE_BAND_S_PER_MILE + 0.01),
      score(20),
    ]);
    expect(result?.tied).toHaveLength(2);
    expect(result?.tied.map((s) => s.expectedRegretSPerMile.value)).toEqual([3, 5]);
  });

  it('returns the best three, sorted, without mutating the input', () => {
    const input = [score(9), score(1), score(5), score(3)];
    const result = pickBest(input);
    expect(result?.top.map((s) => s.expectedRegretSPerMile.value)).toEqual([1, 3, 5]);
    expect(input[0].expectedRegretSPerMile.value).toBe(9);
  });
});

describe('sparklinePath', () => {
  const pts = (ys: number[]): DockRegret[] =>
    ys.map((y, i) => ({
      twsKt: 6 + i,
      regretSPerMile: y,
      optimum: { upperTurns: 0, lowerTurns: 0, forestayMm: 0 },
    }));

  const numbers = (d: string): number[] =>
    d
      .split(/[ML,\s]+/)
      .filter((s) => s !== '')
      .map(Number);

  it('produces only finite coordinates', () => {
    const d = sparklinePath(pts([1, 4, 2, 9, 3]), 88, 24);
    expect(numbers(d).every(Number.isFinite)).toBe(true);
    expect(d.startsWith('M')).toBe(true);
  });

  it('is finite for a flat curve (zero span) and a single point', () => {
    expect(numbers(sparklinePath(pts([2, 2, 2]))).every(Number.isFinite)).toBe(true);
    expect(numbers(sparklinePath(pts([2]))).every(Number.isFinite)).toBe(true);
  });

  it('drops non-finite samples rather than emitting NaN', () => {
    const d = sparklinePath(pts([1, Number.NaN, 3, Number.POSITIVE_INFINITY]));
    expect(numbers(d).every(Number.isFinite)).toBe(true);
  });

  it('returns an empty path when there is nothing to draw', () => {
    expect(sparklinePath([])).toBe('');
    expect(sparklinePath(pts([Number.NaN]))).toBe('');
  });
});

describe('sparklineTicks', () => {
  const pts = (twsKts: number[]): DockRegret[] =>
    twsKts.map((twsKt) => ({
      twsKt,
      regretSPerMile: 1,
      optimum: { upperTurns: 0, lowerTurns: 0, forestayMm: 0 },
    }));

  it('labels the first, middle and last wind speed across the width', () => {
    expect(sparklineTicks(pts([6, 8, 10, 12, 14]), 240)).toEqual([
      { x: 0, label: '6', anchor: 'start' },
      { x: 120, label: '10', anchor: 'middle' },
      { x: 240, label: '14', anchor: 'end' },
    ]);
  });

  it('anchors the ends inward so labels stay inside the box', () => {
    const ticks = sparklineTicks(pts([6, 8, 10]), 100);
    expect(ticks[0].anchor).toBe('start');
    expect(ticks[ticks.length - 1].anchor).toBe('end');
  });

  it('drops the middle tick when there are only two samples', () => {
    expect(sparklineTicks(pts([6, 20]), 100)).toEqual([
      { x: 0, label: '6', anchor: 'start' },
      { x: 100, label: '20', anchor: 'end' },
    ]);
  });

  it('shares its x scale with sparklinePath', () => {
    const p = pts([6, 8, 10, 12, 14]);
    const last = sparklineTicks(p, 240).at(-1);
    expect(sparklinePath(p, 240, 24)).toContain(`L${last?.x}`);
  });

  it('returns nothing to draw for no finite samples', () => {
    expect(sparklineTicks([], 240)).toEqual([]);
    expect(sparklineTicks([{ ...pts([6])[0], regretSPerMile: Number.NaN }], 240)).toEqual([]);
  });

  it('handles a single sample without dividing by zero', () => {
    expect(sparklineTicks(pts([9]), 240)).toEqual([{ x: 0, label: '9', anchor: 'start' }]);
  });
});

describe('guideBand', () => {
  it('maps a wind speed onto the published North band', () => {
    expect(guideBand(11)).toMatchObject({ label: '10-12 kt', uppersTurns: 2, lowersTurns: 1 });
    expect(guideBand(14)).toMatchObject({ label: '12-16 kt', uppersTurns: 4 });
  });

  it('clamps outside the table instead of returning undefined', () => {
    expect(guideBand(0).label).toBe('<6 kt');
    expect(guideBand(40).label).toBe('20+ kt');
  });
});

describe('display helpers', () => {
  it('always signs a from-base offset', () => {
    expect(signed(2)).toBe('+2.0');
    expect(signed(-1.5)).toBe('-1.5');
    expect(signed(0)).toBe('+0.0');
  });

  it('describes a setup for the commit line', () => {
    expect(describeSetup({ upperTurns: 2, lowerTurns: 1, forestayMm: 15 })).toBe(
      'uppers +2.0 · lowers +1.0 · forestay 15 mm',
    );
  });
});
