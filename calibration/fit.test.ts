/**
 * Unit tests for the pure pieces of the calibration harness. The fit itself is
 * not run here: it takes ~a minute and it is not a unit of logic, it is a
 * search. What is tested is everything a broken fit would silently ride on —
 * the loss, the log-normalisation, and the two reference-data lookups.
 */
import { describe, expect, it } from 'vitest';
import {
  fromX,
  gridCells,
  guideBand,
  pointResidual,
  polarRow,
  rowPoint,
  softOptimum,
  structuralFloor,
  toX,
  vmgLoss,
  type FitPoint,
  type KnobSpec,
  type LossWeights,
  type TurnsResidual,
} from './fit';
import type { DockControls } from '../src/core/types';

const W: LossWeights = { twa: 0.05, heel: 0.02 };
const p = (bsKt: number, twaDeg: number, heelDeg: number): FitPoint => ({
  twsKt: 10,
  bsKt,
  twaDeg,
  heelDeg,
});

describe('loss', () => {
  it('is zero when the model matches the target exactly', () => {
    const t = p(5.5, 41, 12);
    expect(vmgLoss([t], [t], W)).toBe(0);
  });

  it('scores boat speed as a relative error', () => {
    // 10 % slow, everything else exact -> 0.1^2.
    const r = pointResidual(p(4.95, 41, 12), p(5.5, 41, 12), W);
    expect(r.dBsPct).toBeCloseTo(-10, 10);
    expect(r.loss).toBeCloseTo(0.01, 12);
  });

  it('scores angle and heel per 10 degrees, times their weights', () => {
    expect(pointResidual(p(5.5, 51, 12), p(5.5, 41, 12), W).loss).toBeCloseTo(W.twa, 12);
    expect(pointResidual(p(5.5, 41, 22), p(5.5, 41, 12), W).loss).toBeCloseTo(W.heel, 12);
  });

  it('is symmetric in the sign of every error', () => {
    const a = pointResidual(p(5.0, 44, 15), p(5.5, 41, 12), W).loss;
    const b = pointResidual(p(5.5, 41, 12), p(5.0, 44, 15), W).loss;
    // Not exactly equal: the speed term is relative to the target. The angle
    // and heel terms are, so the difference is the speed term alone.
    expect(a - (0.5 / 5.5) ** 2).toBeCloseTo(b - (0.5 / 5.0) ** 2, 12);
  });

  it('sums over points and rejects mismatched lengths', () => {
    const t = p(5.5, 41, 12);
    const m = p(4.95, 41, 12);
    expect(vmgLoss([m, m], [t, t], W)).toBeCloseTo(0.02, 12);
    expect(() => vmgLoss([m], [t, t], W)).toThrow();
  });

  it('weights of zero drop a term entirely', () => {
    const w0: LossWeights = { twa: 0, heel: 0 };
    expect(pointResidual(p(5.5, 99, 99), p(5.5, 41, 12), w0).loss).toBe(0);
  });
});

describe('log-normalisation', () => {
  const spec: KnobSpec = { name: 'test', start: 0.5, min: 0.05, max: 5 };

  it('puts the starting value at x = 0', () => {
    expect(toX(spec, spec.start)).toBe(0);
    expect(fromX(spec, 0)).toBe(spec.start);
  });

  it('round-trips any value inside the bounds', () => {
    for (const v of [0.06, 0.2, 0.5, 1.3, 4.9]) {
      expect(fromX(spec, toX(spec, v))).toBeCloseTo(v, 12);
      expect(toX(spec, fromX(spec, toX(spec, v)))).toBeCloseTo(toX(spec, v), 12);
    }
  });

  it('is monotone and multiplicative in x', () => {
    expect(fromX(spec, Math.log(2))).toBeCloseTo(1.0, 12);
    expect(fromX(spec, -Math.log(2))).toBeCloseTo(0.25, 12);
    expect(fromX(spec, 0.1)).toBeGreaterThan(fromX(spec, 0));
  });

  it('clamps into the bounds instead of running away', () => {
    expect(fromX(spec, 100)).toBe(spec.max);
    expect(fromX(spec, -100)).toBe(spec.min);
  });
});

describe('polar row lookup', () => {
  it('finds the printed upwind VMG row', () => {
    const r = polarRow('jib', 'vmgUp', 10);
    expect(r.bsKt).toBe(5.51);
    expect(r.twaDeg).toBe(41.2);
    expect(r.heelDeg).toBe(11.8);
  });

  it('separates the two sails at the same wind speed', () => {
    expect(polarRow('asym', 'vmgDn', 10).twaDeg).toBe(150.7);
    expect(polarRow('jib', 'vmgDn', 10).twaDeg).toBe(178.3);
  });

  it('throws rather than silently fitting nothing', () => {
    expect(() => polarRow('jib', 'vmgUp', 11)).toThrow(/no polar row/);
    expect(() => polarRow('asym', 'vmgUp', 10)).toThrow(/no polar row/);
  });

  it('rowPoint carries magnitudes, ready for the loss', () => {
    expect(rowPoint(polarRow('jib', 'vmgUp', 20))).toEqual({
      twsKt: 20,
      bsKt: 5.94,
      twaDeg: 38.3,
      heelDeg: 24.2,
    });
  });
});

// The harness resolves the guide by boat id; under test that is the default
// class, whose first committed guide in filename order is North's.
describe('guide band lookup', () => {
  it('returns the base band for the 8-10 kt range', () => {
    expect(guideBand(9)).toEqual({ label: '8-10 kt', uppersTurns: 0, lowersTurns: 0 });
  });

  it('returns the 12-16 band for 14 kt', () => {
    expect(guideBand(14)).toEqual({ label: '12-16 kt', uppersTurns: 4, lowersTurns: 2 });
  });

  it('resolves a boundary speed to exactly one band (half-open)', () => {
    expect(guideBand(10).label).toBe('10-12 kt');
    expect(guideBand(12).label).toBe('12-16 kt');
  });

  it('covers the open-ended top band', () => {
    expect(guideBand(30).label).toBe('20+ kt');
    expect(guideBand(30).lowersTurns).toBe(5);
  });

  it('throws below the printed range instead of guessing', () => {
    expect(() => guideBand(-1)).toThrow(/no guide band/);
  });
});

describe('softOptimum', () => {
  const grid: DockControls[] = [
    { upperTurns: 0, lowerTurns: 0, forestayMm: 0 },
    { upperTurns: 4, lowerTurns: 2, forestayMm: 0 },
  ];

  it('leans hard on a clear winner', () => {
    // Not exactly the winner: the temperature is a quarter of the spread, so
    // with two candidates the loser always keeps e^-4 of the weight. That is
    // the price of being scale-free, and it is a bias towards the middle of
    // the grid, never towards one end of it.
    const o = softOptimum([1, 100], grid);
    expect(o.uppersTurns).toBeLessThan(0.15);
    expect(o.lowersTurns).toBeLessThan(0.08);
    expect(softOptimum([100, 1], grid).uppersTurns).toBeGreaterThan(4 - 0.15);
  });

  it('splits the difference when the candidates tie', () => {
    const o = softOptimum([1, 1], grid);
    expect(o.uppersTurns).toBeCloseTo(2, 12);
    expect(o.lowersTurns).toBeCloseTo(1, 12);
  });

  it('is invariant to a constant offset in lap time', () => {
    const a = softOptimum([1, 1.01], grid);
    const b = softOptimum([11, 11.01], grid);
    expect(a.uppersTurns).toBeCloseTo(b.uppersTurns, 12);
  });
});

describe('structuralFloor', () => {
  it('is the spread of the guide bands a single setup cannot straddle', () => {
    const rows: TurnsResidual[] = [
      {
        twsKt: 9,
        band: 'a',
        uppersModel: 0,
        uppersGuide: 0,
        lowersModel: 0,
        lowersGuide: 0,
        loss: 0,
      },
      {
        twsKt: 14,
        band: 'b',
        uppersModel: 0,
        uppersGuide: 4,
        lowersModel: 0,
        lowersGuide: 2,
        loss: 0,
      },
    ];
    // Best constant is the mean: uppers 2 (2^2 + 2^2 = 8), lowers 1 (1 + 1 = 2).
    expect(structuralFloor(rows)).toBeCloseTo(10, 12);
  });

  it('is zero when every band agrees', () => {
    const row: TurnsResidual = {
      twsKt: 9,
      band: 'a',
      uppersModel: 0,
      uppersGuide: 3,
      lowersModel: 0,
      lowersGuide: 1,
      loss: 0,
    };
    expect(structuralFloor([row, { ...row, twsKt: 14 }])).toBeCloseTo(0, 12);
  });
});

describe('gridCells', () => {
  it('is the Cartesian product, in a fixed order', () => {
    expect(
      gridCells([
        [1, 2],
        [10, 20, 30],
      ]),
    ).toEqual([
      [1, 10],
      [1, 20],
      [1, 30],
      [2, 10],
      [2, 20],
      [2, 30],
    ]);
  });

  it('handles one knob and no knobs', () => {
    expect(gridCells([[1, 2, 3]])).toEqual([[1], [2], [3]]);
    expect(gridCells([])).toEqual([[]]);
  });
});
